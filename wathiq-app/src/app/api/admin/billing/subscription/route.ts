import { NextResponse } from "next/server";
import { requireSuperAdmin, ADMIN_FORBIDDEN } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { sendBillingEmail } from "@/lib/billing-mailer";
import { PLAN_AR, formatMoney } from "@/lib/billing";
import {
  activateOrRenewSubscription,
  setSubscriptionStatus,
  BILLING_CYCLES,
  PAYMENT_METHODS,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/billing/subscription — تفعيل/تجديد يدوي ذري (SUPER_ADMIN).
 * كل التحقق (خطة/دورة/تواريخ/مبلغ/طريقة دفع) يتم في الخادم داخل النواة.
 */
export async function POST(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string) : "");
  const startDate = new Date(str("startDate"));
  const endDate = new Date(str("endDate"));
  const price = Number(body.price);

  const result = await activateOrRenewSubscription({
    adminId: admin.id,
    userId: str("userId"),
    plan: str("plan") as "FREE" | "PRO" | "ENTERPRISE",
    billingCycle: str("billingCycle") as (typeof BILLING_CYCLES)[number],
    startDate,
    endDate,
    price,
    currency: str("currency") || "SAR",
    paymentMethod: str("paymentMethod") as (typeof PAYMENT_METHODS)[number],
    paidAt: str("paidAt") ? new Date(str("paidAt")) : undefined,
    referenceNumber: str("referenceNumber") || null,
    internalNote: str("internalNote") || null,
    createInvoice: body.createInvoice === true,
    markInvoicePaid: body.markInvoicePaid === true,
    resetUsage: body.resetUsage === true,
  });

  if (!result.ok) return NextResponse.json(result, { status: 400 });

  // بريد تأكيد التجديد/الفاتورة — آمن الفشل تمامًا ولا يؤخر الرد:
  // نجاح التجديد لا يعتمد على نجاح البريد إطلاقًا.
  try {
    const u = await prisma.user.findUnique({ where: { id: str("userId") }, select: { email: true } });
    if (u) {
      await sendBillingEmail(str("userId"), u.email, {
        kind: "renewed",
        plan: PLAN_AR[str("plan")] ?? str("plan"),
        endDate: endDate.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }),
      });
      if (result.invoiceNumber) {
        await sendBillingEmail(str("userId"), u.email, {
          kind: "invoice_issued",
          invoiceNumber: result.invoiceNumber,
          total: formatMoney(price),
          currency: str("currency") || "SAR",
        });
      }
    }
  } catch {
    // تجاهل — البريد ثانوي.
  }

  return NextResponse.json(result);
}

/** PATCH — إلغاء / تعليق / إعادة تفعيل حالة الاشتراك. */
export async function PATCH(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  let body: { userId?: unknown; status?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  const userId = typeof body.userId === "string" ? body.userId : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!userId || !["CANCELED", "SUSPENDED", "ACTIVE"].includes(status)) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  const result = await setSubscriptionStatus(
    admin.id,
    userId,
    status as "CANCELED" | "SUSPENDED" | "ACTIVE",
    typeof body.reason === "string" ? body.reason : null
  );
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { requireSuperAdmin, ADMIN_FORBIDDEN } from "@/lib/admin";
import { updateInvoiceStatus, INVOICE_STATUSES } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/billing/invoice — تغيير حالة فاتورة أو ملاحظتها الداخلية.
 * الفاتورة المدفوعة لا تُحذف ولا تتراجع — إلغاء أو استرداد فقط (بسجل تدقيق).
 */
export async function PATCH(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  let body: { id?: unknown; status?: unknown; internalNote?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!id || !(INVOICE_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  const result = await updateInvoiceStatus(
    admin.id,
    id,
    status as (typeof INVOICE_STATUSES)[number],
    typeof body.internalNote === "string" ? body.internalNote : undefined
  );
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, ADMIN_FORBIDDEN } from "@/lib/admin";
import { processSubscriptionLifecycle, estimateMRR, formatMoney, daysLeft } from "@/lib/billing";

export const dynamic = "force-dynamic";

const g = globalThis as { __wathiqLifecycleAt?: number; __wathiqLifecycleLast?: { expired: number; remindersCreated: number; overdueMarked: number } };
async function throttledLifecycle() {
  const now = Date.now();
  if (g.__wathiqLifecycleAt && now - g.__wathiqLifecycleAt < 60_000 && g.__wathiqLifecycleLast) {
    return g.__wathiqLifecycleLast;
  }
  const result = await processSubscriptionLifecycle().catch(() => ({ expired: 0, remindersCreated: 0, overdueMarked: 0 }));
  g.__wathiqLifecycleAt = now;
  g.__wathiqLifecycleLast = result;
  return result;
}

/**
 * GET /api/admin/billing — لوحة «الاشتراكات والفواتير»: تُشغّل معالجة دورة
 * الحياة أولًا (انتهاء/تذكيرات/متأخرات — آمنة التكرار) ثم ترجع البطاقات
 * المالية والجداول. SUPER_ADMIN فقط.
 */
export async function GET(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  // معالجة دورة الحياة عند فتح اللوحة — بديل Cron الآن وجاهزة له لاحقًا.
  // v2.4 (أداء): خنق 60 ثانية لكل instance — إعادة تحميل اللوحة المتكررة كانت
  // تعيد تشغيل كل استعلامات الدورة (idempotent لكنها ~6 استعلامات بلا داعٍ).
  const lifecycle = await throttledLifecycle();

  const url = new URL(req.url);
  const invStatus = url.searchParams.get("invStatus") ?? "";
  const invQ = (url.searchParams.get("invQ") ?? "").trim();
  const subStatus = url.searchParams.get("subStatus") ?? "";
  const subQ = (url.searchParams.get("subQ") ?? "").trim();

  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400_000);
  const in30 = new Date(now.getTime() + 30 * 86400_000);

  const [activeCount, expiring7, expiring30, expiredCount, paidCount, pendingCount, overdueCount, paymentsAgg, mrr] =
    await Promise.all([
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({ where: { status: "ACTIVE", endDate: { gte: now, lte: in7 } } }),
      prisma.subscription.count({ where: { status: "ACTIVE", endDate: { gte: now, lte: in30 } } }),
      // v2.1: مع نموذج التاريخ، «منتهي» = عملاء متميّزون لديهم سجل منتهٍ
      // وبلا اشتراك نشط/مجدول — لا عدّ الصفوف التاريخية المتراكمة.
      (async () => {
        const [expiredUsers, coveredUsers] = await Promise.all([
          prisma.subscription.findMany({ where: { status: "EXPIRED" }, select: { userId: true }, distinct: ["userId"] }),
          prisma.subscription.findMany({ where: { status: { in: ["ACTIVE", "SCHEDULED"] } }, select: { userId: true }, distinct: ["userId"] }),
        ]);
        const covered = new Set(coveredUsers.map((u) => u.userId));
        return expiredUsers.filter((u) => !covered.has(u.userId)).length;
      })(),
      prisma.invoice.count({ where: { status: "PAID" } }),
      prisma.invoice.count({ where: { status: "PENDING" } }),
      prisma.invoice.count({ where: { status: "OVERDUE" } }),
      prisma.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true }, _count: { _all: true } }),
      estimateMRR(),
    ]);

  // الاشتراكات (مع فلاتر بسيطة)
  const subWhere: Record<string, unknown> = {};
  if (subStatus === "EXPIRING_7") Object.assign(subWhere, { status: "ACTIVE", endDate: { gte: now, lte: in7 } });
  else if (subStatus === "EXPIRING_30") Object.assign(subWhere, { status: "ACTIVE", endDate: { gte: now, lte: in30 } });
  else if (subStatus) Object.assign(subWhere, { status: subStatus });

  const subs = await prisma.subscription.findMany({ where: subWhere, orderBy: { endDate: "asc" }, take: 100 });
  const invWhere: Record<string, unknown> = invStatus ? { status: invStatus } : {};
  if (invQ) Object.assign(invWhere, { invoiceNumber: { contains: invQ, mode: "insensitive" } });
  const invoices = await prisma.invoice.findMany({ where: invWhere, orderBy: { issueDate: "desc" }, take: 100 });
  const payments = await prisma.payment.findMany({ orderBy: { paidAt: "desc" }, take: 50 });

  // أسماء/بريد المستخدمين لكل الجداول دفعة واحدة
  const ids = [...new Set([...subs.map((s) => s.userId), ...invoices.map((i) => i.userId), ...payments.map((p) => p.userId)])];
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
    : [];
  const userOf = new Map(users.map((u) => [u.id, u]));
  let subRows = subs.map((s) => ({
    id: s.id,
    userId: s.userId,
    name: userOf.get(s.userId)?.name ?? "—",
    email: userOf.get(s.userId)?.email ?? "",
    plan: s.plan,
    status: s.status,
    billingCycle: s.billingCycle,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate.toISOString(),
    daysLeft: daysLeft(s.endDate, now),
    price: formatMoney(s.price),
    currency: s.currency,
    source: s.source,
  }));
  if (subQ) {
    const q = subQ.toLowerCase();
    subRows = subRows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.id.includes(subQ));
  }

  return NextResponse.json({
    ok: true,
    lifecycle,
    kpis: {
      activeCount,
      expiring7,
      expiring30,
      expiredCount,
      paidCount,
      pendingCount,
      overdueCount,
      paymentsTotal: formatMoney(paymentsAgg._sum.amount ?? 0),
      paymentsCount: paymentsAgg._count._all,
      mrr: formatMoney(mrr.mrr),
      mrrExcludedCustom: mrr.excludedCustom,
    },
    subscriptions: subRows,
    invoices: invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      userId: i.userId,
      name: userOf.get(i.userId)?.name ?? "—",
      email: userOf.get(i.userId)?.email ?? "",
      status: i.status,
      issueDate: i.issueDate.toISOString(),
      dueDate: i.dueDate?.toISOString() ?? null,
      total: formatMoney(i.total),
      currency: i.currency,
      periodStart: i.billingPeriodStart?.toISOString() ?? null,
      periodEnd: i.billingPeriodEnd?.toISOString() ?? null,
      internalNote: i.internalNote,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: userOf.get(p.userId)?.name ?? "—",
      email: userOf.get(p.userId)?.email ?? "",
      amount: formatMoney(p.amount),
      currency: p.currency,
      method: p.method,
      status: p.status,
      paidAt: p.paidAt.toISOString(),
      referenceNumber: p.referenceNumber,
      invoiceId: p.invoiceId,
    })),
  });
}

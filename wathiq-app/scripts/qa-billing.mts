/* QA v2.6.1 — تكامل الفوترة مع محاسبة النقاط: منح النقاط SET (لا تراكم) +
 * أسبقية التجاوز + تفعيل/تجديد لا يمنح مرتين + انتهاء يعيد لـ FREE — كله
 * idempotent ضد تكرار الحدث. يعمل على Postgres محلي. */
import { prisma } from "../src/lib/db";
import { grantMonthlyCredits } from "../src/lib/ai-credits";
import { activateOrRenewSubscription, syncSubscriptionStatuses } from "../src/lib/billing";
import { getResolvedPlan, invalidateSettingsCache } from "../src/lib/settings";

const out: { n: string; ok: boolean; d?: string }[] = [];
const check = (n: string, ok: boolean, d = "") => { out.push({ n, ok, d }); console.log(`${ok ? "✅" : "❌"} ${n}${d ? ` — ${d}` : ""}`); };

let seq = 0;
async function mkUser(plan: string, opts: { override?: number | null; used?: number; granted?: number } = {}) {
  return prisma.user.create({
    data: {
      email: `qa-bl-${Date.now()}-${seq++}@w.local`, name: "BL", plan, passwordHash: "x",
      aiCreditsGranted: opts.granted ?? 100, aiCreditsUsed: opts.used ?? 0, aiCreditsOverride: opts.override ?? null,
      aiCreditsPeriodEnd: new Date(Date.now() + 30 * 864e5), aiCreditsDayEnd: new Date(Date.now() + 864e5),
    },
    select: { id: true },
  });
}
const granted = async (id: string) => (await prisma.user.findUnique({ where: { id }, select: { aiCreditsGranted: true } }))?.aiCreditsGranted;
const readUser = (id: string) => prisma.user.findUnique({ where: { id }, select: { plan: true, aiCreditsGranted: true, aiCreditsUsed: true } });
const activateInput = (userId: string, plan: "FREE" | "PRO" | "ENTERPRISE") => ({
  adminId: "qa-admin", userId, plan, billingCycle: "MONTHLY" as const,
  startDate: new Date(), endDate: new Date(Date.now() + 30 * 864e5), price: plan === "PRO" ? 149 : 0,
  paymentMethod: "MANUAL" as const, createInvoice: false, markInvoicePaid: false, resetUsage: true,
});

async function main() {
  await prisma.systemSettings.deleteMany({});
  invalidateSettingsCache();
  const proGrant = (await getResolvedPlan("PRO")).monthlyCredits; // 400 افتراضي
  const freeGrant = (await getResolvedPlan("FREE")).monthlyCredits; // 30 افتراضي
  const created: string[] = [];

  /* 1) grantMonthlyCredits منح مطلق (SET): لا يتراكم مهما تكرّر */
  const u1 = await mkUser("PRO", { used: 50, granted: 100 }); created.push(u1.id);
  await grantMonthlyCredits(u1.id, 400, { resetUsage: true });
  const g1a = await granted(u1.id);
  await grantMonthlyCredits(u1.id, 400, { resetUsage: true }); // تكرار
  const u1v = await readUser(u1.id);
  check("منح SET: المنحة=400 بعد أول منح", g1a === 400, `${g1a}`);
  check("منح SET: التكرار لا يراكم (يبقى 400 لا 800)", u1v?.aiCreditsGranted === 400, `${u1v?.aiCreditsGranted}`);
  check("منح SET: resetUsage يصفّر الاستهلاك", u1v?.aiCreditsUsed === 0, `${u1v?.aiCreditsUsed}`);

  /* 2) تفعيل فوري يمنح منحة الخطة؛ تكراره (تجديد) لا يمنح مرتين */
  const u2 = await mkUser("FREE", { used: 10, granted: 30 }); created.push(u2.id);
  const a1 = await activateOrRenewSubscription(activateInput(u2.id, "PRO"));
  const g2a = await granted(u2.id);
  const a2 = await activateOrRenewSubscription(activateInput(u2.id, "PRO")); // تجديد/إعادة إرسال
  const u2v = await readUser(u2.id);
  check("تفعيل: نجح وحوّل الخطة إلى PRO", a1.ok && u2v?.plan === "PRO");
  check("تفعيل: منح منحة PRO", g2a === proGrant, `${g2a}/${proGrant}`);
  check("تجديد مكرّر: لا منح مزدوج (يبقى منحة PRO لا ضِعفها)", a2.ok && u2v?.aiCreditsGranted === proGrant, `${u2v?.aiCreditsGranted}`);

  /* 3) أسبقية التجاوز: تفعيل مع aiCreditsOverride يمنح قيمة التجاوز لا منحة الخطة */
  const u3 = await mkUser("FREE", { override: 1000 }); created.push(u3.id);
  const a3 = await activateOrRenewSubscription(activateInput(u3.id, "PRO"));
  const u3v = await readUser(u3.id);
  check("تجاوز: التفعيل يمنح قيمة التجاوز (1000) لا منحة PRO", a3.ok && u3v?.aiCreditsGranted === 1000, `${u3v?.aiCreditsGranted}`);

  /* 4) انتهاء الاشتراك يعيد الخطة FREE ويمنح منحة FREE — idempotent */
  const u4 = await mkUser("PRO", { granted: proGrant }); created.push(u4.id);
  await prisma.subscription.create({
    data: {
      userId: u4.id, plan: "PRO", status: "ACTIVE", billingCycle: "MONTHLY",
      startDate: new Date(Date.now() - 40 * 864e5), endDate: new Date(Date.now() - 864e5), // منتهٍ
      price: "149", currency: "SAR", source: "MANUAL",
    },
  });
  await syncSubscriptionStatuses(u4.id);
  const u4a = await readUser(u4.id);
  await syncSubscriptionStatuses(u4.id); // تكرار
  const u4b = await readUser(u4.id);
  check("انتهاء: الخطة عادت FREE", u4a?.plan === "FREE", u4a?.plan);
  check("انتهاء: منحة FREE مُنِحت", u4a?.aiCreditsGranted === freeGrant, `${u4a?.aiCreditsGranted}/${freeGrant}`);
  check("انتهاء: المزامنة idempotent (تكرار لا يغيّر)", u4b?.plan === "FREE" && u4b?.aiCreditsGranted === freeGrant);

  /* تنظيف */
  await prisma.billingAuditLog.deleteMany({ where: { userId: { in: created } } });
  await prisma.payment.deleteMany({ where: { userId: { in: created } } });
  await prisma.subscription.deleteMany({ where: { userId: { in: created } } });
  await prisma.user.deleteMany({ where: { id: { in: created } } });
  await prisma.systemSettings.deleteMany({});
  invalidateSettingsCache();

  const passed = out.filter((o) => o.ok).length;
  console.log(`\n${passed}/${out.length} نجحت.`);
  if (passed !== out.length) process.exit(1);
}

main().finally(() => prisma.$disconnect());

/* QA v2.6.1 — تطبيع الإعدادات (الخطط + الذكاء): السقوف الصلبة، القيم السالبة،
 * النقاط المفرطة، مفاتيح المهام غير الصالحة، المزوّدون/المصفوفات المشوّهة،
 * حدود منظّف الحجوزات، والسقوط إلى الافتراضيات. يعمل على Postgres محلي. */
import { prisma } from "../src/lib/db";
import {
  updateSystemSettings, invalidateSettingsCache,
  getResolvedPlan, getResolvedAiSettings, getPlanSettings, HARD_CEILINGS,
} from "../src/lib/settings";

const out: { n: string; ok: boolean; d?: string }[] = [];
const check = (n: string, ok: boolean, d = "") => { out.push({ n, ok, d }); console.log(`${ok ? "✅" : "❌"} ${n}${d ? ` — ${d}` : ""}`); };
const A = "qa-admin";

async function main() {
  await prisma.systemSettings.deleteMany({});
  await prisma.settingsAuditLog.deleteMany({});
  invalidateSettingsCache();

  /* 1) السقوط إلى الافتراضيات (بلا سجل) */
  const proD = await getResolvedPlan("PRO");
  const aiD = await getResolvedAiSettings();
  check("افتراضي: PRO monthlyCredits=400", proD.monthlyCredits === 400, `${proD.monthlyCredits}`);
  check("افتراضي: مهلة الذكاء=120000", aiD.timeoutMs === 120_000, `${aiD.timeoutMs}`);
  check("افتراضي: مهلة المنظّف=30 دقيقة", aiD.reservationTimeoutMinutes === 30, `${aiD.reservationTimeoutMinutes}`);
  check("افتراضي: دفعة المنظّف=100", aiD.reservationCleanupBatchSize === 100, `${aiD.reservationCleanupBatchSize}`);

  /* 2) الخطط: نقاط سالبة → 0، نقاط مفرطة → السقف */
  const r1 = await updateSystemSettings({ section: "plans", values: { FREE: { monthlyCredits: -50 }, PRO: { monthlyCredits: 9_999_999 } }, adminId: A });
  check("حفظ الخطط ينجح", r1.ok);
  const free1 = await getResolvedPlan("FREE");
  const pro1 = await getResolvedPlan("PRO");
  check("نقاط سالبة تُقص إلى 0", free1.monthlyCredits === 0, `${free1.monthlyCredits}`);
  check(`نقاط مفرطة تُقص إلى السقف ${HARD_CEILINGS.monthlyCreditsMax}`, pro1.monthlyCredits === HARD_CEILINGS.monthlyCreditsMax, `${pro1.monthlyCredits}`);

  /* 3) الخطط: مفاتيح مهام غير صالحة تُصفّى، والمصفوفة المشوّهة → الافتراضي */
  const r2 = await updateSystemSettings({ section: "plans", values: { PRO: { allowedTasks: ["full", "bogus", "improve", 123], allowedLevels: "not-an-array" } }, adminId: A });
  const plansRaw = await getPlanSettings();
  const tasks = plansRaw.PRO.allowedTasks;
  check("مفاتيح مهام غير صالحة تُصفّى (bogus/123 محذوفان)", tasks.includes("full") && tasks.includes("improve") && !tasks.includes("bogus" as never) && tasks.length === 2, tasks.join(","));
  check("allowedLevels مصفوفة مشوّهة → الافتراضي (غير فارغ)", Array.isArray(plansRaw.PRO.allowedLevels) && plansRaw.PRO.allowedLevels.length > 0, String(plansRaw.PRO.allowedLevels));

  /* 4) الذكاء: تكلفة مهمة سالبة → 0، ومفرطة → السقف */
  const r3 = await updateSystemSettings({ section: "ai", values: { tasks: { improve: { credits: -9, enabled: true }, full: { credits: 999999, enabled: true } } }, adminId: A });
  check("حفظ الذكاء ينجح", r3.ok);
  const ai3 = await getResolvedAiSettings();
  check("تكلفة سالبة تُقص إلى 0", ai3.tasks.improve.credits === 0, `${ai3.tasks.improve.credits}`);
  check(`تكلفة مفرطة تُقص إلى ${HARD_CEILINGS.taskCreditMax}`, ai3.tasks.full.credits === HARD_CEILINGS.taskCreditMax, `${ai3.tasks.full.credits}`);

  /* 5) منظّف الحجوزات: مهلة دون الأرضية (10) تُرفع، وفوق السقف تُقص */
  const r4 = await updateSystemSettings({ section: "ai", values: { reservationTimeoutMinutes: 2, reservationCleanupBatchSize: 0 }, adminId: A });
  const ai4 = await getResolvedAiSettings();
  check("مهلة المنظّف دون الأرضية (2) تُرفع إلى 10", ai4.reservationTimeoutMinutes === 10, `${ai4.reservationTimeoutMinutes}`);
  check("دفعة المنظّف 0 تُرفع إلى 1", ai4.reservationCleanupBatchSize === 1, `${ai4.reservationCleanupBatchSize}`);
  const r5 = await updateSystemSettings({ section: "ai", values: { reservationTimeoutMinutes: 999999, reservationCleanupBatchSize: 999999 }, adminId: A });
  const ai5 = await getResolvedAiSettings();
  check(`مهلة مفرطة تُقص إلى ${HARD_CEILINGS.reservationTimeoutMinutesMax}`, ai5.reservationTimeoutMinutes === HARD_CEILINGS.reservationTimeoutMinutesMax, `${ai5.reservationTimeoutMinutes}`);
  check(`دفعة مفرطة تُقص إلى ${HARD_CEILINGS.reservationCleanupBatchSizeMax}`, ai5.reservationCleanupBatchSize === HARD_CEILINGS.reservationCleanupBatchSizeMax, `${ai5.reservationCleanupBatchSize}`);

  /* 6) الذكاء: مصفوفة مزوّدين مشوّهة → الافتراضي (لا تُمسح) */
  const r6 = await updateSystemSettings({ section: "ai", values: { providers: "not-an-array" }, adminId: A });
  const ai6 = await getResolvedAiSettings();
  check("مزوّدون بمصفوفة مشوّهة → الافتراضي (غير فارغ)", Array.isArray(ai6.providers) && ai6.providers.length > 0, String(ai6.providers));

  /* 7) إخفاء كل الخطط مرفوض (لا يترك المنصة بلا خطط) */
  const bad = await updateSystemSettings({ section: "plans", values: { FREE: { visible: false }, PRO: { visible: false }, ENTERPRISE: { visible: false } }, adminId: A });
  check("إخفاء كل الخطط مرفوض", !bad.ok, bad.ok ? "قُبل!" : (bad as { error: string }).error);

  /* تنظيف */
  await prisma.systemSettings.deleteMany({});
  await prisma.settingsAuditLog.deleteMany({});
  invalidateSettingsCache();

  const passed = out.filter((o) => o.ok).length;
  console.log(`\n${passed}/${out.length} نجحت.`);
  if (passed !== out.length) process.exit(1);
}

main().finally(() => prisma.$disconnect());

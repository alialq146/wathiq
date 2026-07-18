/* QA v2.6.1 — منظّف الحجوزات اليتيمة + إعادة ضبط النوافذ (تحسين ensureWindows)
 * + انتقالات الحالة. يعمل على Postgres محلي. */
import { prisma } from "../src/lib/db";
import { reserveCredits, commitCredits, refundCredits, getCreditWallet } from "../src/lib/ai-credits";
import { reapOrphanedReservations, ORPHAN_REASON } from "../src/lib/ai-reaper";
import { invalidateSettingsCache } from "../src/lib/settings";

const out: { n: string; ok: boolean; d?: string }[] = [];
const check = (n: string, ok: boolean, d = "") => { out.push({ n, ok, d }); console.log(`${ok ? "✅" : "❌"} ${n}${d ? ` — ${d}` : ""}`); };

let seq = 0;
const key = (s: string) => `${s}-${Date.now()}-${seq++}-${Math.round(performance.now() * 1000)}`;

async function mkUser(opts: { grant?: number; used?: number; dayUsed?: number; periodEnd?: Date; dayEnd?: Date } = {}) {
  return prisma.user.create({
    data: {
      email: `qa-rp-${Date.now()}-${seq++}@w.local`,
      name: "RP", plan: "PRO", passwordHash: "x",
      aiCreditsGranted: opts.grant ?? 100,
      aiCreditsUsed: opts.used ?? 0,
      aiCreditsDayUsed: opts.dayUsed ?? 0,
      aiCreditsPeriodEnd: opts.periodEnd ?? new Date(Date.now() + 30 * 864e5),
      aiCreditsDayEnd: opts.dayEnd ?? new Date(Date.now() + 864e5),
    },
    select: { id: true },
  });
}
const reserve = (userId: string, credits: number, k: string, grant = 100, daily: number | null = null) =>
  reserveCredits({ userId, plan: "PRO", idempotencyKey: k, credits, monthlyGrant: grant, dailyLimit: daily, taskKey: "improve", level: "standard", persona: "default", provider: "anthropic", model: "m" });
// نُقدّم عمر العملية بجعل startedAt في الماضي (يتيمة).
const ageOperation = (id: string, minutesAgo: number) =>
  prisma.aiOperation.update({ where: { id }, data: { startedAt: new Date(Date.now() - minutesAgo * 60_000) } });

async function main() {
  // إعدادات افتراضية حتمية: بلا سجل ⇒ مهلة 30 دقيقة، دفعة 100.
  await prisma.systemSettings.deleteMany({});
  invalidateSettingsCache();

  const created: string[] = [];

  /* ===== منظّف الحجوزات اليتيمة ===== */

  /* 1) حجز يتيم (قديم) يُسترجَع؛ الرصيد يعود؛ الحالة REFUNDED بالسبب الصحيح */
  const u1 = await mkUser({ grant: 100 }); created.push(u1.id);
  const r1 = await reserve(u1.id, 8, key("orph"));
  if (!r1.ok) throw new Error("reserve failed");
  await ageOperation(r1.operationId, 60); // أقدم من مهلة 30 دقيقة
  const w1before = await getCreditWallet(u1.id, 100, null);
  const rep1 = await reapOrphanedReservations();
  const w1after = await getCreditWallet(u1.id, 100, null);
  const op1 = await prisma.aiOperation.findUnique({ where: { id: r1.operationId } });
  check("اليتيم: المنظّف استرجع عمليةً واحدة", rep1.refunded === 1, `refunded=${rep1.refunded}`);
  check("اليتيم: الرصيد أُعيد (used 8→0)", w1before?.used === 8 && w1after?.used === 0, `before=${w1before?.used} after=${w1after?.used}`);
  check("اليتيم: الحالة REFUNDED", op1?.status === "REFUNDED", op1?.status);
  check("اليتيم: creditsRefunded=8 والسبب orphaned", op1?.creditsRefunded === 8 && op1?.errorMessage === ORPHAN_REASON, `${op1?.creditsRefunded}/${op1?.errorMessage}`);
  const led1 = await prisma.aiLedgerEntry.findFirst({ where: { operationId: r1.operationId, entryType: "REFUND" } });
  check("اليتيم: قيد REFUND إلحاقي بالسبب", led1?.reason === ORPHAN_REASON, led1?.reason ?? "—");

  /* 2) idempotency للمنظّف: تشغيل ثانٍ لا يسترجع شيئًا */
  const rep2 = await reapOrphanedReservations();
  check("idempotent: تشغيل ثانٍ لا يسترجع (refunded=0)", rep2.refunded === 0, `refunded=${rep2.refunded}`);

  /* 3) المنظّف لا يلمس حجزًا حديثًا (أصغر من المهلة) */
  const u3 = await mkUser({ grant: 100 }); created.push(u3.id);
  const r3 = await reserve(u3.id, 5, key("fresh"));
  if (!r3.ok) throw new Error("reserve failed");
  const rep3 = await reapOrphanedReservations();
  const op3 = await prisma.aiOperation.findUnique({ where: { id: r3.operationId } });
  check("الحديث لا يُسترجَع (يبقى RESERVED)", op3?.status === "RESERVED" && rep3.refunded === 0, `${op3?.status}`);

  /* 4) المنظّف لا يلمس عمليةً نهائية (COMMITTED) حتى لو قديمة */
  const u4 = await mkUser({ grant: 100 }); created.push(u4.id);
  const r4 = await reserve(u4.id, 6, key("done"));
  if (!r4.ok) throw new Error("reserve failed");
  await commitCredits({ operationId: r4.operationId, promptTokens: 1, completionTokens: 1, estimatedCostUsd: 0, model: "m", provider: "anthropic", executionMs: 1 });
  await ageOperation(r4.operationId, 120); // قديمة لكنها COMMITTED
  const rep4 = await reapOrphanedReservations();
  const op4 = await prisma.aiOperation.findUnique({ where: { id: r4.operationId } });
  check("النهائي (COMMITTED) لا يُمس", op4?.status === "COMMITTED" && op4?.creditsRefunded === 0 && rep4.refunded === 0);

  /* 5) منظّفان متزامنان على نفس الحجوزات اليتيمة: استرجاع كل واحد مرة واحدة فقط */
  const u5 = await mkUser({ grant: 100 }); created.push(u5.id);
  const rs: string[] = [];
  for (let i = 0; i < 6; i++) {
    const r = await reserve(u5.id, 5, key(`co-${i}`), 100);
    if (r.ok) { await ageOperation(r.operationId, 90); rs.push(r.operationId); }
  }
  const usedBefore = (await getCreditWallet(u5.id, 100, null))?.used ?? -1; // 30 (6×5)
  const [ra, rb] = await Promise.all([reapOrphanedReservations(), reapOrphanedReservations()]);
  const usedAfter = (await getCreditWallet(u5.id, 100, null))?.used ?? -1; // 0
  const totalRefunded = ra.refunded + rb.refunded;
  const refundLedgers = await prisma.aiLedgerEntry.count({ where: { operationId: { in: rs }, entryType: "REFUND" } });
  check("تزامن المنظّفَين: استُرجعت الستة مرةً واحدة إجمالًا", totalRefunded === 6, `total=${totalRefunded}`);
  check("تزامن المنظّفَين: لا استرجاع مزدوج (6 قيود REFUND)", refundLedgers === 6, `ledgers=${refundLedgers}`);
  check("تزامن المنظّفَين: الرصيد عاد بالضبط (30→0)", usedBefore === 30 && usedAfter === 0, `before=${usedBefore} after=${usedAfter}`);

  /* ===== انتقالات الحالة (idempotent) ===== */

  /* 6) RESERVED→COMMITTED؛ commit ثانٍ لا يكرّر */
  const u6 = await mkUser({ grant: 100 }); created.push(u6.id);
  const r6 = await reserve(u6.id, 7, key("st1"));
  if (!r6.ok) throw new Error("reserve failed");
  await commitCredits({ operationId: r6.operationId, promptTokens: 1, completionTokens: 1, estimatedCostUsd: 0, model: "m", provider: "anthropic", executionMs: 1 });
  await commitCredits({ operationId: r6.operationId, promptTokens: 9, completionTokens: 9, estimatedCostUsd: 9, model: "m", provider: "anthropic", executionMs: 1 }); // no-op
  const op6 = await prisma.aiOperation.findUnique({ where: { id: r6.operationId } });
  const commitLedgers6 = await prisma.aiLedgerEntry.count({ where: { operationId: r6.operationId, entryType: "COMMIT" } });
  check("انتقال: COMMITTED نهائي، commit ثانٍ no-op (قيد COMMIT واحد)", op6?.status === "COMMITTED" && commitLedgers6 === 1, `${op6?.status}/${commitLedgers6}`);

  /* 7) refund على عملية مثبَّتة = no-op (يعيد false، الرصيد لا يتغيّر) */
  const usedU6 = (await getCreditWallet(u6.id, 100, null))?.used;
  const acted7 = await refundCredits(r6.operationId, "late-refund");
  const usedU6after = (await getCreditWallet(u6.id, 100, null))?.used;
  check("انتقال: refund لمثبَّتة no-op (false، الرصيد ثابت)", acted7 === false && usedU6 === usedU6after && usedU6 === 7, `acted=${acted7} used=${usedU6}/${usedU6after}`);

  /* 8) RESERVED→FAILED؛ refund ثانٍ no-op */
  const u8 = await mkUser({ grant: 100 }); created.push(u8.id);
  const r8 = await reserve(u8.id, 5, key("st2"));
  if (!r8.ok) throw new Error("reserve failed");
  const acted8a = await refundCredits(r8.operationId, "boom", { failed: true });
  const acted8b = await refundCredits(r8.operationId, "boom2", { failed: true }); // no-op
  const op8 = await prisma.aiOperation.findUnique({ where: { id: r8.operationId } });
  check("انتقال: RESERVED→FAILED (أول refund true، الثاني false)", acted8a === true && acted8b === false && op8?.status === "FAILED");

  /* ===== إعادة ضبط النوافذ (تحسين ensureWindows) ===== */

  /* 9) لا إعادة ضبط قبل الانقضاء: نافذة مستقبلية تُبقي granted/used كما هما */
  const u9 = await mkUser({ grant: 100, used: 20, periodEnd: new Date(Date.now() + 10 * 864e5) }); created.push(u9.id);
  const w9 = await getCreditWallet(u9.id, 999, null); // منحة مختلفة تمامًا
  check("لا إعادة ضبط قبل الانقضاء: granted=100 (لا 999) used=20", w9?.granted === 100 && w9?.used === 20, `granted=${w9?.granted} used=${w9?.used}`);

  /* 10) إعادة ضبط شهرية عند الانقضاء: granted=المنحة الجديدة، used=0 */
  const u10 = await mkUser({ grant: 100, used: 50, periodEnd: new Date(Date.now() - 864e5) }); created.push(u10.id);
  const w10 = await getCreditWallet(u10.id, 300, null);
  check("إعادة ضبط شهرية: granted=300 used=0", w10?.granted === 300 && w10?.used === 0, `granted=${w10?.granted} used=${w10?.used}`);

  /* 11) إعادة ضبط يومية فقط: dayUsed=0 والشهري لا يُمس */
  const u11 = await mkUser({ grant: 100, used: 40, dayUsed: 8, periodEnd: new Date(Date.now() + 10 * 864e5), dayEnd: new Date(Date.now() - 3600e3) }); created.push(u11.id);
  const w11 = await getCreditWallet(u11.id, 100, 20);
  check("إعادة ضبط يومية: dayUsed=0 والشهري ثابت (used=40)", w11?.dayUsed === 0 && w11?.used === 40, `dayUsed=${w11?.dayUsed} used=${w11?.used}`);

  /* 12) تزامن عند حدّ الانقضاء: بعد إعادة الضبط لا يتجاوز الاستهلاك المنحة */
  const u12 = await mkUser({ grant: 5, used: 5, periodEnd: new Date(Date.now() - 864e5) }); created.push(u12.id); // منتهية
  const conc = await Promise.all(Array.from({ length: 20 }, (_, i) => reserve(u12.id, 3, key(`bnd-${i}`), 30)));
  const okCount = conc.filter((r) => r.ok && !("reused" in r && r.reused)).length;
  const w12 = await getCreditWallet(u12.id, 30, null);
  check("تزامن عند الحدّ: بالضبط 10 نجحت بعد إعادة الضبط (30/3)", okCount === 10, `ok=${okCount}`);
  check("تزامن عند الحدّ: الاستهلاك ≤ المنحة (30)", (w12?.used ?? 0) <= 30 && w12?.granted === 30, `used=${w12?.used} granted=${w12?.granted}`);

  /* تنظيف */
  await prisma.aiLedgerEntry.deleteMany({ where: { userId: { in: created } } });
  await prisma.aiOperation.deleteMany({ where: { userId: { in: created } } });
  await prisma.user.deleteMany({ where: { id: { in: created } } });
  await prisma.systemSettings.deleteMany({});
  invalidateSettingsCache();

  const passed = out.filter((o) => o.ok).length;
  console.log(`\n${passed}/${out.length} نجحت.`);
  if (passed !== out.length) process.exit(1);
}

main().finally(() => prisma.$disconnect());

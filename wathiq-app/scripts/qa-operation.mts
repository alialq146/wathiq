/* QA v2.6.1 — منسّق العملية runAiOperation عبر «مزوّد وهمي حتمي» (execute
 * callback): مسار النجاح الكامل (امتياز→حجز→تنفيذ→تثبيت) + الفشل→استرجاع +
 * النقر المزدوج + رفض الامتياز + الرصيد غير الكافي + الحساب المعطَّل + غير المحاسَب.
 * لا مزوّد حقيقي ولا مفتاح — التنفيذ محقون. يعمل على Postgres محلي. */
import { prisma } from "../src/lib/db";
import { runAiOperation } from "../src/lib/ai-operation";
import { getCreditWallet } from "../src/lib/ai-credits";
import { invalidateSettingsCache } from "../src/lib/settings";

const out: { n: string; ok: boolean; d?: string }[] = [];
const check = (n: string, ok: boolean, d = "") => { out.push({ n, ok, d }); console.log(`${ok ? "✅" : "❌"} ${n}${d ? ` — ${d}` : ""}`); };

let seq = 0;
const key = (s: string) => `${s}-${Date.now()}-${seq++}`;
async function mkUser(plan: string, grant: number, status = "ACTIVE") {
  return prisma.user.create({
    data: {
      email: `qa-op-${plan}-${Date.now()}-${seq++}@w.local`, name: "OP", plan, passwordHash: "x", accountStatus: status,
      aiCreditsGranted: grant, aiCreditsUsed: 0,
      aiCreditsPeriodEnd: new Date(Date.now() + 30 * 864e5), aiCreditsDayEnd: new Date(Date.now() + 864e5),
    },
    select: { id: true },
  });
}
// مزوّد وهمي حتمي ناجح.
const mockExecute = async () => ({ result: { text: "تحليل وهمي" }, promptTokens: 120, completionTokens: 60 });
const mockThrow = async () => { throw new Error("provider exploded"); };

async function main() {
  await prisma.systemSettings.deleteMany({});
  invalidateSettingsCache();
  const created: string[] = [];

  /* 1) مسار النجاح الكامل (مزوّد وهمي): تثبيت + خصم + رموز + تكلفة */
  const u1 = await mkUser("PRO", 100); created.push(u1.id);
  const balBefore = (await getCreditWallet(u1.id, 100, null))?.balance;
  const res1 = await runAiOperation({
    uid: u1.id, metered: true, taskKey: "improve", level: "standard", persona: "default",
    idempotencyKey: key("ok"), execute: mockExecute,
  });
  const balAfter = (await getCreditWallet(u1.id, 100, null))?.balance;
  const op1 = res1.ok ? await prisma.aiOperation.findUnique({ where: { id: res1.operationId! } }) : null;
  check("نجاح: النتيجة رجعت + الحالة ok", res1.ok, res1.ok ? "" : (res1 as { error: string }).error);
  check("نجاح: الرصيد قبل=100", balBefore === 100, `${balBefore}`);
  check("نجاح: خُصمت التكلفة بالضبط", res1.ok && balAfter === 100 - res1.credits, `after=${balAfter} credits=${res1.ok ? res1.credits : "?"}`);
  check("نجاح: العملية COMMITTED + رموز مسجّلة", op1?.status === "COMMITTED" && op1?.promptTokens === 120 && op1?.completionTokens === 60);
  check("نجاح: تكلفة تقديرية محسوبة (>0)", (op1?.estimatedCostUsd ?? 0) > 0, `${op1?.estimatedCostUsd}`);
  const led1 = await prisma.aiLedgerEntry.count({ where: { userId: u1.id } });
  check("نجاح: قيدان في السجل (RESERVE+COMMIT)", led1 === 2, `entries=${led1}`);

  /* 2) الفشل يعيد النقاط (execute يرمي) */
  const u2 = await mkUser("PRO", 100); created.push(u2.id);
  const res2 = await runAiOperation({
    uid: u2.id, metered: true, taskKey: "full", level: "standard", persona: "default",
    idempotencyKey: key("fail"), execute: mockThrow,
  });
  const bal2 = (await getCreditWallet(u2.id, 100, null))?.balance;
  const op2 = await prisma.aiOperation.findFirst({ where: { userId: u2.id }, orderBy: { createdAt: "desc" } });
  check("فشل: النتيجة error=failed", !res2.ok && (res2 as { error: string }).error === "failed");
  check("فشل: الرصيد أُعيد كاملًا (100)", bal2 === 100, `bal=${bal2}`);
  check("فشل: العملية FAILED", op2?.status === "FAILED", op2?.status);

  /* 3) النقر المزدوج: نفس المفتاح مرتين = تنفيذ/خصم واحد */
  const u3 = await mkUser("PRO", 100); created.push(u3.id);
  const idem = key("dup");
  let execCount = 0;
  const counting = async () => { execCount++; return { result: { t: 1 }, promptTokens: 10, completionTokens: 5 }; };
  const d1 = await runAiOperation({ uid: u3.id, metered: true, taskKey: "improve", level: "standard", persona: "default", idempotencyKey: idem, execute: counting });
  const d2 = await runAiOperation({ uid: u3.id, metered: true, taskKey: "improve", level: "standard", persona: "default", idempotencyKey: idem, execute: counting });
  const bal3 = (await getCreditWallet(u3.id, 100, null))?.balance;
  check("نقر مزدوج: الأول ينجح والثاني duplicate", d1.ok && !d2.ok && (d2 as { error: string }).error === "duplicate");
  check("نقر مزدوج: execute نُفّذ مرة واحدة فقط", execCount === 1, `exec=${execCount}`);
  check("نقر مزدوج: خصم واحد فقط", d1.ok && bal3 === 100 - d1.credits, `bal=${bal3}`);

  /* 4) رفض الامتياز: FREE من التحليل الشامل — لا خصم ولا تنفيذ */
  const u4 = await mkUser("FREE", 30); created.push(u4.id);
  let exec4 = false;
  const res4 = await runAiOperation({ uid: u4.id, metered: true, taskKey: "full", level: "standard", persona: "default", idempotencyKey: key("ent"), execute: async () => { exec4 = true; return { result: {}, promptTokens: 0, completionTokens: 0 }; } });
  const bal4 = (await getCreditWallet(u4.id, 30, null))?.balance;
  check("رفض امتياز: FREE يُمنع من الشامل", !res4.ok && ["task-disabled", "full-analysis-disabled"].includes((res4 as { error: string }).error), (res4 as { error: string }).error);
  check("رفض امتياز: لا تنفيذ ولا خصم", exec4 === false && bal4 === 30, `exec=${exec4} bal=${bal4}`);

  /* 5) رصيد غير كافٍ: يُرفض ويُسجَّل REJECTED */
  const u5 = await mkUser("PRO", 3); created.push(u5.id);
  const res5 = await runAiOperation({ uid: u5.id, metered: true, taskKey: "full", level: "standard", persona: "default", idempotencyKey: key("insuf"), execute: mockExecute });
  const rej5 = await prisma.aiOperation.count({ where: { userId: u5.id, status: "REJECTED" } });
  check("رصيد غير كافٍ: error=insufficient-credits", !res5.ok && (res5 as { error: string }).error === "insufficient-credits");
  check("رصيد غير كافٍ: محاولة مسجّلة REJECTED", rej5 === 1, `rejected=${rej5}`);

  /* 6) حساب معطَّل: unauthorized */
  const u6 = await mkUser("PRO", 100, "DISABLED"); created.push(u6.id);
  const res6 = await runAiOperation({ uid: u6.id, metered: true, taskKey: "improve", level: "standard", persona: "default", idempotencyKey: key("dis"), execute: mockExecute });
  check("حساب معطَّل: error=unauthorized", !res6.ok && (res6 as { error: string }).error === "unauthorized");

  /* 7) غير محاسَب (metered=false): ينفّذ بلا خصم ولا عملية */
  const u7 = await mkUser("FREE", 0); created.push(u7.id);
  const res7 = await runAiOperation({ uid: u7.id, metered: false, taskKey: "full", level: "expert", persona: "default", idempotencyKey: key("free"), execute: mockExecute });
  const ops7 = await prisma.aiOperation.count({ where: { userId: u7.id } });
  check("غير محاسَب: ينجح، credits=0، بلا عملية مسجّلة", res7.ok && res7.credits === 0 && ops7 === 0, `ops=${ops7}`);

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

/* QA v2.6 — محاسبة نقاط الذكاء الاصطناعي: الامتيازات + الحجز الذرّي + Idempotency
 * + دورة التثبيت/الاسترجاع + الحد اليومي + التزامن. يعمل على Postgres محلي. */
import { prisma } from "../src/lib/db";
import { resolveEntitlements, checkAiRequest, creditCostFor } from "../src/lib/entitlements";
import { reserveCredits, commitCredits, refundCredits, getCreditWallet, recordRejectedOperation } from "../src/lib/ai-credits";

const out: { n: string; ok: boolean; d?: string }[] = [];
const check = (n: string, ok: boolean, d = "") => { out.push({ n, ok, d }); console.log(`${ok ? "✅" : "❌"} ${n}${d ? ` — ${d}` : ""}`); };

async function mkUser(plan: string, opts: { grant?: number; daily?: number | null; override?: number | null } = {}) {
  return prisma.user.create({
    data: {
      email: `qa-cr-${plan}-${Date.now()}-${Math.round(performance.now())}@w.local`,
      name: "CR", plan, passwordHash: "x",
      aiCreditsGranted: opts.grant ?? 100, aiCreditsUsed: 0,
      aiCreditsPeriodEnd: new Date(Date.now() + 30 * 864e5),
      aiCreditsDayEnd: new Date(Date.now() + 864e5),
      aiCreditsOverride: opts.override ?? null,
    },
    select: { id: true, plan: true, aiCreditsOverride: true },
  });
}
const wallet = (id: string, grant = 100, daily: number | null = null) => getCreditWallet(id, grant, daily);
const key = (s: string) => `${s}-${Date.now()}-${Math.round(performance.now() * 1000)}`;

async function main() {
  /* 1) الامتيازات: FREE يمنع التحليل الشامل، PRO يسمح */
  const entFree = await resolveEntitlements({ plan: "FREE" });
  const entPro = await resolveEntitlements({ plan: "PRO" });
  const cFree = await checkAiRequest(entFree, "full", "standard", "default");
  const cPro = await checkAiRequest(entPro, "full", "standard", "default");
  check("FREE يُمنع من التحليل الشامل", !cFree.ok && (cFree.reason === "full-analysis-disabled" || cFree.reason === "task-disabled"), cFree.ok ? "مسموح!" : cFree.reason);
  check("PRO يُسمح له بالتحليل الشامل", cPro.ok, cPro.ok ? `${cPro.credits} نقطة` : cPro.reason);

  /* 2) تكلفة المستوى: خبير > احترافي > سريع */
  const q = await creditCostFor("full", "quick");
  const s = await creditCostFor("full", "standard");
  const e = await creditCostFor("full", "expert");
  check("تكلفة: خبير > احترافي > سريع", e > s && s > q, `${q}/${s}/${e}`);

  /* 3) FREE يُمنع من مستوى خبير (غير مسموح للباقة) */
  const cFreeExpert = await checkAiRequest(entFree, "improve", "expert", "default");
  check("FREE يُمنع من مستوى خبير", !cFreeExpert.ok && cFreeExpert.reason === "level-disabled");

  /* 4) دورة كاملة: حجز → تثبيت (الرصيد يُخصم مرة واحدة) */
  const u1 = await mkUser("PRO", { grant: 100 });
  const r1 = await reserveCredits({ userId: u1.id, plan: "PRO", idempotencyKey: key("op1"), credits: 8, monthlyGrant: 100, dailyLimit: null, taskKey: "full", level: "standard", persona: "default", provider: "anthropic", model: "m" });
  check("الحجز نجح", r1.ok && !("reused" in r1 && r1.reused));
  if (r1.ok) await commitCredits({ operationId: r1.operationId, promptTokens: 100, completionTokens: 50, estimatedCostUsd: 0.01, model: "m", provider: "anthropic", executionMs: 12 });
  const w1 = await wallet(u1.id);
  check("بعد التثبيت: مستخدم 8 نقاط", w1?.used === 8, `used=${w1?.used}`);
  const led1 = await prisma.aiLedgerEntry.count({ where: { userId: u1.id } });
  check("سجل إلحاقي: قيدان (RESERVE + COMMIT)", led1 === 2, `entries=${led1}`);

  /* 5) Idempotency: نفس المفتاح مرتين = خصم واحد */
  const u2 = await mkUser("PRO", { grant: 100 });
  const idem = key("dup");
  const base = { userId: u2.id, plan: "PRO", idempotencyKey: idem, credits: 5, monthlyGrant: 100, dailyLimit: null, taskKey: "improve" as const, level: "standard" as const, persona: "default" as const, provider: "anthropic", model: "m" };
  const d1 = await reserveCredits(base);
  const d2 = await reserveCredits(base); // نفس المفتاح
  check("النقر المزدوج: الثاني reused", d1.ok && d2.ok && (d2 as { reused: boolean }).reused === true);
  const w2 = await wallet(u2.id);
  check("النقر المزدوج: خصم واحد فقط (5)", w2?.used === 5, `used=${w2?.used}`);

  /* 6) التزامن: 20 حجزًا متوازيًا بحد 10×3 نقاط = 30، الرصيد 30 → 10 تنجح بالضبط */
  const u3 = await mkUser("PRO", { grant: 30 });
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      reserveCredits({ userId: u3.id, plan: "PRO", idempotencyKey: key(`conc-${i}`), credits: 3, monthlyGrant: 30, dailyLimit: null, taskKey: "criteria", level: "standard", persona: "default", provider: "anthropic", model: "m" })
    )
  );
  const okCount = results.filter((r) => r.ok && !("reused" in r && r.reused)).length;
  const w3 = await wallet(u3.id, 30);
  check("التزامن: بالضبط 10 حجوزات نجحت (30/3)", okCount === 10, `نجح=${okCount}`);
  check("التزامن: الاستهلاك لم يتجاوز المنحة", (w3?.used ?? 0) <= 30, `used=${w3?.used}`);

  /* 7) الاسترجاع: فشل يعيد النقاط */
  const u4 = await mkUser("PRO", { grant: 100 });
  const r4 = await reserveCredits({ userId: u4.id, plan: "PRO", idempotencyKey: key("fail"), credits: 8, monthlyGrant: 100, dailyLimit: null, taskKey: "full", level: "standard", persona: "default", provider: "anthropic", model: "m" });
  if (r4.ok) await refundCredits(r4.operationId, "provider timeout", { failed: true });
  const w4 = await wallet(u4.id);
  check("الفشل: الرصيد أُعيد (used=0)", w4?.used === 0, `used=${w4?.used}`);
  const op4 = r4.ok ? await prisma.aiOperation.findUnique({ where: { id: r4.operationId } }) : null;
  check("الفشل: العملية FAILED + creditsRefunded", op4?.status === "FAILED" && op4?.creditsRefunded === 8);

  /* 8) الحد اليومي: منحة 100 لكن سقف يومي 5 يمنع ما بعده */
  const u5 = await mkUser("PRO", { grant: 100, daily: 5 });
  const dr1 = await reserveCredits({ userId: u5.id, plan: "PRO", idempotencyKey: key("day1"), credits: 4, monthlyGrant: 100, dailyLimit: 5, taskKey: "improve", level: "standard", persona: "default", provider: "anthropic", model: "m" });
  const dr2 = await reserveCredits({ userId: u5.id, plan: "PRO", idempotencyKey: key("day2"), credits: 4, monthlyGrant: 100, dailyLimit: 5, taskKey: "improve", level: "standard", persona: "default", provider: "anthropic", model: "m" });
  check("الحد اليومي: الأول ينجح", dr1.ok);
  check("الحد اليومي: الثاني يُرفض daily-limit", !dr2.ok && (dr2 as { reason: string }).reason === "daily-limit", dr2.ok ? "" : (dr2 as { reason: string }).reason);

  /* 9) رصيد غير كافٍ: منحة 3 وطلب 8 يُرفض */
  const u6 = await mkUser("PRO", { grant: 3 });
  const ir = await reserveCredits({ userId: u6.id, plan: "PRO", idempotencyKey: key("insuf"), credits: 8, monthlyGrant: 3, dailyLimit: null, taskKey: "full", level: "standard", persona: "default", provider: "anthropic", model: "m" });
  check("رصيد غير كافٍ: يُرفض insufficient-credits", !ir.ok && (ir as { reason: string }).reason === "insufficient-credits");

  /* 10) الحساب المعطَّل لا يحجز */
  const u7 = await mkUser("PRO", { grant: 100 });
  await prisma.user.update({ where: { id: u7.id }, data: { accountStatus: "DISABLED" } });
  const dis = await reserveCredits({ userId: u7.id, plan: "PRO", idempotencyKey: key("dis"), credits: 5, monthlyGrant: 100, dailyLimit: null, taskKey: "improve", level: "standard", persona: "default", provider: "anthropic", model: "m" });
  check("الحساب المعطَّل: لا حجز (account-disabled)", !dis.ok && (dis as { reason: string }).reason === "account-disabled");

  /* 11) تجاوز الأدمن لمنحة المستخدم يتقدّم على الباقة */
  const entOverride = await resolveEntitlements({ plan: "FREE", aiCreditsOverride: 999 });
  check("تجاوز المستخدم يتقدّم على منحة الباقة", entOverride.monthlyCredits === 999, `${entOverride.monthlyCredits}`);

  /* 12) تسجيل محاولة التجاوز في السجل */
  const u8 = await mkUser("PRO", { grant: 100 });
  await recordRejectedOperation({ userId: u8.id, plan: "PRO", idempotencyKey: key("rej"), credits: 8, taskKey: "full", level: "standard", persona: "default", provider: "anthropic", model: "m" }, "insufficient-credits", Date.now());
  const rejCount = await prisma.aiOperation.count({ where: { userId: u8.id, status: "REJECTED" } });
  check("محاولة التجاوز مسجّلة (REJECTED)", rejCount === 1, `rejected=${rejCount}`);

  /* تنظيف */
  const ids = [u1, u2, u3, u4, u5, u6, u7, u8].map((u) => u.id);
  await prisma.aiLedgerEntry.deleteMany({ where: { userId: { in: ids } } });
  await prisma.aiOperation.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });

  const passed = out.filter((o) => o.ok).length;
  console.log(`\n${passed}/${out.length} نجحت.`);
  if (passed !== out.length) process.exit(1);
}

main().finally(() => prisma.$disconnect());

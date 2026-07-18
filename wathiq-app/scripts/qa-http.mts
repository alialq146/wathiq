/* QA v2.6.1 — اختبارات HTTP على مسار /api/analyze عبر خادم حيّ: غياب مفتاح
 * Idempotency، غير مصرّح، حساب معطَّل، مدخل غير صالح، رصيد غير كافٍ، فشل المزوّد
 * مع استرجاع، والنقر المزدوج بنفس المفتاح. يستخدم مفتاح مزوّد وهميًا (fake) —
 * فمسار النجاح الحقيقي يُتحقَّق يدويًا (P6). يتطلّب خادمًا يعمل على WATHIQ_TEST_URL.
 * التشغيل: انظر scripts/run-qa-http.sh (يشغّل الخادم ثم هذا الملف). */
import { prisma } from "../src/lib/db";
import { createSessionToken, SESSION_COOKIE } from "../src/lib/auth";
import { getCreditWallet } from "../src/lib/ai-credits";

const BASE = process.env.WATHIQ_TEST_URL ?? "http://localhost:3111";
const out: { n: string; ok: boolean; d?: string }[] = [];
const check = (n: string, ok: boolean, d = "") => { out.push({ n, ok, d }); console.log(`${ok ? "✅" : "❌"} ${n}${d ? ` — ${d}` : ""}`); };

let seq = 0;
async function mkUser(grant: number, status = "ACTIVE") {
  return prisma.user.create({
    data: {
      email: `qa-http-${Date.now()}-${seq++}@w.local`, name: "HTTP", plan: "PRO", passwordHash: "x", accountStatus: status,
      aiCreditsGranted: grant, aiCreditsUsed: 0,
      aiCreditsPeriodEnd: new Date(Date.now() + 30 * 864e5), aiCreditsDayEnd: new Date(Date.now() + 864e5),
    },
    select: { id: true, name: true, email: true },
  });
}
async function cookieFor(u: { id: string; name: string; email: string }) {
  const token = await createSessionToken({ uid: u.id, name: u.name, email: u.email }, Math.floor(Date.now() / 1000));
  return `${SESSION_COOKIE}=${token}`;
}
async function post(body: unknown, cookie?: string) {
  const res = await fetch(`${BASE}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
    redirect: "manual", // نرى إعادة توجيه الوسيط (حماية الجلسة) بدل اتّباعها
  });
  let json: { ok?: boolean; error?: string } = {};
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, json };
}
const TEXT = "هذا نص متطلبات تجريبي طويل بما يكفي لتجاوز الحد الأدنى لطول الإدخال في المسار.";
const key = (s: string) => `${s}-${Date.now()}-${seq++}`;

async function main() {
  // فحص جاهزية الخادم.
  try {
    const h = await fetch(`${BASE}/api/health`);
    if (!h.ok && h.status !== 200) throw new Error(String(h.status));
  } catch (e) {
    console.error(`الخادم غير متاح على ${BASE} — ${(e as Error).message}`);
    process.exit(2);
  }

  const created: string[] = [];
  const active = await mkUser(100); created.push(active.id);
  const zero = await mkUser(0); created.push(zero.id);
  const disabled = await mkUser(100, "DISABLED"); created.push(disabled.id);
  const ckActive = await cookieFor(active);
  const ckZero = await cookieFor(zero);
  const ckDisabled = await cookieFor(disabled);

  /* 1) غير مصرّح: بلا كوكي → الوسيط يحجب المسار ويعيد التوجيه لتسجيل الدخول (307) */
  const r1 = await post({ text: TEXT, idempotencyKey: key("a") });
  check("HTTP: بلا جلسة → محجوب بالوسيط (307 لتسجيل الدخول)", r1.status === 307 || r1.status === 401, `status=${r1.status}`);

  /* 2) غياب مفتاح Idempotency لمستخدم محاسَب */
  const r2 = await post({ text: TEXT }, ckActive);
  check("HTTP: بلا مفتاح Idempotency → missing-idempotency-key", r2.json.error === "missing-idempotency-key", `${r2.json.error}`);

  /* 3) مدخل قصير جدًا (تحقق قبل أي حجز) */
  const r3 = await post({ text: "قصير", idempotencyKey: key("b") }, ckActive);
  check("HTTP: نص قصير → too-short (لا حجز)", r3.json.error === "too-short", `${r3.json.error}`);

  /* 4) حساب معطَّل */
  const r4 = await post({ text: TEXT, idempotencyKey: key("c") }, ckDisabled);
  check("HTTP: حساب معطَّل → unauthorized", r4.json.error === "unauthorized", `${r4.json.error}`);

  /* 5) رصيد غير كافٍ (منحة 0) — يُرفض قبل استدعاء المزوّد */
  const r5 = await post({ text: TEXT, idempotencyKey: key("d") }, ckZero);
  check("HTTP: رصيد 0 → insufficient-credits", r5.json.error === "insufficient-credits", `${r5.json.error}`);

  /* 6) فشل المزوّد (مفتاح وهمي) مع استرجاع كامل للرصيد + عملية FAILED */
  const kFail = key("fail");
  const before = (await getCreditWallet(active.id, 100, null))?.used;
  const r6 = await post({ text: TEXT, idempotencyKey: kFail }, ckActive);
  const after = (await getCreditWallet(active.id, 100, null))?.used;
  const opFail = await prisma.aiOperation.findUnique({ where: { idempotencyKey: kFail } });
  check("HTTP: فشل المزوّد → failed", r6.json.error === "failed", `${r6.json.error}`);
  check("HTTP: الفشل استرجع الرصيد كاملًا (used عاد كما بدأ)", before === 0 && after === 0, `before=${before} after=${after}`);
  check("HTTP: عملية الفشل مسجّلة FAILED", opFail?.status === "FAILED", `${opFail?.status}`);

  /* 7) النقر المزدوج بنفس المفتاح → الثاني duplicate (لا خصم/تنفيذ ثانٍ) */
  const r7 = await post({ text: TEXT, idempotencyKey: kFail }, ckActive); // نفس مفتاح 6
  check("HTTP: نفس المفتاح ثانيةً → duplicate", r7.json.error === "duplicate", `${r7.json.error}`);

  /* تنظيف */
  await prisma.aiLedgerEntry.deleteMany({ where: { userId: { in: created } } });
  await prisma.aiOperation.deleteMany({ where: { userId: { in: created } } });
  await prisma.user.deleteMany({ where: { id: { in: created } } });

  const passed = out.filter((o) => o.ok).length;
  console.log(`\n${passed}/${out.length} نجحت.`);
  await prisma.$disconnect();
  if (passed !== out.length) process.exit(1);
}

main().catch(async (e) => { console.error("FATAL", e); await prisma.$disconnect(); process.exit(1); });

/**
 * محاسبة نقاط الذكاء الاصطناعي (v2.6) — قلب حماية التكلفة.
 *
 * كل عملية ذكاء اصطناعي تمرّ بدورة: حجز → تنفيذ → تثبيت (نجاح) أو استرجاع
 * (فشل). التصميم:
 *  - محفظة لكل مستخدم (منحة شهرية + نافذة يومية اختيارية) — عدّادات ذرّية.
 *  - سجل AiLedgerEntry إلحاقي فقط (لا يُعدَّل) = مصدر الحقيقة المحاسبي.
 *  - AiOperation صف واحد لكل عملية = مرساة الـ Idempotency + بيانات المراجعة.
 *  - Idempotency إلزامية: مفتاح فريد؛ النقر المزدوج/إعادة المحاولة لا تخصم
 *    مرتين (قيد فريد + تراجع المعاملة يلغي أي حجز مكرر).
 *
 * لا يعتمد هذا الملف على أي مزوّد ذكاء اصطناعي — يتعامل مع نقاط/رموز/تكلفة
 * وسلاسل provider/model فقط.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { AiTaskKey, AiLevelKey, AiPersonaKey } from "@/lib/settings";

/* ---------------- إعادة ضبط النوافذ الزمنية ---------------- */

function addMonth(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}
function addDay(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  return d;
}

/**
 * إعادة ضبط كسولة وآمنة للتزامن. تحسين v2.6.1: نقرأ حدّي النافذتين أولًا، ولا
 * نُصدر أي كتابة إلا إذا انقضت نافذةٌ فعلًا — فالحالة الشائعة (لم تنقضِ) تصبح
 * قراءةً واحدة بلا كتابة (كانت كتابتين على كل حجز = تضخّم كتابة).
 *
 * الذرّية محفوظة: عند الانقضاء يبقى الشرط `aiCreditsPeriodEnd ≤ now` داخل
 * `updateMany` نفسه، فلا يُعاد الضبط مرتين تحت التزامن (أول معاملة تدفع الحدّ
 * للأمام ⇒ count=1، والمتزامنة معها لم يعُد شرطها ينطبق ⇒ count=0 تتجاهل).
 * القراءة المسبقة اختصارٌ فقط: إن قالت «لم تنقضِ» فهي لم تنقضِ (تخطّي آمن)؛ وإن
 * قالت «انقضت» يتحقق الشرط الذرّي مجددًا وقت الكتابة. المنحة الشهرية تُلتقط
 * لقطةً هنا، فتعديل الباقة في منتصف الشهر يسري في الشهر التالي.
 */
async function ensureWindows(userId: string, monthlyGrant: number, now: Date): Promise<void> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiCreditsPeriodEnd: true, aiCreditsDayEnd: true },
  });
  if (!u) return;
  const monthlyExpired = u.aiCreditsPeriodEnd == null || u.aiCreditsPeriodEnd <= now;
  const dailyExpired = u.aiCreditsDayEnd == null || u.aiCreditsDayEnd <= now;
  if (!monthlyExpired && !dailyExpired) return; // الشائع: لا كتابة إطلاقًا

  if (monthlyExpired) {
    await prisma.user.updateMany({
      where: { id: userId, OR: [{ aiCreditsPeriodEnd: null }, { aiCreditsPeriodEnd: { lte: now } }] },
      data: { aiCreditsGranted: monthlyGrant, aiCreditsUsed: 0, aiCreditsPeriodEnd: addMonth(now) },
    });
  }
  if (dailyExpired) {
    await prisma.user.updateMany({
      where: { id: userId, OR: [{ aiCreditsDayEnd: null }, { aiCreditsDayEnd: { lte: now } }] },
      data: { aiCreditsDayUsed: 0, aiCreditsDayEnd: addDay(now) },
    });
  }
}

/* ---------------- المحفظة (للعرض) ---------------- */

export interface CreditWallet {
  granted: number;
  used: number;
  balance: number;
  periodEnd: string | null;
  dailyLimit: number | null;
  dayUsed: number;
}

/**
 * حالة المحفظة الحالية (بعد إعادة الضبط الكسولة). للعرض في لوحة العميل.
 * dailyLimit يأتي من الامتيازات (لا يُخزَّن)، يمرّره المستدعي.
 */
export async function getCreditWallet(
  userId: string,
  monthlyGrant: number,
  dailyLimit: number | null
): Promise<CreditWallet | null> {
  const now = new Date();
  await ensureWindows(userId, monthlyGrant, now);
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiCreditsGranted: true, aiCreditsUsed: true, aiCreditsPeriodEnd: true, aiCreditsDayUsed: true },
  });
  if (!u) return null;
  return {
    granted: u.aiCreditsGranted,
    used: u.aiCreditsUsed,
    balance: Math.max(0, u.aiCreditsGranted - u.aiCreditsUsed),
    periodEnd: u.aiCreditsPeriodEnd?.toISOString() ?? null,
    dailyLimit,
    dayUsed: u.aiCreditsDayUsed,
  };
}

/* ---------------- الحجز (ذرّي + Idempotent) ---------------- */

export interface ReserveInput {
  userId: string;
  plan: string;
  idempotencyKey: string;
  credits: number; // تكلفة العملية (من محلّل الامتيازات)
  monthlyGrant: number; // لإعادة الضبط الكسولة (لقطة المنحة)
  dailyLimit: number | null;
  taskKey: AiTaskKey;
  level: AiLevelKey;
  persona: AiPersonaKey;
  provider: string;
  model: string;
  projectId?: string | null;
  requirementId?: string | null;
  documentId?: string | null;
  retryOfId?: string | null;
}

export type ReserveResult =
  | { ok: true; operationId: string; credits: number; reused: boolean }
  | { ok: false; reason: "account-disabled" | "insufficient-credits" | "daily-limit" };

const isUnique = (e: unknown): boolean =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/**
 * يحجز النقاط ذرّيًا. الضمانات:
 *  - لا تجاوز للمنحة الشهرية أو الحد اليومي (شرط ذرّي في updateMany).
 *  - لا خصم مزدوج: مفتاح idempotency فريد؛ الطلب المكرر يعيد نفس العملية
 *    (reused=true) دون خصم ثانٍ (تراجع المعاملة يلغي زيادة المحفظة).
 */
export async function reserveCredits(input: ReserveInput): Promise<ReserveResult> {
  const now = new Date();

  // فحص مبكر للحساب + إعادة ضبط النوافذ.
  const pre = await prisma.user.findUnique({ where: { id: input.userId }, select: { accountStatus: true } });
  if (!pre || pre.accountStatus !== "ACTIVE") return { ok: false, reason: "account-disabled" };
  await ensureWindows(input.userId, input.monthlyGrant, now);

  const wallet = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { aiCreditsGranted: true, aiCreditsUsed: true, aiCreditsDayUsed: true },
  });
  if (!wallet) return { ok: false, reason: "account-disabled" };

  const granted = wallet.aiCreditsGranted;
  const { credits, dailyLimit } = input;

  class NoCredits extends Error {}
  try {
    const op = await prisma.$transaction(async (tx) => {
      // الشرط الذرّي: الحجز فقط إن بقيت النقاط دون المنحة (والحد اليومي إن وُجد).
      const where: Prisma.UserWhereInput = { id: input.userId, aiCreditsUsed: { lte: granted - credits } };
      if (dailyLimit != null) where.aiCreditsDayUsed = { lte: dailyLimit - credits };
      const res = await tx.user.updateMany({
        where,
        data: { aiCreditsUsed: { increment: credits }, aiCreditsDayUsed: { increment: credits } },
      });
      if (res.count === 0) throw new NoCredits();

      const w = await tx.user.findUnique({ where: { id: input.userId }, select: { aiCreditsUsed: true } });
      // إنشاء العملية بمفتاح فريد — تكرار المفتاح ⇒ P2002 ⇒ تراجع كامل (لا خصم مزدوج).
      const operation = await tx.aiOperation.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          userId: input.userId,
          plan: input.plan,
          projectId: input.projectId ?? null,
          requirementId: input.requirementId ?? null,
          documentId: input.documentId ?? null,
          taskKey: input.taskKey,
          level: input.level,
          persona: input.persona,
          provider: input.provider,
          model: input.model,
          creditsReserved: credits,
          status: "RESERVED",
          retryOfId: input.retryOfId ?? null,
        },
      });
      await tx.aiLedgerEntry.create({
        data: {
          operationId: operation.id,
          userId: input.userId,
          entryType: "RESERVE",
          credits,
          balanceUsed: w?.aiCreditsUsed ?? credits,
        },
      });
      return operation;
    });
    return { ok: true, operationId: op.id, credits, reused: false };
  } catch (e) {
    if (isUnique(e)) {
      // Idempotency: عملية بنفس المفتاح موجودة — أعِدها دون خصم (المعاملة تراجعت).
      const existing = await prisma.aiOperation.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) return { ok: true, operationId: existing.id, credits: existing.creditsReserved, reused: true };
    }
    if (e instanceof NoCredits) {
      // تمييز سبب الرفض للرسالة فقط (لا يؤثر على الذرّية).
      const daily =
        dailyLimit != null && wallet.aiCreditsDayUsed + credits > dailyLimit && wallet.aiCreditsUsed + credits <= granted;
      return { ok: false, reason: daily ? "daily-limit" : "insufficient-credits" };
    }
    throw e;
  }
}

/* ---------------- التثبيت / الاسترجاع (Idempotent) ---------------- */

export interface CommitInput {
  operationId: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  estimatedCostUsd?: number | null;
  model?: string;
  provider?: string;
  executionMs?: number | null;
}

/**
 * يثبّت الخصم بعد نجاح العملية ويسجّل الأرقام الفعلية. النقاط محجوزة مسبقًا.
 * Idempotent وآمن للتزامن: الانتقال يتم عبر `updateMany WHERE status="RESERVED"`
 * (compare-and-set يأخذ قفل الصف) — لا `findUnique` غير قافلة كحارس، فلا يثبّت
 * مسارٌ عمليةً استرجعها/ثبّتها آخرُ في نفس اللحظة. يُعيد true إن ثبّت فعلًا.
 */
export async function commitCredits(input: CommitInput): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const op = await tx.aiOperation.findUnique({ where: { id: input.operationId } });
    if (!op || op.status !== "RESERVED") return false; // مسار سريع؛ الحارس الحقيقي أدناه
    const claimed = await tx.aiOperation.updateMany({
      where: { id: op.id, status: "RESERVED" }, // ذرّي: أول معاملة فقط تفوز
      data: {
        status: "COMMITTED",
        creditsCommitted: op.creditsReserved,
        promptTokens: input.promptTokens ?? null,
        completionTokens: input.completionTokens ?? null,
        estimatedCostUsd: input.estimatedCostUsd ?? null,
        model: input.model ?? op.model,
        provider: input.provider ?? op.provider,
        executionMs: input.executionMs ?? null,
        endedAt: new Date(),
      },
    });
    if (claimed.count === 0) return false; // فاز غيرنا بالحالة — لا قيد مزدوج
    const w = await tx.user.findUnique({ where: { id: op.userId }, select: { aiCreditsUsed: true } });
    await tx.aiLedgerEntry.create({
      data: { operationId: op.id, userId: op.userId, entryType: "COMMIT", credits: op.creditsReserved, balanceUsed: w?.aiCreditsUsed ?? 0 },
    });
    // المحفظة لا تتغيّر عند التثبيت — النقاط خُصمت وقت الحجز.
    return true;
  });
}

/**
 * يعيد النقاط للمحفظة عند فشل تقني/مهلة/حجز يتيم. `failed` يميّز الفشل التقني عن
 * الاسترجاع/الاسترداد. Idempotent وآمن للتزامن: الانتقال يتم أولًا عبر
 * `updateMany WHERE status="RESERVED"` (compare-and-set يأخذ قفل الصف)، ولا
 * تُعدَّل المحفظة/السجل إلا للمعاملة الفائزة (count=1). فمنظّفان متزامنان أو
 * تسابق فشل/مهلة لا يسترجعان النقاط مرتين. يُعيد true إن استرجع فعلًا.
 */
export async function refundCredits(operationId: string, reason: string, opts?: { failed?: boolean }): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const op = await tx.aiOperation.findUnique({ where: { id: operationId } });
    if (!op || op.status !== "RESERVED") return false; // مسار سريع؛ الحارس الحقيقي أدناه
    const c = op.creditsReserved;
    // الانتقال الذرّي أولًا: من يفوز به وحده يعيد النقاط ويكتب القيد.
    const claimed = await tx.aiOperation.updateMany({
      where: { id: op.id, status: "RESERVED" },
      data: {
        status: opts?.failed ? "FAILED" : "REFUNDED",
        creditsRefunded: c,
        errorMessage: reason.slice(0, 300),
        endedAt: new Date(),
      },
    });
    if (claimed.count === 0) return false; // فاز غيرنا — لا استرجاع مزدوج
    await tx.user.updateMany({
      where: { id: op.userId },
      data: { aiCreditsUsed: { decrement: c }, aiCreditsDayUsed: { decrement: c } },
    });
    // حماية من السالب (لو أُعيد الضبط اليومي بين الحجز والاسترجاع).
    await tx.user.updateMany({ where: { id: op.userId, aiCreditsUsed: { lt: 0 } }, data: { aiCreditsUsed: 0 } });
    await tx.user.updateMany({ where: { id: op.userId, aiCreditsDayUsed: { lt: 0 } }, data: { aiCreditsDayUsed: 0 } });
    const w = await tx.user.findUnique({ where: { id: op.userId }, select: { aiCreditsUsed: true } });
    await tx.aiLedgerEntry.create({
      data: { operationId: op.id, userId: op.userId, entryType: "REFUND", credits: c, balanceUsed: w?.aiCreditsUsed ?? 0, reason: reason.slice(0, 120) },
    });
    return true;
  });
}

/**
 * يسجّل محاولة مرفوضة (رصيد غير كافٍ/حد يومي) في السجل للمراجعة — «محاولات
 * التجاوز» في لوحة الأدمن. مفتاح مشتق (لا يصطدم بالمفتاح الأصلي ولا يمنع إعادة
 * محاولة شرعية لاحقة). best-effort: لا يفشل الطلب.
 */
export async function recordRejectedOperation(
  input: Omit<ReserveInput, "monthlyGrant" | "dailyLimit">,
  reason: string,
  stamp: number
): Promise<void> {
  try {
    await prisma.aiOperation.create({
      data: {
        idempotencyKey: `${input.idempotencyKey}:rej:${stamp}`,
        userId: input.userId,
        plan: input.plan,
        projectId: input.projectId ?? null,
        requirementId: input.requirementId ?? null,
        documentId: input.documentId ?? null,
        taskKey: input.taskKey,
        level: input.level,
        persona: input.persona,
        provider: input.provider,
        model: input.model,
        creditsReserved: input.credits,
        status: "REJECTED",
        errorMessage: reason.slice(0, 120),
        endedAt: new Date(),
      },
    });
  } catch (e) {
    console.warn("[recordRejectedOperation] skipped:", e);
  }
}

/** إسناد المنحة الشهرية مباشرة (تفعيل اشتراك/تجديد/شحن أدمن) — يبدأ نافذة جديدة. */
export async function grantMonthlyCredits(userId: string, grant: number, opts?: { resetUsage?: boolean }): Promise<void> {
  const now = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: {
      aiCreditsGranted: Math.max(0, Math.trunc(grant)),
      aiCreditsPeriodEnd: addMonth(now),
      ...(opts?.resetUsage ? { aiCreditsUsed: 0 } : {}),
    },
  });
}

/**
 * Server-side AI usage: per-plan model routing, the monthly analysis quota
 * (with automatic reset), and best-effort usage logging. Everything here is
 * trusted server logic — the client never chooses the model or the limit.
 */

import { prisma } from "./db";
import { getPlan, type PlanId } from "./plans";

/* ---------------- model routing ---------------- */

// Defaults chosen for cost: cheap for FREE, stronger as the plan grows.
// Overridable per deployment via environment variables.
const DEFAULT_MODELS: Record<PlanId, string> = {
  FREE: "claude-haiku-4-5-20251001",
  PRO: "claude-sonnet-5",
  ENTERPRISE: "claude-opus-4-8",
};

// اختيار نموذج الذكاء الاصطناعي حسب خطة المستخدم — في الخادم فقط،
// فالعميل لا يمرر اسم النموذج أبدًا ولا يستطيع التلاعب به.
export function modelForPlan(plan: string | null | undefined): string {
  const id = getPlan(plan).id;
  const envKey = `AI_MODEL_${id}`;
  return (process.env[envKey] && process.env[envKey]!.trim()) || DEFAULT_MODELS[id];
}

/** Rough per-1K-token USD rates, for the estimatedCost column (best effort). */
const RATES: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5-20251001": { in: 0.001, out: 0.005 },
  "claude-sonnet-5": { in: 0.003, out: 0.015 },
  "claude-opus-4-8": { in: 0.015, out: 0.075 },
};

export function estimateCost(model: string, inputTokens?: number | null, outputTokens?: number | null): number | null {
  const rate = RATES[model];
  if (!rate || inputTokens == null || outputTokens == null) return null;
  return Number(((inputTokens / 1000) * rate.in + (outputTokens / 1000) * rate.out).toFixed(6));
}

/* ---------------- quota with monthly reset ---------------- */

export interface Quota {
  plan: string;
  count: number;
  limit: number | null; // null = unlimited
  model: string;
  exceeded: boolean;
}

function nextMonth(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}

/**
 * Resolve the user's current quota, resetting the monthly counter when the
 * reset date has passed (or was never set). Returns the effective count/limit
 * and the plan's model.
 */
export async function resolveQuota(userId: string): Promise<Quota | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, analysisCount: true, analysisLimit: true, resetDate: true, limitOverride: true, accountStatus: true },
  });
  // أمان: جلسة موقّعة لمستخدم محذوف أو معطَّل لا تمنح أي حصة تحليل —
  // المسارات تعامل null كرفض، فلا تحليل غير محسوب ولا تجاوز للتعطيل.
  if (!user || user.accountStatus === "DISABLED") return null;

  const now = new Date();
  let count = user.analysisCount;

  // First use, or the billing month has elapsed → reset the counter.
  if (!user.resetDate || user.resetDate.getTime() <= now.getTime()) {
    count = 0;
    await prisma.user
      .update({ where: { id: userId }, data: { analysisCount: 0, resetDate: nextMonth(now) } })
      .catch(() => {});
  }

  // Plan is the source of truth, unless an admin set a per-user override.
  const limit = user.limitOverride ? user.analysisLimit : getPlan(user.plan).analysisLimit;
  return {
    plan: user.plan,
    count,
    limit,
    model: modelForPlan(user.plan),
    exceeded: limit != null && count >= limit,
  };
}

/* ------------------------------------------------------------------
   حجز الحصة الذري — إغلاق سباق «فحص ثم استهلاك»:
   الحجز يزيد العداد بشرط أنه دون الحد في نفس العبارة (updateMany
   المشروط)، فطلبات متوازية لا يمكن أن تتجاوز الحد أبدًا — من لا يجد
   حصة لا يصل إلى الذكاء الاصطناعي إطلاقًا.

   قرار موثق: الفشل لا يستهلك الحصة (نفس سلوك النظام السابق) —
   لذلك عند فشل استدعاء الذكاء الاصطناعي يُعاد الحجز بـ releaseQuota.
   ------------------------------------------------------------------ */

export type QuotaReservation =
  | { ok: true; model: string; limit: number | null }
  | { ok: false; reason: "unauthorized" | "limit"; model: string; limit: number | null };

export async function reserveQuota(userId: string): Promise<QuotaReservation> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, analysisLimit: true, resetDate: true, limitOverride: true, accountStatus: true },
  });
  // أمان: حساب محذوف أو معطَّل لا يحجز حصة ولا يصل للنموذج.
  if (!user || user.accountStatus !== "ACTIVE") {
    return { ok: false, reason: "unauthorized", model: "", limit: null };
  }

  const model = modelForPlan(user.plan);
  const now = new Date();

  // بداية شهر جديد (أو أول استخدام): يُصفَّر العداد قبل الحجز مباشرة.
  if (!user.resetDate || user.resetDate.getTime() <= now.getTime()) {
    await prisma.user.update({
      where: { id: userId },
      data: { analysisCount: 0, resetDate: nextMonth(now) },
    });
  }

  const limit = user.limitOverride ? user.analysisLimit : getPlan(user.plan).analysisLimit;

  if (limit == null) {
    // بلا حد (ENTERPRISE): العداد يبقى إحصائيًا فقط.
    await prisma.user.update({ where: { id: userId }, data: { analysisCount: { increment: 1 } } });
    return { ok: true, model, limit: null };
  }

  // العبارة الذرية: لا زيادة إلا إذا كان العداد لا يزال دون الحد.
  const res = await prisma.user.updateMany({
    where: { id: userId, analysisCount: { lt: limit } },
    data: { analysisCount: { increment: 1 } },
  });
  if (res.count === 0) return { ok: false, reason: "limit", model, limit };
  return { ok: true, model, limit };
}

/** إعادة حجز لم يكتمل (فشل النموذج أو رفض مبكر بعد الحجز) — الفشل لا يُحاسَب. */
export async function releaseQuota(userId: string): Promise<void> {
  await prisma.user
    .updateMany({
      where: { id: userId, analysisCount: { gt: 0 } },
      data: { analysisCount: { decrement: 1 } },
    })
    .catch((e) => console.error("[releaseQuota]", e));
}

/* ---------------- usage logging ---------------- */

export type UsageStatus =
  | "SUCCESS"
  | "FAILED"
  | "BLOCKED_LIMIT"
  | "BLOCKED_AUTH"
  | "BLOCKED_SIZE";

export interface UsageLog {
  userId: string;
  projectId?: string | null;
  requirementId?: string | null;
  documentId?: string | null;
  modelUsed: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  status: UsageStatus;
  errorMessage?: string | null;
}

/** Record one AI attempt. Best-effort: never throws into the request path. */
export async function logAiUsage(log: UsageLog): Promise<void> {
  try {
    await prisma.aiUsage.create({
      data: {
        userId: log.userId,
        projectId: log.projectId ?? null,
        requirementId: log.requirementId ?? null,
        documentId: log.documentId ?? null,
        modelUsed: log.modelUsed,
        inputTokens: log.inputTokens ?? null,
        outputTokens: log.outputTokens ?? null,
        estimatedCost: estimateCost(log.modelUsed, log.inputTokens, log.outputTokens),
        status: log.status,
        errorMessage: log.errorMessage ?? null,
      },
    });
  } catch (err) {
    console.warn("[logAiUsage] skipped:", err);
  }
}

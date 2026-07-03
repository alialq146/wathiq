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
    select: { plan: true, analysisCount: true, analysisLimit: true, resetDate: true },
  });
  if (!user) return null;

  const now = new Date();
  let count = user.analysisCount;

  // First use, or the billing month has elapsed → reset the counter.
  if (!user.resetDate || user.resetDate.getTime() <= now.getTime()) {
    count = 0;
    await prisma.user
      .update({ where: { id: userId }, data: { analysisCount: 0, resetDate: nextMonth(now) } })
      .catch(() => {});
  }

  const limit = getPlan(user.plan).analysisLimit; // plan is the source of truth
  return {
    plan: user.plan,
    count,
    limit,
    model: modelForPlan(user.plan),
    exceeded: limit != null && count >= limit,
  };
}

/** Increment the user's monthly analysis counter after a successful call. */
export async function consumeQuota(userId: string): Promise<void> {
  await prisma.user
    .update({ where: { id: userId }, data: { analysisCount: { increment: 1 } } })
    .catch((e) => console.error("[consumeQuota]", e));
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

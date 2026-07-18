/**
 * منسّق العملية الذكية (v2.6) — نقطة الدخول الوحيدة لأي استدعاء ذكاء اصطناعي
 * مُحاسَب. يجمع: الامتيازات → التحقق → توجيه المزوّد/النموذج → الحجز الذرّي
 * (Idempotent) → التنفيذ → التثبيت/الاسترجاع. المسارات لا تتعامل مع النقاط
 * مباشرة — تمرّر دالة تنفيذ فقط، فيبقى الكود المحاسبي في مكان واحد.
 */

import { prisma } from "@/lib/db";
import { resolveEntitlements, checkAiRequest } from "@/lib/entitlements";
import { resolveRuntimeConfig, estimateCostUsd } from "@/lib/ai-runtime";
import { reserveCredits, commitCredits, refundCredits, recordRejectedOperation } from "@/lib/ai-credits";
import { getResolvedAiSettings } from "@/lib/settings";
import type { AiTaskKey, AiLevelKey, AiPersonaKey } from "@/lib/settings";

export interface AiExecuteContext {
  model: string;
  maxOutputTokens: number;
  timeoutMs: number;
  personaHint: string;
}
export interface AiExecuteResult<T> {
  result: T;
  promptTokens?: number | null;
  completionTokens?: number | null;
  model?: string;
}

export interface RunAiInput<T> {
  /** uid المستخدم؛ metered=false في وضع المالك/المفتوح (بلا محاسبة). */
  uid: string;
  metered: boolean;
  taskKey: AiTaskKey;
  level: AiLevelKey;
  persona: AiPersonaKey;
  idempotencyKey: string;
  ids?: { projectId?: string | null; requirementId?: string | null; documentId?: string | null };
  execute: (ctx: AiExecuteContext) => Promise<AiExecuteResult<T>>;
}

export type RunAiOutcome<T> =
  | { ok: true; result: T; credits: number; balance: number | null; operationId: string | null }
  | { ok: false; error: string; credits?: number };

/** نفّذ عملية ذكاء اصطناعي محاسَبة كاملةً. */
export async function runAiOperation<T>(input: RunAiInput<T>): Promise<RunAiOutcome<T>> {
  const ai = await getResolvedAiSettings();
  const personaHint = ai.personas[input.persona]?.systemHint ?? "";

  /* ---- وضع غير محاسَب (مالك/تطوير): تنفيذ مباشر بلا نقاط ---- */
  if (!input.metered) {
    const rt = await resolveRuntimeConfig("ENTERPRISE", input.taskKey, input.level);
    try {
      const out = await input.execute({ model: rt.model, maxOutputTokens: rt.maxOutputTokens, timeoutMs: rt.timeoutMs, personaHint });
      return { ok: true, result: out.result, credits: 0, balance: null, operationId: null };
    } catch (err) {
      console.error("[ai-operation:unmetered]", err);
      return { ok: false, error: "failed" };
    }
  }

  /* ---- وضع محاسَب ---- */
  const user = await prisma.user.findUnique({
    where: { id: input.uid },
    select: { plan: true, aiCreditsOverride: true, accountStatus: true },
  });
  if (!user || user.accountStatus !== "ACTIVE") return { ok: false, error: "unauthorized" };

  const ent = await resolveEntitlements(user);
  const check = await checkAiRequest(ent, input.taskKey, input.level, input.persona);
  if (!check.ok) return { ok: false, error: check.reason };

  const rt = await resolveRuntimeConfig(user.plan, input.taskKey, input.level);

  const reservation = await reserveCredits({
    userId: input.uid,
    plan: user.plan,
    idempotencyKey: input.idempotencyKey,
    credits: check.credits,
    monthlyGrant: ent.monthlyCredits,
    dailyLimit: ent.dailyCreditLimit,
    taskKey: input.taskKey,
    level: input.level,
    persona: input.persona,
    provider: rt.provider,
    model: rt.model,
    projectId: input.ids?.projectId ?? null,
    requirementId: input.ids?.requirementId ?? null,
    documentId: input.ids?.documentId ?? null,
  });
  if (!reservation.ok) {
    // سجّل «محاولة تجاوز» للمراجعة (رصيد غير كافٍ/حد يومي) — لا للحساب المعطَّل.
    if (reservation.reason === "insufficient-credits" || reservation.reason === "daily-limit") {
      await recordRejectedOperation(
        {
          userId: input.uid, plan: user.plan, idempotencyKey: input.idempotencyKey, credits: check.credits,
          taskKey: input.taskKey, level: input.level, persona: input.persona, provider: rt.provider, model: rt.model,
          projectId: input.ids?.projectId ?? null, requirementId: input.ids?.requirementId ?? null, documentId: input.ids?.documentId ?? null,
        },
        reservation.reason,
        Date.now()
      );
    }
    return { ok: false, error: reservation.reason, credits: check.credits };
  }
  // نفس المفتاح (نقر مزدوج/إعادة محاولة) — لا تنفيذ ثانٍ ولا خصم ثانٍ.
  if (reservation.reused) return { ok: false, error: "duplicate" };

  const startedAt = Date.now();
  try {
    const out = await input.execute({ model: rt.model, maxOutputTokens: rt.maxOutputTokens, timeoutMs: rt.timeoutMs, personaHint });
    const usedModel = out.model ?? rt.model;
    const cost = await estimateCostUsd(usedModel, out.promptTokens, out.completionTokens);
    await commitCredits({
      operationId: reservation.operationId,
      promptTokens: out.promptTokens ?? null,
      completionTokens: out.completionTokens ?? null,
      estimatedCostUsd: cost,
      model: usedModel,
      provider: rt.provider,
      executionMs: Date.now() - startedAt,
    });
    const balance = await currentBalance(input.uid);
    return { ok: true, result: out.result, credits: check.credits, balance, operationId: reservation.operationId };
  } catch (err) {
    await refundCredits(reservation.operationId, String(err).slice(0, 300), { failed: true });
    console.error("[ai-operation:metered]", err);
    return { ok: false, error: "failed" };
  }
}

async function currentBalance(userId: string): Promise<number | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { aiCreditsGranted: true, aiCreditsUsed: true } });
  return u ? Math.max(0, u.aiCreditsGranted - u.aiCreditsUsed) : null;
}

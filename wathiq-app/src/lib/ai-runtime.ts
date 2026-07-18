/**
 * زمن تشغيل الذكاء الاصطناعي المستقل عن المزوّد (v2.6).
 *
 * طبقة المحاسبة (النقاط/السجل) لا تعرف شيئًا عن مزوّد بعينه؛ هذا الملف هو
 * الجسر: يحل «أي نموذج/مزوّد/مهلة/حد إخراج» لكل (خطة، مهمة، مستوى) من
 * الإعدادات، ويقدّر التكلفة بالدولار من جدول أسعار قابل للتعديل. تغيير المزوّد
 * (OpenAI/Gemini/OpenRouter/محلي…) = تعديل إعدادات فقط، لا تعديل محاسبة.
 *
 * أسماء النماذج والمزوّدين إعداد خادمي بحت — لا تُعاد إلى العميل أبدًا.
 */

import { getResolvedAiSettings } from "@/lib/settings";
import type { AiTaskKey, AiLevelKey, PlanId } from "@/lib/settings";

export interface RuntimeConfig {
  provider: string;
  model: string;
  fallbackModel: string;
  timeoutMs: number;
  retryCount: number;
  maxOutputTokens: number;
}

function planId(plan: string | null | undefined): PlanId {
  return plan === "PRO" || plan === "ENTERPRISE" ? plan : "FREE";
}

/**
 * يحل تكوين التشغيل لطلب معيّن. النموذج: متغيّر البيئة AI_MODEL_{PLAN} يتقدّم
 * (تجاوز نشر)، ثم توجيه الإعدادات، ثم النموذج البديل. حد الإخراج = حد المهمة ×
 * مضاعِف رموز المستوى، مقصوصًا للسقف الصلب.
 */
export async function resolveRuntimeConfig(
  plan: string | null | undefined,
  task: AiTaskKey,
  level: AiLevelKey
): Promise<RuntimeConfig> {
  const ai = await getResolvedAiSettings();
  const id = planId(plan);
  const envModel = process.env[`AI_MODEL_${id}`]?.trim();
  const model = envModel || ai.modelRouting[id] || ai.fallbackModel;
  const baseTokens = ai.tasks[task]?.maxOutputTokens ?? 1000;
  const tokenMult = ai.levels[level]?.tokenMultiplier ?? 1;
  return {
    provider: ai.defaultProvider,
    model,
    fallbackModel: ai.fallbackModel,
    timeoutMs: ai.timeoutMs,
    retryCount: ai.retryCount,
    maxOutputTokens: Math.max(100, Math.min(12000, Math.round(baseTokens * tokenMult))),
  };
}

/** تقدير تكلفة الدولار من جدول الأسعار (خادمي، للمحاسبة الداخلية فقط). */
export async function estimateCostUsd(
  model: string,
  promptTokens?: number | null,
  completionTokens?: number | null
): Promise<number | null> {
  if (promptTokens == null || completionTokens == null) return null;
  const ai = await getResolvedAiSettings();
  const rate = ai.costRates[model];
  if (!rate) return null;
  const usd = (promptTokens / 1000) * rate.in + (completionTokens / 1000) * rate.out;
  return Number(usd.toFixed(6));
}

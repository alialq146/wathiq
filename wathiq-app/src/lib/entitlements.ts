/**
 * محلّل الامتيازات المركزي (v2.6) — المصدر الوحيد لقرارات «ماذا يحق لهذا
 * المستخدم أن يفعله بالذكاء الاصطناعي وكم يكلّف». لا يوجد `if (plan === "PRO")`
 * مبعثر في أي مكان؛ كل مسار ذكاء اصطناعي يمرّ من هنا.
 *
 * الامتيازات تُقرأ من الإعدادات (الباقة + مجموعة ai) بعد قصّها بالسقوف الصلبة،
 * فتكون كل الأرقام قابلة للتعديل من لوحة الأدمن دون تعديل كود.
 */

import { getResolvedPlan, getResolvedAiSettings } from "@/lib/settings";
import type { AiTaskKey, AiLevelKey, AiPersonaKey, PlanId } from "@/lib/settings";

export interface Entitlements {
  plan: PlanId;
  /** منحة النقاط الشهرية الفعلية (تجاوز المستخدم يتقدّم على الباقة). */
  monthlyCredits: number;
  dailyCreditLimit: number | null;
  perRequestCreditLimit: number | null;
  fullAnalysisEnabled: boolean;
  allowedTasks: Set<AiTaskKey>;
  allowedLevels: Set<AiLevelKey>;
  allowedPersonas: Set<AiPersonaKey>;
}

/** الحد الأدنى من بيانات المستخدم اللازم لحل الامتيازات. */
export interface EntitlementUser {
  plan: string;
  aiCreditsOverride?: number | null;
}

/** يحل امتيازات المستخدم كاملةً — نقطة القرار الوحيدة. */
export async function resolveEntitlements(user: EntitlementUser): Promise<Entitlements> {
  const plan = await getResolvedPlan(user.plan);
  const override = typeof user.aiCreditsOverride === "number" && user.aiCreditsOverride >= 0 ? user.aiCreditsOverride : null;
  return {
    plan: plan.id,
    monthlyCredits: override ?? plan.monthlyCredits,
    dailyCreditLimit: plan.dailyCreditLimit,
    perRequestCreditLimit: plan.perRequestCreditLimit,
    fullAnalysisEnabled: plan.fullAnalysisEnabled,
    allowedTasks: new Set(plan.allowedTasks),
    allowedLevels: new Set(plan.allowedLevels),
    allowedPersonas: new Set(plan.allowedPersonas),
  };
}

/** تكلفة عملية بالنقاط = تكلفة المهمة × مضاعِف المستوى (أدنى نقطة واحدة). */
export async function creditCostFor(task: AiTaskKey, level: AiLevelKey): Promise<number> {
  const ai = await getResolvedAiSettings();
  const base = ai.tasks[task]?.credits ?? 0;
  const mult = ai.levels[level]?.multiplier ?? 1;
  return Math.max(1, Math.ceil(base * mult));
}

export type EntitlementDenial =
  | "task-disabled" // المهمة معطّلة نظاميًا أو غير متاحة لهذه الباقة
  | "full-analysis-disabled" // التحليل الشامل غير متاح لهذه الباقة
  | "level-disabled" // مستوى التحليل غير متاح
  | "persona-disabled" // الشخصية غير متاحة
  | "per-request-limit"; // التكلفة تتجاوز سقف العملية الواحدة للباقة

export type EntitlementCheck =
  | { ok: true; credits: number }
  | { ok: false; reason: EntitlementDenial };

/**
 * يتحقق أن طلب ذكاء اصطناعي (مهمة/مستوى/شخصية) مسموح لهذه الامتيازات،
 * ويعيد تكلفته بالنقاط. يجمع بين تعطيل النظام (ai.enabled) وحق الباقة
 * (allowed*) — كلاهما يجب أن يسمح.
 */
export async function checkAiRequest(
  ent: Entitlements,
  task: AiTaskKey,
  level: AiLevelKey,
  persona: AiPersonaKey
): Promise<EntitlementCheck> {
  const ai = await getResolvedAiSettings();

  if (!ai.tasks[task]?.enabled || !ent.allowedTasks.has(task)) return { ok: false, reason: "task-disabled" };
  if (task === "full" && !ent.fullAnalysisEnabled) return { ok: false, reason: "full-analysis-disabled" };
  if (!ai.levels[level]?.enabled || !ent.allowedLevels.has(level)) return { ok: false, reason: "level-disabled" };
  if (!ai.personas[persona]?.enabled || !ent.allowedPersonas.has(persona)) return { ok: false, reason: "persona-disabled" };

  const credits = Math.max(1, Math.ceil((ai.tasks[task].credits ?? 0) * (ai.levels[level].multiplier ?? 1)));
  if (ent.perRequestCreditLimit != null && credits > ent.perRequestCreditLimit) {
    return { ok: false, reason: "per-request-limit" };
  }
  return { ok: true, credits };
}

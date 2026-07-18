import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  analyzeRequirement,
  runAssistantTask,
  hasAnthropicKey,
  buildContextBlock,
  type AssistantTask,
} from "@/lib/ai";
import { prisma, hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { authEnabled } from "@/lib/auth";
import { runAiOperation } from "@/lib/ai-operation";
import { trackEvent } from "@/lib/track";
import { getFeatureSettings } from "@/lib/settings";
import type { AiLevelKey, AiPersonaKey, AiTaskKey } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LIGHT_TASKS = ["improve", "criteria", "questions", "ambiguity", "risks"] as const;
const LEVELS: AiLevelKey[] = ["quick", "standard", "expert"];
const PERSONAS: AiPersonaKey[] = ["default", "ba", "consultant", "qa", "po", "tech"];

export async function POST(req: Request) {
  if (!hasAnthropicKey()) return NextResponse.json({ ok: false, error: "no-key" });
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "no-db" });

  // الفاعل + هل يُحاسَب؟
  let uid = "owner";
  let metered = false;
  if (authEnabled()) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" });
    uid = user.uid;
    metered = user.uid !== "owner";
  }

  // مفتاح الإيقاف العام للمساعد (بوابة نظام قبل أي محاسبة).
  const feats = await getFeatureSettings();
  if (!feats.assistantEnabled) return NextResponse.json({ ok: false, error: "assistant-disabled" });

  let body: { id?: unknown; task?: unknown; level?: unknown; persona?: unknown; idempotencyKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ ok: false, error: "missing-id" });

  const task: AssistantTask | "full" =
    typeof body.task === "string" && (LIGHT_TASKS as readonly string[]).includes(body.task)
      ? (body.task as AssistantTask)
      : "full";
  const taskKey: AiTaskKey = task === "full" ? "full" : (task as AiTaskKey);
  const level: AiLevelKey = LEVELS.includes(body.level as AiLevelKey) ? (body.level as AiLevelKey) : "standard";
  const persona: AiPersonaKey = PERSONAS.includes(body.persona as AiPersonaKey) ? (body.persona as AiPersonaKey) : "default";
  const idem = typeof body.idempotencyKey === "string" && body.idempotencyKey.trim() ? body.idempotencyKey.trim().slice(0, 80) : "";
  if (metered && !idem) return NextResponse.json({ ok: false, error: "missing-idempotency-key" });

  // تحميل المتطلب مُنطّقًا بالملكية (لا تحليل لمتطلب لا يملكه المستخدم) — قبل أي حجز.
  const where = metered ? { id, ownerId: uid } : { id };
  const reqRow = await prisma.requirement.findFirst({ where });
  if (!reqRow) return NextResponse.json({ ok: false, error: "not-found" });

  const [projRow, modRow] = await Promise.all([
    reqRow.projectId
      ? prisma.project.findFirst({
          where: { id: reqRow.projectId, ...(metered ? { ownerId: uid } : {}) },
          select: {
            projectIdea: true, projectGoal: true, targetUsers: true, projectScope: true,
            outOfScope: true, relatedSystems: true, constraints: true,
          },
        })
      : Promise.resolve(null),
    reqRow.moduleId
      ? prisma.projectModule.findFirst({
          where: { id: reqRow.moduleId, ...(metered ? { ownerId: uid } : {}) },
          select: { name: true, description: true },
        })
      : Promise.resolve(null),
  ]);

  const reqInput = {
    id: reqRow.id,
    title: reqRow.title,
    description: reqRow.description,
    module: reqRow.module,
    priority: reqRow.priority,
    type: reqRow.type,
    stakeholders: reqRow.stakeholders,
    notes: reqRow.notes,
    contextBlock: buildContextBlock(projRow, modRow),
  };

  const trackUid = metered ? uid : null;
  await trackEvent({ eventName: "assistant_task_started", userId: trackUid, projectId: reqRow.projectId, requirementId: id, metadata: { task, level } });

  const outcome = await runAiOperation<unknown>({
    uid,
    metered,
    taskKey,
    level,
    persona,
    idempotencyKey: idem || `open-${Date.now()}`,
    ids: { projectId: reqRow.projectId, requirementId: id },
    execute: async (ctx) => {
      if (task !== "full") {
        const { result, meta } = await runAssistantTask(reqInput, task, ctx.model, ctx.maxOutputTokens, ctx.personaHint);
        return { result: { task, result }, promptTokens: meta.inputTokens, completionTokens: meta.outputTokens, model: meta.model };
      }
      // التحليل الشامل: نفّذ ثم احفظ داخل نفس التنفيذ — فشل الحفظ يعيد النقاط.
      const { result: analysis, meta } = await analyzeRequirement(reqInput, ctx.model, {
        maxTokens: ctx.maxOutputTokens,
        personaHint: ctx.personaHint,
      });
      const to = reqRow.stakeholders[0] ?? "أصحاب المصلحة";
      const criteriaRows = analysis.acceptanceCriteria.map((text, i) => ({
        id: `AC-${randomUUID().slice(0, 8)}`, ownerId: reqRow.ownerId, projectId: reqRow.projectId,
        requirementId: id, text, done: false, ai: true, order: i,
      }));
      const questionRows = analysis.stakeholderQuestions.map((text, i) => ({
        id: `Q-${randomUUID().slice(0, 8)}`, ownerId: reqRow.ownerId, projectId: reqRow.projectId,
        requirementId: id, text, to, ai: true, answer: null, order: i,
      }));
      await prisma.$transaction(
        async (tx) => {
          // يُعاد توليد الصفوف المولّدة بالذكاء فقط (ai:true)؛ اليدوية (ai:false) محفوظة.
          await tx.acceptanceCriterion.deleteMany({ where: { requirementId: id, ai: true } });
          await tx.openQuestion.deleteMany({ where: { requirementId: id, ai: true } });
          if (criteriaRows.length) await tx.acceptanceCriterion.createMany({ data: criteriaRows });
          if (questionRows.length) await tx.openQuestion.createMany({ data: questionRows });
          const criteriaCount = await tx.acceptanceCriterion.count({ where: { requirementId: id } });
          const questionCount = await tx.openQuestion.count({ where: { requirementId: id } });
          await tx.requirement.update({
            where: { id },
            data: {
              analysis: analysis as object,
              confidence: Math.max(0, Math.min(100, Math.round(analysis.qualityScore))),
              criteria: criteriaCount,
              openQuestions: questionCount,
            },
          });
          await tx.auditEvent.create({
            data: {
              ownerId: reqRow.ownerId, projectId: reqRow.projectId, requirementId: id,
              action: "requirement_analyzed",
              detail: `تحليل جودة المتطلب «${reqRow.title}» — الدرجة ${analysis.qualityScore}٪.`,
              actor: "وثّق",
            },
          });
        },
        { maxWait: 10_000, timeout: 30_000 }
      );
      return { result: { analysis }, promptTokens: meta.inputTokens, completionTokens: meta.outputTokens, model: meta.model };
    },
  });

  if (!outcome.ok) {
    if (outcome.error !== "duplicate") {
      await trackEvent({ eventName: "assistant_task_failed", userId: trackUid, projectId: reqRow.projectId, requirementId: id, metadata: { task, reason: outcome.error } });
    }
    return NextResponse.json({ ok: false, error: outcome.error });
  }

  await trackEvent({ eventName: "assistant_task_succeeded", userId: trackUid, projectId: reqRow.projectId, requirementId: id, metadata: { task, level } });
  const payload = outcome.result as { task?: string; result?: unknown; analysis?: unknown };
  return NextResponse.json({ ok: true, ...payload, credits: outcome.credits, balance: outcome.balance });
}

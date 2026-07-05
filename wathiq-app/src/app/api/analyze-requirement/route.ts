import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { analyzeRequirement, runAssistantTask, hasAnthropicKey, type AssistantTask } from "@/lib/ai";
import { prisma, hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { authEnabled } from "@/lib/auth";
import { resolveQuota, consumeQuota, logAiUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_MODEL = "claude-opus-4-8";

export async function POST(req: Request) {
  if (!hasAnthropicKey()) return NextResponse.json({ ok: false, error: "no-key" });
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "no-db" });

  // فحوصات مسبقة في الخادم: الجلسة، حد الخطة، النموذج، ثم ملكية المتطلب
  // (findFirst مع ownerId) — لا يستطيع مستخدم تحليل متطلب لا يملكه.
  let userId: string | null = null;
  let model = DEFAULT_MODEL;
  if (authEnabled()) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" });
    if (user.uid !== "owner") {
      const quota = await resolveQuota(user.uid);
      if (quota) {
        model = quota.model;
        if (quota.exceeded) {
          await logAiUsage({ userId: user.uid, modelUsed: model, status: "BLOCKED_LIMIT" });
          return NextResponse.json({ ok: false, error: "limit", limit: quota.limit });
        }
        userId = user.uid;
      }
    }
  }

  let body: { id?: unknown; task?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ ok: false, error: "missing-id" });
  // مهمة المساعد: "full" (افتراضي) = تحليل شامل يُحفظ؛ غيرها مهام خفيفة
  // مركزة ترجع نتيجتها للمستخدم ليقرر تطبيقها — أوفر في الرموز والتكلفة.
  const LIGHT_TASKS = ["improve", "criteria", "questions", "ambiguity", "risks"] as const;
  const task =
    typeof body.task === "string" && (LIGHT_TASKS as readonly string[]).includes(body.task)
      ? (body.task as AssistantTask)
      : "full";

  // Load the requirement (scoped to the user in accounts mode).
  const where = userId ? { id, ownerId: userId } : { id };
  const reqRow = await prisma.requirement.findFirst({ where });
  if (!reqRow) return NextResponse.json({ ok: false, error: "not-found" });

  const reqInput = {
    id: reqRow.id,
    title: reqRow.title,
    description: reqRow.description,
    module: reqRow.module,
    priority: reqRow.priority,
    type: reqRow.type,
    stakeholders: reqRow.stakeholders,
    notes: reqRow.notes,
  };

  // مسار المهام الخفيفة: نفس الفحوصات والتسجيل، لكن بدون حفظ في المتطلب —
  // النتيجة ترجع للواجهة والمستخدم يقرر اعتمادها.
  if (task !== "full") {
    try {
      const { result, meta } = await runAssistantTask(reqInput, task, model);
      if (userId) {
        await consumeQuota(userId);
        await logAiUsage({
          userId,
          projectId: reqRow.projectId,
          requirementId: id,
          modelUsed: meta.model,
          inputTokens: meta.inputTokens,
          outputTokens: meta.outputTokens,
          status: "SUCCESS",
        });
      }
      return NextResponse.json({ ok: true, task, result });
    } catch (err) {
      console.error("[/api/analyze-requirement task]", err);
      if (userId) {
        await logAiUsage({
          userId,
          projectId: reqRow.projectId,
          requirementId: id,
          modelUsed: model,
          status: "FAILED",
          errorMessage: String(err).slice(0, 300),
        });
      }
      return NextResponse.json({ ok: false, error: "failed" });
    }
  }

  try {
    const { result: analysis, meta } = await analyzeRequirement(reqInput, model);

    // Persist: store the rich analysis, set confidence, and regenerate the
    // AI-authored criteria + questions (preserving any manual ones).
    await prisma.$transaction(async (tx) => {
      await tx.acceptanceCriterion.deleteMany({ where: { requirementId: id, ai: true } });
      await tx.openQuestion.deleteMany({ where: { requirementId: id, ai: true } });

      let order = 0;
      for (const text of analysis.acceptanceCriteria) {
        await tx.acceptanceCriterion.create({
          data: {
            id: `AC-${randomUUID().slice(0, 8)}`,
            ownerId: reqRow.ownerId,
            projectId: reqRow.projectId,
            requirementId: id,
            text,
            done: false,
            ai: true,
            order: order++,
          },
        });
      }
      order = 0;
      const to = reqRow.stakeholders[0] ?? "أصحاب المصلحة";
      for (const text of analysis.stakeholderQuestions) {
        await tx.openQuestion.create({
          data: {
            id: `Q-${randomUUID().slice(0, 8)}`,
            ownerId: reqRow.ownerId,
            projectId: reqRow.projectId,
            requirementId: id,
            text,
            to,
            ai: true,
            answer: null,
            order: order++,
          },
        });
      }

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
          ownerId: reqRow.ownerId,
          projectId: reqRow.projectId,
          requirementId: id,
          action: "requirement_analyzed",
          detail: `تحليل جودة المتطلب «${reqRow.title}» — الدرجة ${analysis.qualityScore}٪.`,
          actor: "وثّق",
        },
      });
    });

    // Count against the user's quota + log usage.
    if (userId) {
      await consumeQuota(userId);
      await logAiUsage({
        userId,
        projectId: reqRow.projectId,
        requirementId: id,
        modelUsed: meta.model,
        inputTokens: meta.inputTokens,
        outputTokens: meta.outputTokens,
        status: "SUCCESS",
      });
    }

    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    console.error("[/api/analyze-requirement]", err);
    if (userId) {
      await logAiUsage({
        userId,
        projectId: reqRow.projectId,
        requirementId: id,
        modelUsed: model,
        status: "FAILED",
        errorMessage: String(err).slice(0, 300),
      });
    }
    return NextResponse.json({ ok: false, error: "failed" });
  }
}

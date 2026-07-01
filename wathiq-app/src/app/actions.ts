"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma, hasDatabase } from "@/lib/db";
import type { RequirementStatus, PriorityLevel } from "@/components/ds";

/** Human-facing status labels, for audit-log messages. */
const STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  analyzing: "قيد التحليل",
  review: "قيد المراجعة",
  needs_info: "بحاجة لمعلومات",
  approved: "معتمد",
  blocked: "محظور",
};

/**
 * Append an audit-trail entry. Best-effort: a logging failure must never
 * fail the surrounding action, so everything is wrapped and swallowed.
 */
async function logAudit(
  requirementId: string | null,
  action: string,
  detail: string,
  actor = "سارة العتيبي"
): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: { requirementId, action, detail, actor },
    });
  } catch (err) {
    console.warn("[logAudit] skipped:", err);
  }
}

export interface RequirementInput {
  id: string;
  title: string;
  description: string;
  status: RequirementStatus;
  priority: PriorityLevel;
  confidence: number | null;
  criteria: number;
  openQuestions: number;
  module: string;
  stakeholders: string[];
}

export type ActionResult = { ok: true } | { ok: false; error: string };

function clean(input: RequirementInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
    confidence:
      input.confidence == null || Number.isNaN(input.confidence)
        ? null
        : Math.max(0, Math.min(100, Math.round(input.confidence))),
    criteria: Math.max(0, Math.round(input.criteria) || 0),
    openQuestions: Math.max(0, Math.round(input.openQuestions) || 0),
    module: input.module.trim(),
    stakeholders: input.stakeholders.map((s) => s.trim()).filter(Boolean),
  };
}

/** Create a new requirement, or update an existing one when originalId is given. */
export async function saveRequirement(
  input: RequirementInput,
  originalId?: string
): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };

  const id = input.id.trim();
  if (!id) return { ok: false, error: "missing-id" };
  if (!input.title.trim()) return { ok: false, error: "missing-title" };

  try {
    const data = clean(input);

    if (originalId) {
      await prisma.requirement.update({ where: { id: originalId }, data });
      await logAudit(originalId, "requirement_updated", `تعديل المتطلب «${data.title}».`);
    } else {
      const exists = await prisma.requirement.findUnique({ where: { id } });
      if (exists) return { ok: false, error: "duplicate-id" };
      const max = await prisma.requirement.aggregate({ _max: { order: true } });
      await prisma.requirement.create({
        data: { id, ...data, order: (max._max.order ?? -1) + 1 },
      });
      await logAudit(id, "requirement_created", `إنشاء المتطلب «${data.title}».`);
    }

    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[saveRequirement]", err);
    return { ok: false, error: "server" };
  }
}

export interface SaveManyResult {
  ok: boolean;
  error?: string;
  saved?: number;
  skipped?: number;
}

/** Bulk-insert AI-extracted requirements, skipping IDs that already exist. */
export async function saveExtractedRequirements(
  inputs: RequirementInput[]
): Promise<SaveManyResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  if (!inputs.length) return { ok: false, error: "empty" };

  try {
    const max = await prisma.requirement.aggregate({ _max: { order: true } });
    let order = (max._max.order ?? -1) + 1;
    let saved = 0;
    let skipped = 0;

    for (const input of inputs) {
      const id = input.id.trim();
      if (!id || !input.title.trim()) {
        skipped++;
        continue;
      }
      const exists = await prisma.requirement.findUnique({ where: { id } });
      if (exists) {
        skipped++;
        continue;
      }
      await prisma.requirement.create({
        data: { id, ...clean(input), order: order++ },
      });
      saved++;
    }

    if (saved > 0) {
      await logAudit(null, "requirements_imported", `استيراد ${saved} متطلبًا من تحليل وثّق.`, "وثّق");
    }
    revalidatePath("/");
    return { ok: true, saved, skipped };
  } catch (err) {
    console.error("[saveExtractedRequirements]", err);
    return { ok: false, error: "server" };
  }
}

/** Move a requirement to a new lifecycle status (approval workflow, etc.). */
export async function updateRequirementStatus(
  id: string,
  status: RequirementStatus
): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };

  const rid = id.trim();
  if (!rid) return { ok: false, error: "missing-id" };

  try {
    const req = await prisma.requirement.update({
      where: { id: rid },
      data: { status },
    });
    await logAudit(
      rid,
      "status_changed",
      `تغيير حالة «${req.title}» إلى «${STATUS_AR[status] ?? status}».`
    );
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[updateRequirementStatus]", err);
    return { ok: false, error: "server" };
  }
}

export type AddResult = { ok: true; id: string } | { ok: false; error: string };

/** Add a manually-authored acceptance criterion to a requirement. */
export async function addAcceptanceCriterion(
  requirementId: string,
  text: string
): Promise<AddResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };

  const rid = requirementId.trim();
  const body = text.trim();
  if (!rid) return { ok: false, error: "missing-id" };
  if (body.length < 3) return { ok: false, error: "too-short" };

  try {
    const id = `AC-${randomUUID().slice(0, 8)}`;
    const max = await prisma.acceptanceCriterion.aggregate({
      where: { requirementId: rid },
      _max: { order: true },
    });
    await prisma.acceptanceCriterion.create({
      data: {
        id,
        requirementId: rid,
        text: body,
        done: false,
        ai: false,
        order: (max._max.order ?? -1) + 1,
      },
    });
    // Keep the requirement's summary count in sync.
    await prisma.requirement.update({
      where: { id: rid },
      data: { criteria: { increment: 1 } },
    });
    await logAudit(rid, "criterion_added", `إضافة معيار قبول: «${body}».`);
    revalidatePath("/");
    return { ok: true, id };
  } catch (err) {
    console.error("[addAcceptanceCriterion]", err);
    return { ok: false, error: "server" };
  }
}

/** Toggle an acceptance criterion's done state. */
export async function toggleAcceptanceCriterion(
  id: string,
  done: boolean
): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  try {
    const c = await prisma.acceptanceCriterion.update({
      where: { id },
      data: { done },
    });
    await logAudit(
      c.requirementId,
      "criterion_toggled",
      `${done ? "إنجاز" : "إعادة فتح"} معيار القبول: «${c.text}».`
    );
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[toggleAcceptanceCriterion]", err);
    return { ok: false, error: "server" };
  }
}

/** Record the answer to an open question. */
export async function answerOpenQuestion(
  id: string,
  answer: string
): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };

  const body = answer.trim();
  if (body.length < 2) return { ok: false, error: "too-short" };

  try {
    const q = await prisma.openQuestion.update({
      where: { id },
      data: { answer: body },
    });
    await logAudit(
      q.requirementId,
      "question_answered",
      `الإجابة عن سؤال مفتوح: «${q.text}».`
    );
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[answerOpenQuestion]", err);
    return { ok: false, error: "server" };
  }
}

export async function deleteRequirement(id: string): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  try {
    const req = await prisma.requirement.delete({ where: { id } });
    await logAudit(null, "requirement_deleted", `حذف المتطلب «${req.title}» (${id}).`);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[deleteRequirement]", err);
    return { ok: false, error: "server" };
  }
}

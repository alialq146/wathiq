"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma, hasDatabase } from "@/lib/db";
import { getSessionUser, getActiveProjectId, PROJECT_COOKIE } from "@/lib/session";
import { authEnabled } from "@/lib/auth";
import { projectLimitFor } from "@/lib/plans";
import type { RequirementStatus, PriorityLevel } from "@/components/ds";

export interface RequirementInput {
  id: string;
  title: string;
  description: string;
  status: RequirementStatus;
  priority: PriorityLevel;
  type?: string | null;
  confidence: number | null;
  criteria: number;
  openQuestions: number;
  module: string;
  stakeholders: string[];
  notes?: string | null;
  source?: string | null;
  assignee?: string | null;
  version?: number | null;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Human-facing status labels, for audit-log messages. */
const STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  analyzing: "قيد التحليل",
  review: "قيد المراجعة",
  needs_info: "بحاجة لمعلومات",
  approved: "معتمد",
  blocked: "محظور",
};

const PRIORITY_AR: Record<string, string> = {
  critical: "حرجة",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

/* ---------------- session helpers ---------------- */

interface Actor {
  /** null when auth is disabled (open mode) — rows stay shared. */
  uid: string | null;
  name: string;
}

/**
 * Resolve the acting user, or null when the request is unauthenticated in a
 * mode that requires sign-in. Because the landing page makes "/" public, a
 * server action could be reached without a session — so mutations must deny
 * that case instead of silently acting as the shared/demo actor.
 */
// حارس كل Server Action: يقرأ الجلسة في الخادم ويرفض أي طلب غير مصادَق
// عند تفعيل الحسابات — لا يُتخذ أي قرار أمني في الواجهة.
async function requireActor(): Promise<Actor | null> {
  const user = await getSessionUser();
  if (user && user.uid !== "owner") return { uid: user.uid, name: user.name };
  if (user) return { uid: null, name: user.name || "المالك" }; // legacy owner mode
  if (authEnabled()) return null; // sign-in required but not signed in → deny
  return { uid: null, name: "سارة العتيبي" }; // open mode (demo persona)
}

/**
 * Ownership filter for mutations: a user may only touch their own rows; in
 * open/owner mode (uid null) everything is reachable (single-tenant).
 */
// شرط الملكية المُلحق بكل استعلام كتابة/قراءة حساس — يضمن عزل بيانات كل مستخدم.
function ownedBy(uid: string | null) {
  return uid ? { ownerId: uid } : {};
}

/**
 * Append an audit-trail entry. Best-effort: a logging failure must never
 * fail the surrounding action, so everything is wrapped and swallowed.
 */
async function logAudit(
  actor: Actor,
  requirementId: string | null,
  action: string,
  detail: string,
  actorNameOverride?: string,
  projectId?: string | null
): Promise<void> {
  try {
    // If a project wasn't supplied, attribute to the active one.
    const pid = projectId !== undefined ? projectId : await activeProjectId(actor.uid);
    await prisma.auditEvent.create({
      data: {
        ownerId: actor.uid,
        projectId: pid,
        requirementId,
        action,
        detail,
        actor: actorNameOverride ?? actor.name,
      },
    });
  } catch (err) {
    console.warn("[logAudit] skipped:", err);
  }
}

/* ---------------- requirements ---------------- */

function clean(input: RequirementInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
    type: input.type?.trim() || null,
    confidence:
      input.confidence == null || Number.isNaN(input.confidence)
        ? null
        : Math.max(0, Math.min(100, Math.round(input.confidence))),
    criteria: Math.max(0, Math.round(input.criteria) || 0),
    openQuestions: Math.max(0, Math.round(input.openQuestions) || 0),
    module: input.module.trim(),
    stakeholders: input.stakeholders.map((s) => s.trim()).filter(Boolean),
    notes: input.notes?.trim() || null,
    source: input.source?.trim() || null,
    assignee: input.assignee?.trim() || null,
    // الإصدار رقم بسيط يتحكم فيه المستخدم — لا يقل عن 1.
    version: Math.max(1, Math.round(Number(input.version)) || 1),
  };
}

/**
 * Resolve the acting user's active project id (validated to belong to them),
 * falling back to their first project. Null in open/owner mode.
 */
async function activeProjectId(uid: string | null): Promise<string | null> {
  if (!uid) return null;
  const cookieId = await getActiveProjectId();
  if (cookieId) {
    const p = await prisma.project.findFirst({
      where: { id: cookieId, ownerId: uid },
      select: { id: true },
    });
    if (p) return p.id;
  }
  const first = await prisma.project.findFirst({
    where: { ownerId: uid },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  return first?.id ?? null;
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
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    const data = clean(input);

    if (originalId) {
      // Ownership-checked update.
      const target = await prisma.requirement.findFirst({
        where: { id: originalId, ...ownedBy(actor.uid) },
      });
      if (!target) return { ok: false, error: "not-found" };

      // سجل التغييرات: نقارن الحقول المهمة ونكتب وصفًا مفهومًا لكل تغيير،
      // مع رفع الإصدار تلقائيًا عند تغيّر المحتوى إن لم يرفعه المستخدم بنفسه.
      const changes: string[] = [];
      if (target.status !== data.status)
        changes.push(`تم تغيير الحالة من «${STATUS_AR[target.status] ?? target.status}» إلى «${STATUS_AR[data.status] ?? data.status}»`);
      if (target.priority !== data.priority)
        changes.push(`تم تغيير الأولوية من «${PRIORITY_AR[target.priority] ?? target.priority}» إلى «${PRIORITY_AR[data.priority] ?? data.priority}»`);
      if (target.title !== data.title) changes.push("تم تعديل العنوان");
      if (target.description !== data.description) changes.push("تم تعديل الوصف");
      if ((target.notes ?? null) !== data.notes) changes.push("تم تعديل الملاحظات");
      if ((target.type ?? null) !== data.type) changes.push(`تم تغيير النوع إلى «${data.type ?? "غير محدد"}»`);
      if ((target.source ?? null) !== data.source) changes.push(`تم تغيير المصدر إلى «${data.source ?? "غير محدد"}»`);
      if ((target.assignee ?? null) !== data.assignee)
        changes.push(data.assignee ? `تم تعيين المسؤول: ${data.assignee}` : "تمت إزالة المسؤول");

      const contentChanged =
        target.title !== data.title || target.description !== data.description || (target.notes ?? null) !== data.notes;
      if (contentChanged && data.version === target.version) data.version = target.version + 1;
      if (data.version !== target.version) changes.push(`الإصدار: V${target.version} ← V${data.version}`);

      await prisma.requirement.update({ where: { id: originalId }, data });
      await logAudit(
        actor,
        originalId,
        "requirement_updated",
        changes.length ? changes.join("؛ ") + "." : `تعديل المتطلب «${data.title}».`
      );
    } else {
      const exists = await prisma.requirement.findUnique({ where: { id } });
      if (exists) return { ok: false, error: "duplicate-id" };
      const projectId = await activeProjectId(actor.uid);
      const max = await prisma.requirement.aggregate({ _max: { order: true } });
      await prisma.requirement.create({
        data: { id, ownerId: actor.uid, projectId, ...data, order: (max._max.order ?? -1) + 1 },
      });
      await logAudit(actor, id, "requirement_created", `إنشاء المتطلب «${data.title}».`, undefined, projectId);
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
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    const projectId = await activeProjectId(actor.uid);
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
        data: { id, ownerId: actor.uid, projectId, ...clean(input), order: order++ },
      });
      saved++;
    }

    if (saved > 0) {
      await logAudit(
        actor,
        null,
        "requirements_imported",
        `استيراد ${saved} متطلبًا من تحليل وثّق.`,
        "وثّق",
        projectId
      );
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
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    const target = await prisma.requirement.findFirst({
      where: { id: rid, ...ownedBy(actor.uid) },
    });
    if (!target) return { ok: false, error: "not-found" };

    await prisma.requirement.update({ where: { id: rid }, data: { status } });
    await logAudit(
      actor,
      rid,
      "status_changed",
      `تغيير حالة «${target.title}» إلى «${STATUS_AR[status] ?? status}».`
    );
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[updateRequirementStatus]", err);
    return { ok: false, error: "server" };
  }
}

export async function deleteRequirement(id: string): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  try {
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    const target = await prisma.requirement.findFirst({
      where: { id, ...ownedBy(actor.uid) },
    });
    if (!target) return { ok: false, error: "not-found" };

    await prisma.requirement.delete({ where: { id } });
    await logAudit(actor, null, "requirement_deleted", `حذف المتطلب «${target.title}» (${id}).`);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[deleteRequirement]", err);
    return { ok: false, error: "server" };
  }
}

/* ---------------- criteria & questions ---------------- */

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
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    // The parent requirement must be visible to this user.
    const parent = await prisma.requirement.findFirst({
      where: { id: rid, ...ownedBy(actor.uid) },
    });
    if (!parent) return { ok: false, error: "not-found" };

    const id = `AC-${randomUUID().slice(0, 8)}`;
    const max = await prisma.acceptanceCriterion.aggregate({
      where: { requirementId: rid },
      _max: { order: true },
    });
    await prisma.acceptanceCriterion.create({
      data: {
        id,
        ownerId: actor.uid,
        projectId: parent.projectId,
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
    await logAudit(actor, rid, "criterion_added", `إضافة معيار قبول: «${body}».`);
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
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    const target = await prisma.acceptanceCriterion.findFirst({
      where: { id, ...ownedBy(actor.uid) },
    });
    if (!target) return { ok: false, error: "not-found" };

    await prisma.acceptanceCriterion.update({ where: { id }, data: { done } });
    await logAudit(
      actor,
      target.requirementId,
      "criterion_toggled",
      `${done ? "إنجاز" : "إعادة فتح"} معيار القبول: «${target.text}».`
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
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    const target = await prisma.openQuestion.findFirst({
      where: { id, ...ownedBy(actor.uid) },
    });
    if (!target) return { ok: false, error: "not-found" };

    await prisma.openQuestion.update({ where: { id }, data: { answer: body } });
    await logAudit(
      actor,
      target.requirementId,
      "question_answered",
      `الإجابة عن سؤال مفتوح: «${target.text}».`
    );
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[answerOpenQuestion]", err);
    return { ok: false, error: "server" };
  }
}

/* ---------------- projects (axis 3) ---------------- */

export interface ProjectInput {
  name: string;
  code: string;
  description: string;
  domain: string;
  client: string;
  status: string; // draft | active | completed
  color: string;
  icon: string;
}

/** Create a project — plan-gated (FREE = one project). */
/** إضافة سؤال مفتوح (يدويًا أو باعتماد اقتراح من مساعد وثّق). */
export async function addOpenQuestion(
  requirementId: string,
  text: string,
  to?: string
): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  const rid = requirementId.trim();
  const body = text.trim();
  if (!rid || body.length < 3) return { ok: false, error: "too-short" };
  try {
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    // شرط الملكية: لا يضاف سؤال إلا لمتطلب يملكه المستخدم.
    const target = await prisma.requirement.findFirst({ where: { id: rid, ...ownedBy(actor.uid) } });
    if (!target) return { ok: false, error: "not-found" };
    const max = await prisma.openQuestion.aggregate({ _max: { order: true }, where: { requirementId: rid } });
    await prisma.openQuestion.create({
      data: {
        id: `Q-${randomUUID().slice(0, 8)}`,
        ownerId: target.ownerId,
        projectId: target.projectId,
        requirementId: rid,
        text: body,
        to: to?.trim() || target.stakeholders[0] || "أصحاب المصلحة",
        ai: true,
        answer: null,
        order: (max._max.order ?? -1) + 1,
      },
    });
    await prisma.requirement.update({
      where: { id: rid },
      data: { openQuestions: await prisma.openQuestion.count({ where: { requirementId: rid } }) },
    });
    await logAudit(actor, rid, "question_added", `إضافة سؤال مفتوح: «${body.slice(0, 80)}».`);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[addOpenQuestion]", err);
    return { ok: false, error: "server" };
  }
}

/** إلحاق نص بملاحظات المتطلب (يستخدمه المساعد لحفظ نتيجة كملاحظة). */
export async function appendRequirementNote(id: string, text: string): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  const body = text.trim();
  if (!id.trim() || body.length < 3) return { ok: false, error: "too-short" };
  try {
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    const target = await prisma.requirement.findFirst({ where: { id, ...ownedBy(actor.uid) } });
    if (!target) return { ok: false, error: "not-found" };
    const notes = target.notes ? `${target.notes}\n\n${body}` : body;
    await prisma.requirement.update({ where: { id }, data: { notes } });
    await logAudit(actor, id, "requirement_updated", "تمت إضافة ملاحظة من مساعد وثّق.");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[appendRequirementNote]", err);
    return { ok: false, error: "server" };
  }
}

export async function createProject(input: ProjectInput): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  const actor = await requireActor();
  if (!actor || !actor.uid) return { ok: false, error: "unauthorized" };

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "missing-name" };

  try {
    // Plan gate.
    const user = await prisma.user.findUnique({ where: { id: actor.uid }, select: { plan: true } });
    const limit = projectLimitFor(user?.plan);
    const count = await prisma.project.count({ where: { ownerId: actor.uid } });
    if (limit != null && count >= limit) return { ok: false, error: "plan-limit" };

    const code = input.code.trim() || `PRJ-${String(count + 1).padStart(4, "0")}`;
    const status = ["draft", "active", "completed"].includes(input.status) ? input.status : "active";

    const project = await prisma.project.create({
      data: {
        ownerId: actor.uid,
        name,
        code,
        description: input.description.trim() || null,
        domain: input.domain.trim() || null,
        client: input.client.trim() || null,
        status,
        color: input.color.trim() || null,
        icon: input.icon.trim() || null,
        order: count,
      },
    });

    // Switch to the new project immediately.
    const store = await cookies();
    store.set(PROJECT_COOKIE, project.id, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });

    await logAudit(actor, null, "project_created", `إنشاء مشروع «${name}».`, undefined, project.id);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[createProject]", err);
    return { ok: false, error: "server" };
  }
}

/** Update an existing project's fields. */
export async function updateProject(id: string, input: ProjectInput): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  const actor = await requireActor();
  if (!actor || !actor.uid) return { ok: false, error: "unauthorized" };
  if (input.name.trim().length < 2) return { ok: false, error: "missing-name" };

  try {
    const target = await prisma.project.findFirst({ where: { id, ownerId: actor.uid } });
    if (!target) return { ok: false, error: "not-found" };
    const status = ["draft", "active", "completed"].includes(input.status) ? input.status : target.status;
    await prisma.project.update({
      where: { id },
      data: {
        name: input.name.trim(),
        code: input.code.trim() || target.code,
        description: input.description.trim() || null,
        domain: input.domain.trim() || null,
        client: input.client.trim() || null,
        status,
        color: input.color.trim() || null,
        icon: input.icon.trim() || null,
      },
    });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[updateProject]", err);
    return { ok: false, error: "server" };
  }
}

/** Switch the active project (stored in a cookie). */
export async function setActiveProject(id: string): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  const actor = await requireActor();
  if (!actor || !actor.uid) return { ok: false, error: "unauthorized" };
  try {
    const p = await prisma.project.findFirst({ where: { id, ownerId: actor.uid }, select: { id: true } });
    if (!p) return { ok: false, error: "not-found" };
    const store = await cookies();
    store.set(PROJECT_COOKIE, id, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[setActiveProject]", err);
    return { ok: false, error: "server" };
  }
}

/** Adopt an AI-improved requirement description. */
export async function applyImprovedRequirement(id: string, description: string): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  const body = description.trim();
  if (body.length < 3) return { ok: false, error: "too-short" };
  try {
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    const target = await prisma.requirement.findFirst({ where: { id, ...ownedBy(actor.uid) } });
    if (!target) return { ok: false, error: "not-found" };
    await prisma.requirement.update({ where: { id }, data: { description: body } });
    await logAudit(actor, id, "requirement_improved", `اعتماد صياغة محسّنة للمتطلب «${target.title}».`);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[applyImprovedRequirement]", err);
    return { ok: false, error: "server" };
  }
}

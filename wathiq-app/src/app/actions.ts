"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma, hasDatabase } from "@/lib/db";
import { getSessionUser, getActiveProjectId, PROJECT_COOKIE } from "@/lib/session";
import { authEnabled } from "@/lib/auth";
import { isAccountActive } from "@/lib/account";
import { arReqCount } from "@/lib/arabic";
import { trackEvent, type ProductEventName } from "@/lib/track";
import { resolvedProjectLimitFor, getFeatureSettings, getReadinessSettings } from "@/lib/settings";
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
  moduleId?: string | null;
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
  if (user && user.uid !== "owner") {
    // أمان: الجلسة وحدها لا تكفي — الحساب يجب أن يكون موجودًا وفعالًا
    // (ACTIVE). المحذوف/المعطَّل يُرفض مركزيًا في كل Server Action.
    if (!(await isAccountActive(user.uid))) return null;
    return { uid: user.uid, name: user.name };
  }
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
    moduleId: input.moduleId?.trim() || null,
  };
}

/**
 * أمان (حرج): moduleId من العميل لا يُقبل إلا إذا كانت الوحدة مملوكة لنفس
 * المستخدم وضمن نفس المشروع المستهدف — لا ربط بوحدة مشروع آخر أبدًا.
 * ترجع moduleId الصالح أو null (التنظيف الصامت أفضل من رفض الحفظ كله).
 */
async function validModuleId(
  moduleId: string | null,
  uid: string | null,
  projectId: string | null
): Promise<string | null> {
  if (!moduleId) return null;
  const mod = await prisma.projectModule.findFirst({
    where: { id: moduleId, ...(uid ? { ownerId: uid } : {}), ...(projectId ? { projectId } : {}) },
    select: { id: true },
  });
  return mod ? mod.id : null;
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

      // أمان: الوحدة تُقبل فقط إذا كانت للمستخدم نفسه وفي نفس مشروع المتطلب.
      data.moduleId = await validModuleId(data.moduleId, actor.uid, target.projectId);
      if ((target.moduleId ?? null) !== data.moduleId)
        changes.push(data.moduleId ? "تم تغيير وحدة المتطلب" : "أُزيل ربط المتطلب بالوحدة");

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
      await trackEvent({ eventName: "requirement_updated", userId: actor.uid, projectId: target.projectId, requirementId: originalId, metadata: { changes: changes.length } });
    } else {
      const exists = await prisma.requirement.findUnique({ where: { id } });
      if (exists) return { ok: false, error: "duplicate-id" };
      const projectId = await activeProjectId(actor.uid);
      // أمان: الوحدة تُقبل فقط إذا كانت للمستخدم نفسه وفي المشروع النشط.
      data.moduleId = await validModuleId(data.moduleId, actor.uid, projectId);
      // الترتيب داخل نطاق المستخدم/المشروع نفسه — لا معنى (ولا داعي) لقيمة عالمية.
      const max = await prisma.requirement.aggregate({ _max: { order: true }, where: { ...ownedBy(actor.uid), ...(projectId ? { projectId } : {}) } });
      await prisma.requirement.create({
        data: { id, ownerId: actor.uid, projectId, ...data, order: (max._max.order ?? -1) + 1 },
      });
      await logAudit(actor, id, "requirement_created", `إنشاء المتطلب «${data.title}».`, undefined, projectId);
      await trackEvent({ eventName: "requirement_created", userId: actor.uid, projectId, requirementId: id, metadata: { type: data.type ?? null, hasModule: Boolean(data.moduleId) } });
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
        // moduleId يُصفَّر في الاستيراد الجماعي — الربط بالوحدات قرار يدوي لاحق.
        data: { id, ownerId: actor.uid, projectId, ...clean(input), moduleId: null, order: order++ },
      });
      saved++;
    }

    if (saved > 0) {
      await logAudit(
        actor,
        null,
        "requirements_imported",
        `استيراد ${arReqCount(saved)} من تحليل وثّق.`,
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
  /** v2.3: الوثائق والمخرجات — غيابها = الافتراضي من إعدادات النظام. */
  brdApplicability?: string;
  srsApplicability?: string;
}

const DOC_APPLICABILITIES = ["REQUIRED", "OPTIONAL", "NOT_APPLICABLE"] as const;
const docApp = (v: unknown, dflt: string): string =>
  typeof v === "string" && (DOC_APPLICABILITIES as readonly string[]).includes(v) ? v : dflt;

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
    const limit = await resolvedProjectLimitFor(user?.plan);
    const count = await prisma.project.count({ where: { ownerId: actor.uid } });
    if (limit != null && count >= limit) return { ok: false, error: "plan-limit" };

    const code = input.code.trim() || `PRJ-${String(count + 1).padStart(4, "0")}`;
    const status = ["draft", "active", "completed"].includes(input.status) ? input.status : "active";

    // v2.3: الوثائق والمخرجات — اختيار المستخدم أو الافتراضي من إعدادات النظام.
    const readinessCfg = await getReadinessSettings();
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
        brdApplicability: docApp(input.brdApplicability, readinessCfg.defaultBrdApplicability),
        srsApplicability: docApp(input.srsApplicability, readinessCfg.defaultSrsApplicability),
      },
    });

    // Switch to the new project immediately.
    const store = await cookies();
    store.set(PROJECT_COOKIE, project.id, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });

    await logAudit(actor, null, "project_created", `إنشاء مشروع «${name}».`, undefined, project.id);
    await trackEvent({ eventName: "project_created", userId: actor.uid, projectId: project.id });
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
        // v2.3: الوثائق والمخرجات — إخفاء منطقي فقط، لا حذف بيانات أبدًا.
        brdApplicability: docApp(input.brdApplicability, target.brdApplicability),
        srsApplicability: docApp(input.srsApplicability, target.srsApplicability),
      },
    });
    const brdNew = docApp(input.brdApplicability, target.brdApplicability);
    const srsNew = docApp(input.srsApplicability, target.srsApplicability);
    if (brdNew !== target.brdApplicability || srsNew !== target.srsApplicability) {
      await trackEvent({ eventName: "document_applicability_changed", userId: actor.uid, projectId: id, metadata: { brd: brdNew, srs: srsNew } });
    }
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

/* ---------------- project context & modules (v1.9.9) ---------------- */

export interface ProjectContextInput {
  projectIdea?: string | null;
  projectGoal?: string | null;
  targetUsers?: string | null;
  projectScope?: string | null;
  outOfScope?: string | null;
  relatedSystems?: string | null;
  constraints?: string | null;
}

const ctxField = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return t ? t.slice(0, 2000) : null; // حد آمن لكل حقل سياق
};

/** حفظ سياق المشروع — اختياري بالكامل؛ الحقول الفارغة تبقى null. */
export async function saveProjectContext(
  projectId: string,
  input: ProjectContextInput
): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  try {
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    // أمان: لا تعديل لسياق مشروع لا يملكه المستخدم.
    const project = await prisma.project.findFirst({ where: { id: projectId, ...ownedBy(actor.uid) }, select: { id: true } });
    if (!project) return { ok: false, error: "not-found" };

    await prisma.project.update({
      where: { id: project.id },
      data: {
        projectIdea: ctxField(input.projectIdea),
        projectGoal: ctxField(input.projectGoal),
        targetUsers: ctxField(input.targetUsers),
        projectScope: ctxField(input.projectScope),
        outOfScope: ctxField(input.outOfScope),
        relatedSystems: ctxField(input.relatedSystems),
        constraints: ctxField(input.constraints),
      },
    });
    await logAudit(actor, null, "project_context_updated", "تحديث سياق المشروع.", undefined, project.id);
    await trackEvent({ eventName: "project_context_updated", userId: actor.uid, projectId: project.id });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[saveProjectContext]", err);
    return { ok: false, error: "server" };
  }
}

/** إنشاء وحدة مشروع — اسم إلزامي ووصف اختياري. */
export async function createProjectModule(
  projectId: string,
  name: string,
  description?: string | null
): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  const cleanName = name.trim();
  if (!cleanName) return { ok: false, error: "missing-name" };
  try {
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    // أمان: الوحدة تُنشأ فقط داخل مشروع يملكه المستخدم.
    const project = await prisma.project.findFirst({ where: { id: projectId, ...ownedBy(actor.uid) }, select: { id: true } });
    if (!project) return { ok: false, error: "not-found" };

    const max = await prisma.projectModule.aggregate({ where: { projectId: project.id }, _max: { order: true } });
    await prisma.projectModule.create({
      data: {
        ownerId: actor.uid,
        projectId: project.id,
        name: cleanName.slice(0, 120),
        description: description?.trim() ? description.trim().slice(0, 600) : null,
        order: (max._max.order ?? -1) + 1,
      },
    });
    await logAudit(actor, null, "module_created", `إضافة وحدة «${cleanName}».`, undefined, project.id);
    await trackEvent({ eventName: "module_created", userId: actor.uid, projectId: project.id });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[createProjectModule]", err);
    return { ok: false, error: "server" };
  }
}

/** تعديل وحدة مشروع (ملكية إلزامية). */
export async function updateProjectModule(
  moduleId: string,
  name: string,
  description?: string | null
): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  const cleanName = name.trim();
  if (!cleanName) return { ok: false, error: "missing-name" };
  try {
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    const mod = await prisma.projectModule.findFirst({ where: { id: moduleId, ...ownedBy(actor.uid) } });
    if (!mod) return { ok: false, error: "not-found" };

    await prisma.projectModule.update({
      where: { id: mod.id },
      data: { name: cleanName.slice(0, 120), description: description?.trim() ? description.trim().slice(0, 600) : null },
    });
    await logAudit(actor, null, "module_updated", `تعديل الوحدة «${cleanName}».`, undefined, mod.projectId);
    await trackEvent({ eventName: "module_updated", userId: actor.uid, projectId: mod.projectId });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[updateProjectModule]", err);
    return { ok: false, error: "server" };
  }
}

/** حذف وحدة — يُمنع إذا كانت مرتبطة بمتطلبات (انقلها أولًا). */
export async function deleteProjectModule(moduleId: string): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  try {
    const actor = await requireActor();
    if (!actor) return { ok: false, error: "unauthorized" };
    const mod = await prisma.projectModule.findFirst({ where: { id: moduleId, ...ownedBy(actor.uid) } });
    if (!mod) return { ok: false, error: "not-found" };

    const linked = await prisma.requirement.count({ where: { moduleId: mod.id } });
    if (linked > 0) return { ok: false, error: "module-linked" };

    await prisma.projectModule.delete({ where: { id: mod.id } });
    await logAudit(actor, null, "module_deleted", `حذف الوحدة «${mod.name}».`, undefined, mod.projectId);
    await trackEvent({ eventName: "module_deleted", userId: actor.uid, projectId: mod.projectId });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[deleteProjectModule]", err);
    return { ok: false, error: "server" };
  }
}

/* ------------------------------------------------------------------
   ملاحظات المستخدمين (v1.9.11) — قناة تحسين ما بعد الإطلاق.
   ------------------------------------------------------------------ */

const FEEDBACK_TYPES = ["مشكلة", "اقتراح", "صعوبة في الاستخدام", "طلب ميزة", "أخرى"] as const;
const FEEDBACK_SEVERITIES = ["عادي", "مهم", "عاجل"] as const;

export interface FeedbackInput {
  type: string;
  severity: string;
  message: string;
  currentPath?: string | null;
  requirementId?: string | null;
}

/** إرسال ملاحظة من داخل المنصة — للمستخدم المسجل الفعال فقط. */
export async function submitFeedback(input: FeedbackInput): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  try {
    const actor = await requireActor();
    if (!actor || !actor.uid) return { ok: false, error: "unauthorized" };

    // v2.2: بوابة خاصية الملاحظات — الرفض من الخادم (الإخفاء في الواجهة ليس حماية).
    if (!(await getFeatureSettings()).feedbackEnabled) return { ok: false, error: "feature-disabled" };

    const message = (input.message ?? "").trim().slice(0, 2000);
    if (!message) return { ok: false, error: "empty-message" };
    const type = FEEDBACK_TYPES.includes(input.type as (typeof FEEDBACK_TYPES)[number]) ? input.type : "أخرى";
    const severity = FEEDBACK_SEVERITIES.includes(input.severity as (typeof FEEDBACK_SEVERITIES)[number])
      ? input.severity
      : "عادي";

    // سياق خفيف يُلتقط في الخادم: الخطة من الحساب، الوكيل من الترويسة —
    // لا نحفظ أسرارًا ولا محتوى صفحات.
    const [user, hdrs, projectId] = await Promise.all([
      prisma.user.findUnique({ where: { id: actor.uid }, select: { plan: true } }),
      headers(),
      getActiveProjectId(),
    ]);

    await prisma.userFeedback.create({
      data: {
        userId: actor.uid,
        type,
        severity,
        message,
        currentPath: input.currentPath ? input.currentPath.slice(0, 200) : null,
        projectId: projectId ?? null,
        requirementId: input.requirementId ? input.requirementId.slice(0, 60) : null,
        plan: user?.plan ?? null,
        userAgent: (hdrs.get("user-agent") ?? "").slice(0, 250) || null,
      },
    });

    await trackEvent({ eventName: "feedback_submitted", userId: actor.uid, plan: user?.plan, metadata: { type, severity } });
    return { ok: true };
  } catch (err) {
    console.error("[submitFeedback]", err);
    return { ok: false, error: "server" };
  }
}

/* ------------------------------------------------------------------
   أحداث من المتصفح (v1.9.11) — قائمة بيضاء صارمة: التصدير يجري في
   المتصفح (طباعة/Word) وزر الترقية رابط، فلا يمكن رصدهما في الخادم.
   ------------------------------------------------------------------ */

const CLIENT_EVENTS = [
  "export_report_created",
  "export_brd_created",
  "export_srs_created",
  "upgrade_clicked",
  "renewal_clicked",
  "invoice_downloaded",
] as const;

export async function trackClientEvent(
  eventName: string,
  metadata?: Record<string, string | number | boolean | null>
): Promise<void> {
  try {
    if (!CLIENT_EVENTS.includes(eventName as (typeof CLIENT_EVENTS)[number])) return;
    const actor = await requireActor();
    if (!actor || !actor.uid) return;
    const user = await prisma.user.findUnique({ where: { id: actor.uid }, select: { plan: true } });
    await trackEvent({
      eventName: eventName as ProductEventName,
      userId: actor.uid,
      plan: user?.plan,
      projectId: await getActiveProjectId(),
      metadata: metadata ?? null,
    });
  } catch {
    // الحدث ثانوي — لا يُظهر خطأ للمستخدم أبدًا.
  }
}

/* ------------------------------------------------------------------
   بيانات الفوترة (v2.0) — اختيارية بالكامل، تُستخدم كـ snapshot عند
   إصدار الفواتير المستقبلية. internalNote لا يُقبل من العميل أبدًا.
   ------------------------------------------------------------------ */

export interface BillingProfileInput {
  legalName?: string | null;
  organizationName?: string | null;
  taxNumber?: string | null;
  commercialRegistration?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  billingEmail?: string | null;
  phone?: string | null;
}

export async function saveBillingProfile(input: BillingProfileInput): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  try {
    const actor = await requireActor();
    if (!actor || !actor.uid) return { ok: false, error: "unauthorized" };
    const f = (v: string | null | undefined, max = 200) => {
      const t = (v ?? "").trim();
      return t ? t.slice(0, max) : null;
    };
    await prisma.customerBillingProfile.upsert({
      where: { userId: actor.uid },
      create: {
        userId: actor.uid,
        legalName: f(input.legalName),
        organizationName: f(input.organizationName),
        taxNumber: f(input.taxNumber, 50),
        commercialRegistration: f(input.commercialRegistration, 50),
        address: f(input.address, 300),
        city: f(input.city, 100),
        country: f(input.country, 100),
        billingEmail: f(input.billingEmail, 200),
        phone: f(input.phone, 30),
      },
      update: {
        legalName: f(input.legalName),
        organizationName: f(input.organizationName),
        taxNumber: f(input.taxNumber, 50),
        commercialRegistration: f(input.commercialRegistration, 50),
        address: f(input.address, 300),
        city: f(input.city, 100),
        country: f(input.country, 100),
        billingEmail: f(input.billingEmail, 200),
        phone: f(input.phone, 30),
      },
    });
    revalidatePath("/account/billing");
    return { ok: true };
  } catch (err) {
    console.error("[saveBillingProfile]", err);
    return { ok: false, error: "server" };
  }
}

/* ════════════════ مركز جاهزية المشروع والوثائق (v2.3) ════════════════ */

import {
  calculateProjectReadiness,
  checkDocumentExport,
  type ReadinessResult,
  type ExportCheck,
} from "@/lib/readiness";
import { getReadinessSettings as getReadinessCfg } from "@/lib/settings";

export interface ReadinessResponse {
  ok: boolean;
  error?: string;
  result?: ReadinessResult;
  /** true عند تقليم النتيجة حسب الخطة (FREE = ملخص). */
  limited?: boolean;
}

/**
 * جاهزية المشروع — حساب خادمي كامل (ملكية + خطة + إعدادات):
 * لا يستدعي أي ذكاء اصطناعي ولا يستهلك حصة المستخدم إطلاقًا.
 * FREE (حسب الإعدادات): الدرجة والملخص وعدد محدود من الملاحظات فقط.
 */
export async function getProjectReadiness(
  projectId: string,
  opts: { recalculate?: boolean } = {}
): Promise<ReadinessResponse> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  const actor = await requireActor();
  if (!actor || !actor.uid) return { ok: false, error: "unauthorized" };
  if (typeof projectId !== "string" || !projectId) return { ok: false, error: "bad-request" };

  const cfg = await getReadinessCfg();
  if (!cfg.enabled) return { ok: false, error: "feature-disabled" };

  const result = await calculateProjectReadiness(projectId, actor.uid, { snapshot: opts.recalculate === true });
  if (!result) return { ok: false, error: "not-found" };

  await trackEvent({
    eventName: opts.recalculate ? "readiness_recalculated" : "readiness_viewed",
    userId: actor.uid, projectId,
    metadata: { score: result.overallScore, critical: result.counts.critical },
  });

  // تقليم حسب الخطة — في الخادم لا الواجهة (لا يمكن تزويره من العميل).
  const user = await prisma.user.findUnique({ where: { id: actor.uid }, select: { plan: true } });
  const plan = (user?.plan === "PRO" || user?.plan === "ENTERPRISE" ? user.plan : "FREE") as "FREE" | "PRO" | "ENTERPRISE";
  if (cfg.planAccess[plan] === "summary") {
    return {
      ok: true,
      limited: true,
      result: {
        ...result,
        issues: result.issues.slice(0, cfg.freeMaxIssues),
        axes: result.axes.map((a) => ({ ...a, issues: [] })),
        documents: { brd: null, srs: null },
      },
    };
  }
  return { ok: true, result };
}

/** تغيير حالة وثائق المشروع (مطلوبة/اختيارية/غير مطلوبة) — لا حذف بيانات أبدًا. */
export async function updateProjectDocuments(
  projectId: string,
  input: { brdApplicability?: string; srsApplicability?: string }
): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  const actor = await requireActor();
  if (!actor || !actor.uid) return { ok: false, error: "unauthorized" };

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: actor.uid },
      select: { id: true, name: true, brdApplicability: true, srsApplicability: true },
    });
    if (!project) return { ok: false, error: "not-found" };

    const brd = docApp(input.brdApplicability, project.brdApplicability);
    const srs = docApp(input.srsApplicability, project.srsApplicability);
    if (brd === project.brdApplicability && srs === project.srsApplicability) return { ok: true };

    await prisma.project.update({ where: { id: project.id }, data: { brdApplicability: brd, srsApplicability: srs } });

    const AR: Record<string, string> = { REQUIRED: "مطلوبة", OPTIONAL: "اختيارية", NOT_APPLICABLE: "غير مطلوبة" };
    const changes: string[] = [];
    if (brd !== project.brdApplicability) changes.push(`BRD: ${AR[brd]}`);
    if (srs !== project.srsApplicability) changes.push(`SRS: ${AR[srs]}`);
    await logAudit(actor, null, "project_updated", `تحديث الوثائق والمخرجات — ${changes.join("، ")}.`, undefined, project.id);
    await trackEvent({
      eventName: "document_applicability_changed", userId: actor.uid, projectId: project.id,
      metadata: { brd, srs },
    });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[updateProjectDocuments]", err);
    return { ok: false, error: "server" };
  }
}

/**
 * فحص تصدير وثيقة (BRD/SRS) — خادمي بالكامل: قابلية التطبيق + السياسة +
 * الجاهزية. الوثيقة غير المطلوبة تُرفض هنا حتى لو تجاوز أحدهم إخفاء الزر.
 */
export async function checkDocumentExportAction(
  projectId: string,
  docType: string
): Promise<{ ok: boolean; error?: string; check?: ExportCheck }> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  const actor = await requireActor();
  if (!actor || !actor.uid) return { ok: false, error: "unauthorized" };
  if (docType !== "BRD" && docType !== "SRS") return { ok: false, error: "bad-request" };

  const check = await checkDocumentExport(projectId, actor.uid, docType);
  if (!check) return { ok: false, error: "not-found" };

  if (check.reason === "not-applicable") {
    await trackEvent({ eventName: "document_export_denied_na", userId: actor.uid, projectId, metadata: { docType } });
  } else if (check.reason === "blocked") {
    await trackEvent({ eventName: "document_export_blocked", userId: actor.uid, projectId, metadata: { docType, score: check.score, critical: check.criticalCount } });
    try {
      await prisma.readinessExportLog.create({
        data: { projectId, userId: actor.uid, documentType: docType, readinessScore: check.score, criticalIssuesCount: check.criticalCount, exportedWithWarnings: false, blocked: true },
      });
    } catch { /* سجل تتبعي */ }
  }
  return { ok: true, check };
}

/** تسجيل تصدير وثيقة تم فعليًا (مع أو بدون تحذيرات) — يُستدعى بعد التصدير. */
export async function logDocumentExportAction(
  projectId: string,
  docType: string,
  info: { withWarnings: boolean; score: number | null; criticalCount: number }
): Promise<ActionResult> {
  if (!hasDatabase()) return { ok: false, error: "no-db" };
  const actor = await requireActor();
  if (!actor || !actor.uid) return { ok: false, error: "unauthorized" };
  if (docType !== "BRD" && docType !== "SRS") return { ok: false, error: "bad-request" };

  try {
    const owned = await prisma.project.findFirst({ where: { id: projectId, ownerId: actor.uid }, select: { id: true } });
    if (!owned) return { ok: false, error: "not-found" };
    await prisma.readinessExportLog.create({
      data: {
        projectId, userId: actor.uid, documentType: docType,
        readinessScore: info.score, criticalIssuesCount: Math.max(0, Math.trunc(info.criticalCount)),
        exportedWithWarnings: info.withWarnings === true, blocked: false,
      },
    });
    if (info.withWarnings) {
      await trackEvent({ eventName: "document_export_warned", userId: actor.uid, projectId, metadata: { docType, score: info.score } });
    }
    return { ok: true };
  } catch (err) {
    console.error("[logDocumentExportAction]", err);
    return { ok: false, error: "server" };
  }
}

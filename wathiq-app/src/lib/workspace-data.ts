import { prisma, hasDatabase } from "./db";
import {
  REQUIREMENTS,
  ACCEPTANCE_CRITERIA,
  BUSINESS_RULES,
  OPEN_QUESTIONS,
  AUDIT_EVENTS,
  PROJECT as MOCK_PROJECT,
  type Requirement,
  type AcceptanceCriterion,
  type BusinessRule,
  type OpenQuestion,
  type AuditEvent,
  type Project,
  type RequirementAnalysis,
} from "./data";
import { analysisLimitFor } from "./plans";
import type { RequirementStatus, PriorityLevel } from "@/components/ds";

export interface UsageInfo {
  plan: string;
  analysisCount: number;
  analysisLimit: number | null; // null = unlimited/custom
  subscriptionStatus: string;
}

export interface WorkspaceData {
  requirements: Requirement[];
  acceptanceCriteria: AcceptanceCriterion[];
  businessRules: BusinessRule[];
  openQuestions: OpenQuestion[];
  auditEvents: AuditEvent[];
  projects: Project[];
  activeProject: Project | null;
  usage: UsageInfo | null;
  source: "database" | "fallback";
}

const FALLBACK_PROJECT: Project = {
  id: "mock",
  name: MOCK_PROJECT.name,
  code: MOCK_PROJECT.code,
  description: null,
  domain: null,
  client: null,
  status: "active",
  color: null,
  icon: MOCK_PROJECT.code,
};

const FALLBACK: WorkspaceData = {
  requirements: REQUIREMENTS,
  acceptanceCriteria: ACCEPTANCE_CRITERIA,
  businessRules: BUSINESS_RULES,
  openQuestions: OPEN_QUESTIONS,
  auditEvents: AUDIT_EVENTS,
  projects: [FALLBACK_PROJECT],
  activeProject: FALLBACK_PROJECT,
  usage: null,
  source: "fallback",
};

function toProject(p: {
  id: string; name: string; code: string; description: string | null;
  domain: string | null; client: string | null; status: string; color: string | null; icon: string | null;
}): Project {
  return {
    id: p.id, name: p.name, code: p.code, description: p.description,
    domain: p.domain, client: p.client, status: p.status, color: p.color, icon: p.icon,
  };
}

/**
 * Give a brand-new (or pre-projects) account a default project, and migrate
 * any orphan rows (created before projects existed) into it. Idempotent.
 */
async function ensureDefaultProject(userId: string): Promise<void> {
  const count = await prisma.project.count({ where: { ownerId: userId } });
  if (count > 0) return;
  const project = await prisma.project.create({
    data: { ownerId: userId, name: "مشروعي الأول", code: "PRJ-0001", status: "active", order: 0 },
  });
  // Adopt any of the user's rows that predate projects.
  const link = { where: { ownerId: userId, projectId: null }, data: { projectId: project.id } };
  await Promise.all([
    prisma.requirement.updateMany(link),
    prisma.acceptanceCriterion.updateMany(link),
    prisma.businessRule.updateMany(link),
    prisma.openQuestion.updateMany(link),
    prisma.auditEvent.updateMany(link),
  ]);
}

/**
 * Load the workspace for a user, scoped to the active project. Falls back to
 * in-code mock data when no database is configured (or, in open mode, when the
 * DB is empty), so the app always renders.
 */
export async function getWorkspaceData(
  userId?: string | null,
  projectId?: string | null
): Promise<WorkspaceData> {
  if (!hasDatabase()) return FALLBACK;

  try {
    // ---- open / owner mode (no scoped user): legacy demo behaviour ----
    if (!userId) {
      const requirements = await prisma.requirement.findMany({ orderBy: { order: "asc" } });
      if (requirements.length === 0) return FALLBACK;
      const [acceptanceCriteria, businessRules, openQuestions, auditEvents] = await Promise.all([
        prisma.acceptanceCriterion.findMany({ orderBy: { order: "asc" } }),
        prisma.businessRule.findMany({ orderBy: { order: "asc" } }),
        prisma.openQuestion.findMany({ orderBy: { order: "asc" } }),
        prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      ]);
      return {
        ...mapEntities(requirements, acceptanceCriteria, businessRules, openQuestions, auditEvents),
        projects: [FALLBACK_PROJECT],
        activeProject: FALLBACK_PROJECT,
        usage: null,
        source: "database",
      };
    }

    // ---- accounts mode: per-user, per-project ----
    await ensureDefaultProject(userId);

    const [projectsRaw, user] = await Promise.all([
      prisma.project.findMany({ where: { ownerId: userId }, orderBy: { order: "asc" } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, analysisCount: true, analysisLimit: true, subscriptionStatus: true, limitOverride: true },
      }),
    ]);
    const projects = projectsRaw.map(toProject);

    // Resolve the active project (cookie value → else first).
    const active =
      projects.find((p) => p.id === projectId) ?? projects[0] ?? null;

    const scope = active ? { ownerId: userId, projectId: active.id } : { ownerId: userId, projectId: "__none__" };

    const [requirements, acceptanceCriteria, businessRules, openQuestions, auditEvents] =
      await Promise.all([
        prisma.requirement.findMany({ where: scope, orderBy: { order: "asc" } }),
        prisma.acceptanceCriterion.findMany({ where: scope, orderBy: { order: "asc" } }),
        prisma.businessRule.findMany({ where: scope, orderBy: { order: "asc" } }),
        prisma.openQuestion.findMany({ where: scope, orderBy: { order: "asc" } }),
        prisma.auditEvent.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 200 }),
      ]);

    return {
      ...mapEntities(requirements, acceptanceCriteria, businessRules, openQuestions, auditEvents),
      projects,
      activeProject: active,
      usage: user
        ? {
            plan: user.plan,
            analysisCount: user.analysisCount,
            analysisLimit: user.limitOverride ? user.analysisLimit : analysisLimitFor(user.plan),
            subscriptionStatus: user.subscriptionStatus,
          }
        : null,
      source: "database",
    };
  } catch (err) {
    console.warn("[workspace-data] DB read failed, using fallback:", err);
    return FALLBACK;
  }
}

/* Map raw DB rows to the client shapes. */
function mapEntities(
  requirements: Array<Record<string, unknown>>,
  acceptanceCriteria: Array<Record<string, unknown>>,
  businessRules: Array<Record<string, unknown>>,
  openQuestions: Array<Record<string, unknown>>,
  auditEvents: Array<Record<string, unknown>>
) {
  return {
    requirements: requirements.map((r) => ({
      id: r.id as string,
      title: r.title as string,
      description: r.description as string,
      status: r.status as RequirementStatus,
      priority: r.priority as PriorityLevel,
      type: (r.type as string | null) ?? null,
      confidence: (r.confidence as number | null) ?? null,
      criteria: r.criteria as number,
      openQuestions: r.openQuestions as number,
      module: r.module as string,
      stakeholders: r.stakeholders as string[],
      notes: (r.notes as string | null) ?? null,
      projectId: (r.projectId as string | null) ?? null,
      analysis: (r.analysis as RequirementAnalysis | null) ?? null,
    })),
    acceptanceCriteria: acceptanceCriteria.map((c) => ({
      id: c.id as string,
      requirementId: (c.requirementId as string | null) ?? null,
      text: c.text as string,
      done: c.done as boolean,
      ai: c.ai as boolean,
    })),
    businessRules: businessRules.map((b) => ({
      id: b.id as string,
      requirementId: (b.requirementId as string | null) ?? null,
      text: b.text as string,
      source: b.source as string,
    })),
    openQuestions: openQuestions.map((q) => ({
      id: q.id as string,
      requirementId: (q.requirementId as string | null) ?? null,
      text: q.text as string,
      to: q.to as string,
      ai: q.ai as boolean,
      answer: (q.answer as string | null) ?? null,
    })),
    auditEvents: auditEvents.map((e) => ({
      id: e.id as string,
      requirementId: (e.requirementId as string | null) ?? null,
      action: e.action as string,
      detail: e.detail as string,
      actor: e.actor as string,
      createdAt: (e.createdAt as Date).toISOString(),
    })),
  };
}

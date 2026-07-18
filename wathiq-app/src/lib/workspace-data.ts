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
  type ProjectModule,
  type RequirementAnalysis,
} from "./data";
import { resolveEntitlements } from "@/lib/entitlements";
import { getCreditWallet } from "@/lib/ai-credits";
import type { RequirementStatus, PriorityLevel } from "@/components/ds";

/** ملخص رصيد نقاط الذكاء الاصطناعي للعرض (v2.6). */
export interface UsageInfo {
  plan: string;
  creditsUsed: number;
  creditsGranted: number;
  creditsBalance: number;
  periodEnd: string | null;
  subscriptionStatus: string;
}

/** يبني ملخّص الرصيد من المحفظة (بعد إعادة الضبط الكسولة) + الامتيازات. */
async function buildUsage(
  userId: string,
  plan: string,
  override: number | null,
  subscriptionStatus: string
): Promise<UsageInfo> {
  const ent = await resolveEntitlements({ plan, aiCreditsOverride: override });
  const wallet = await getCreditWallet(userId, ent.monthlyCredits, ent.dailyCreditLimit);
  return {
    plan,
    creditsUsed: wallet?.used ?? 0,
    creditsGranted: wallet?.granted ?? ent.monthlyCredits,
    creditsBalance: wallet?.balance ?? ent.monthlyCredits,
    periodEnd: wallet?.periodEnd ?? null,
    subscriptionStatus,
  };
}

export interface WorkspaceData {
  requirements: Requirement[];
  acceptanceCriteria: AcceptanceCriterion[];
  businessRules: BusinessRule[];
  openQuestions: OpenQuestion[];
  auditEvents: AuditEvent[];
  projects: Project[];
  activeProject: Project | null;
  /** وحدات المشروع النشط (قد تكون فارغة — الوحدات اختيارية). */
  modules: ProjectModule[];
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
  modules: [],
  usage: null,
  source: "fallback",
};

function toProject(p: {
  id: string; name: string; code: string; description: string | null;
  domain: string | null; client: string | null; status: string; color: string | null; icon: string | null;
  projectIdea?: string | null; projectGoal?: string | null; targetUsers?: string | null;
  projectScope?: string | null; outOfScope?: string | null; relatedSystems?: string | null;
  constraints?: string | null; brdApplicability?: string; srsApplicability?: string;
}): Project {
  return {
    id: p.id, name: p.name, code: p.code, description: p.description,
    domain: p.domain, client: p.client, status: p.status, color: p.color, icon: p.icon,
    projectIdea: p.projectIdea ?? null, projectGoal: p.projectGoal ?? null,
    targetUsers: p.targetUsers ?? null, projectScope: p.projectScope ?? null,
    outOfScope: p.outOfScope ?? null, relatedSystems: p.relatedSystems ?? null,
    constraints: p.constraints ?? null,
    brdApplicability: p.brdApplicability ?? "REQUIRED",
    srsApplicability: p.srsApplicability ?? "REQUIRED",
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
        modules: [],
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
        select: { plan: true, subscriptionStatus: true, aiCreditsOverride: true },
      }),
    ]);
    const projects = projectsRaw.map(toProject);

    // Resolve the active project (cookie value → else first).
    const active =
      projects.find((p) => p.id === projectId) ?? projects[0] ?? null;

    const scope = active ? { ownerId: userId, projectId: active.id } : { ownerId: userId, projectId: "__none__" };

    const [requirements, acceptanceCriteria, businessRules, openQuestions, auditEvents, modulesRaw] =
      await Promise.all([
        prisma.requirement.findMany({ where: scope, orderBy: { order: "asc" } }),
        prisma.acceptanceCriterion.findMany({ where: scope, orderBy: { order: "asc" } }),
        prisma.businessRule.findMany({ where: scope, orderBy: { order: "asc" } }),
        prisma.openQuestion.findMany({ where: scope, orderBy: { order: "asc" } }),
        prisma.auditEvent.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 200 }),
        // وحدات المشروع النشط — نفس نطاق الملكية (لا وحدات مستخدم آخر أبدًا).
        active
          ? prisma.projectModule.findMany({ where: { ownerId: userId, projectId: active.id }, orderBy: { order: "asc" } })
          : Promise.resolve([]),
      ]);

    return {
      ...mapEntities(requirements, acceptanceCriteria, businessRules, openQuestions, auditEvents),
      projects,
      activeProject: active,
      modules: modulesRaw.map((m) => ({ id: m.id, projectId: m.projectId, name: m.name, description: m.description ?? null })),
      usage: user ? await buildUsage(userId, user.plan, user.aiCreditsOverride, user.subscriptionStatus) : null,
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
      source: (r.source as string | null) ?? null,
      assignee: (r.assignee as string | null) ?? null,
      version: (r.version as number | undefined) ?? 1,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : undefined,
      projectId: (r.projectId as string | null) ?? null,
      moduleId: (r.moduleId as string | null) ?? null,
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

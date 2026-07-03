import { prisma, hasDatabase } from "./db";
import {
  REQUIREMENTS,
  ACCEPTANCE_CRITERIA,
  BUSINESS_RULES,
  OPEN_QUESTIONS,
  AUDIT_EVENTS,
  type Requirement,
  type AcceptanceCriterion,
  type BusinessRule,
  type OpenQuestion,
  type AuditEvent,
} from "./data";
import type { RequirementStatus, PriorityLevel } from "@/components/ds";

export interface WorkspaceData {
  requirements: Requirement[];
  acceptanceCriteria: AcceptanceCriterion[];
  businessRules: BusinessRule[];
  openQuestions: OpenQuestion[];
  auditEvents: AuditEvent[];
  /** Where the data came from — handy for debugging the deployment. */
  source: "database" | "fallback";
}

const FALLBACK: WorkspaceData = {
  requirements: REQUIREMENTS,
  acceptanceCriteria: ACCEPTANCE_CRITERIA,
  businessRules: BUSINESS_RULES,
  openQuestions: OPEN_QUESTIONS,
  auditEvents: AUDIT_EVENTS,
  source: "fallback",
};

/**
 * Load the workspace data from Postgres when a database is configured and
 * seeded; otherwise fall back to the in-code mock data. This guarantees the
 * app renders whether or not the database exists, so deploys never break.
 *
 * When `userId` is given, results are scoped to that user's rows plus the
 * shared demo rows (ownerId = null), so every account gets its own workspace.
 */
export async function getWorkspaceData(userId?: string | null): Promise<WorkspaceData> {
  if (!hasDatabase()) return FALLBACK;

  // Each account sees only its own rows, so new users start with a clean
  // workspace. When no user is scoped (open/owner mode) everything is shown.
  const owned = userId ? { ownerId: userId } : {};

  try {
    const [requirements, acceptanceCriteria, businessRules, openQuestions, auditEvents] =
      await Promise.all([
        prisma.requirement.findMany({ where: owned, orderBy: { order: "asc" } }),
        prisma.acceptanceCriterion.findMany({ where: owned, orderBy: { order: "asc" } }),
        prisma.businessRule.findMany({ where: owned, orderBy: { order: "asc" } }),
        prisma.openQuestion.findMany({ where: owned, orderBy: { order: "asc" } }),
        prisma.auditEvent.findMany({ where: owned, orderBy: { createdAt: "desc" }, take: 200 }),
      ]);

    // In open/owner mode (no scoped user) an empty table means "not seeded"
    // → show demo content. For a scoped account, empty is legitimate: a new
    // user simply starts with a clean, empty workspace.
    if (!userId && requirements.length === 0) return FALLBACK;

    return {
      requirements: requirements.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status as RequirementStatus,
        priority: r.priority as PriorityLevel,
        confidence: r.confidence,
        criteria: r.criteria,
        openQuestions: r.openQuestions,
        module: r.module,
        stakeholders: r.stakeholders,
      })),
      acceptanceCriteria: acceptanceCriteria.map((c) => ({
        id: c.id,
        requirementId: c.requirementId,
        text: c.text,
        done: c.done,
        ai: c.ai,
      })),
      businessRules: businessRules.map((b) => ({
        id: b.id,
        requirementId: b.requirementId,
        text: b.text,
        source: b.source,
      })),
      openQuestions: openQuestions.map((q) => ({
        id: q.id,
        requirementId: q.requirementId,
        text: q.text,
        to: q.to,
        ai: q.ai,
        answer: q.answer,
      })),
      auditEvents: auditEvents.map((e) => ({
        id: e.id,
        requirementId: e.requirementId,
        action: e.action,
        detail: e.detail,
        actor: e.actor,
        createdAt: e.createdAt.toISOString(),
      })),
      source: "database",
    };
  } catch (err) {
    console.warn("[workspace-data] DB read failed, using fallback:", err);
    return FALLBACK;
  }
}

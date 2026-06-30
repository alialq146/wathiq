import { prisma, hasDatabase } from "./db";
import {
  REQUIREMENTS,
  ACCEPTANCE_CRITERIA,
  BUSINESS_RULES,
  OPEN_QUESTIONS,
  type Requirement,
  type AcceptanceCriterion,
  type BusinessRule,
  type OpenQuestion,
} from "./data";
import type { RequirementStatus, PriorityLevel } from "@/components/ds";

export interface WorkspaceData {
  requirements: Requirement[];
  acceptanceCriteria: AcceptanceCriterion[];
  businessRules: BusinessRule[];
  openQuestions: OpenQuestion[];
  /** Where the data came from — handy for debugging the deployment. */
  source: "database" | "fallback";
}

const FALLBACK: WorkspaceData = {
  requirements: REQUIREMENTS,
  acceptanceCriteria: ACCEPTANCE_CRITERIA,
  businessRules: BUSINESS_RULES,
  openQuestions: OPEN_QUESTIONS,
  source: "fallback",
};

/**
 * Load the workspace data from Postgres when a database is configured and
 * seeded; otherwise fall back to the in-code mock data. This guarantees the
 * app renders whether or not the database exists, so deploys never break.
 */
export async function getWorkspaceData(): Promise<WorkspaceData> {
  if (!hasDatabase()) return FALLBACK;

  try {
    const [requirements, acceptanceCriteria, businessRules, openQuestions] =
      await Promise.all([
        prisma.requirement.findMany({ orderBy: { order: "asc" } }),
        prisma.acceptanceCriterion.findMany({ orderBy: { order: "asc" } }),
        prisma.businessRule.findMany({ orderBy: { order: "asc" } }),
        prisma.openQuestion.findMany({ orderBy: { order: "asc" } }),
      ]);

    // Not seeded yet → keep the app populated with the fallback content.
    if (requirements.length === 0) return FALLBACK;

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
        text: c.text,
        done: c.done,
        ai: c.ai,
      })),
      businessRules: businessRules.map((b) => ({
        id: b.id,
        text: b.text,
        source: b.source,
      })),
      openQuestions: openQuestions.map((q) => ({
        id: q.id,
        text: q.text,
        to: q.to,
        ai: q.ai,
      })),
      source: "database",
    };
  } catch (err) {
    console.warn("[workspace-data] DB read failed, using fallback:", err);
    return FALLBACK;
  }
}

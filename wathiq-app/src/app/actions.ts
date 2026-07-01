"use server";

import { revalidatePath } from "next/cache";
import { prisma, hasDatabase } from "@/lib/db";
import type { RequirementStatus, PriorityLevel } from "@/components/ds";

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
    } else {
      const exists = await prisma.requirement.findUnique({ where: { id } });
      if (exists) return { ok: false, error: "duplicate-id" };
      const max = await prisma.requirement.aggregate({ _max: { order: true } });
      await prisma.requirement.create({
        data: { id, ...data, order: (max._max.order ?? -1) + 1 },
      });
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
    await prisma.requirement.update({ where: { id: rid }, data: { status } });
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
    await prisma.requirement.delete({ where: { id } });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[deleteRequirement]", err);
    return { ok: false, error: "server" };
  }
}

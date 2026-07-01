/**
 * Seed the database from the in-code mock data. Idempotent: every row is
 * upserted by primary key, so running it on each deploy is safe.
 */
import { prisma } from "../src/lib/db";
import {
  REQUIREMENTS,
  ACCEPTANCE_CRITERIA,
  BUSINESS_RULES,
  OPEN_QUESTIONS,
  AUDIT_EVENTS,
} from "../src/lib/data";

async function main() {
  // Seed-once: if the workspace already has requirements (e.g. the user has
  // edited data through the app), don't overwrite it on subsequent deploys.
  const existing = await prisma.requirement.count();
  if (existing > 0) {
    console.log(`Seed skipped — ${existing} requirements already present.`);
    return;
  }

  for (const [i, r] of REQUIREMENTS.entries()) {
    const data = {
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      confidence: r.confidence,
      criteria: r.criteria,
      openQuestions: r.openQuestions,
      module: r.module,
      stakeholders: r.stakeholders,
      order: i,
    };
    await prisma.requirement.upsert({
      where: { id: r.id },
      create: { id: r.id, ...data },
      update: data,
    });
  }

  for (const [i, c] of ACCEPTANCE_CRITERIA.entries()) {
    const data = { requirementId: c.requirementId, text: c.text, done: c.done, ai: c.ai, order: i };
    await prisma.acceptanceCriterion.upsert({
      where: { id: c.id },
      create: { id: c.id, ...data },
      update: data,
    });
  }

  for (const [i, b] of BUSINESS_RULES.entries()) {
    const data = { requirementId: b.requirementId, text: b.text, source: b.source, order: i };
    await prisma.businessRule.upsert({
      where: { id: b.id },
      create: { id: b.id, ...data },
      update: data,
    });
  }

  for (const [i, q] of OPEN_QUESTIONS.entries()) {
    const data = { requirementId: q.requirementId, text: q.text, to: q.to, ai: q.ai, answer: q.answer, order: i };
    await prisma.openQuestion.upsert({
      where: { id: q.id },
      create: { id: q.id, ...data },
      update: data,
    });
  }

  for (const e of AUDIT_EVENTS) {
    const data = {
      requirementId: e.requirementId,
      action: e.action,
      detail: e.detail,
      actor: e.actor,
      createdAt: new Date(e.createdAt),
    };
    await prisma.auditEvent.upsert({
      where: { id: e.id },
      create: { id: e.id, ...data },
      update: data,
    });
  }

  console.log(
    `Seeded: ${REQUIREMENTS.length} requirements, ${ACCEPTANCE_CRITERIA.length} criteria, ${BUSINESS_RULES.length} rules, ${OPEN_QUESTIONS.length} questions, ${AUDIT_EVENTS.length} audit events.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

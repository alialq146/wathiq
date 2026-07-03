#!/usr/bin/env node
/**
 * Promote (or demote) a user by email — the only supported way to assign
 * SUPER_ADMIN. Runs against DATABASE_URL, so it works locally and against
 * production (run it with the production URL exported).
 *
 *   node scripts/make-admin.mjs admin@example.com              → SUPER_ADMIN
 *   node scripts/make-admin.mjs admin@example.com USER         → back to USER
 */
import { PrismaClient } from "@prisma/client";

const email = (process.argv[2] ?? "").trim().toLowerCase();
const role = (process.argv[3] ?? "SUPER_ADMIN").trim().toUpperCase();

if (!email || !["USER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
  console.error("Usage: node scripts/make-admin.mjs <email> [USER|ADMIN|SUPER_ADMIN]");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.update({ where: { email }, data: { role } });
  console.log(`OK: ${user.email} → role=${role}`);
} catch (err) {
  console.error(`Failed: no user with email "${email}"?`, err.code ?? err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

/**
 * Build-time database setup — runs before `next build`.
 *
 * If a Postgres connection string is present (Vercel Postgres / Neon), it
 * creates the tables (`prisma db push`) and seeds them (idempotent upserts).
 * If no database is configured, or if anything fails, it exits cleanly so the
 * build still succeeds and the app serves the in-code fallback data.
 */
import { execSync } from "node:child_process";

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!url) {
  console.log("[db-setup] No database URL found — skipping (app uses fallback data).");
  process.exit(0);
}

// Normalise so the Prisma CLI (which reads env("DATABASE_URL")) always works.
const env = { ...process.env, DATABASE_URL: url };

try {
  console.log("[db-setup] Pushing schema…");
  execSync("prisma db push --skip-generate --accept-data-loss", { stdio: "inherit", env });
  console.log("[db-setup] Seeding…");
  execSync("prisma db seed", { stdio: "inherit", env });
  console.log("[db-setup] Done.");
} catch (err) {
  console.warn("[db-setup] Failed — app will use fallback data. Reason:", err?.message);
}

process.exit(0);

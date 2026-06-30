import { PrismaClient } from "@prisma/client";

/**
 * Resolve a Postgres connection string from whichever env var the hosting
 * integration provides. Vercel Postgres / Neon expose several names; we accept
 * the common ones so the app works regardless of which integration is used.
 */
export function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    undefined
  );
}

export function hasDatabase(): boolean {
  return Boolean(resolveDatabaseUrl());
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = resolveDatabaseUrl();
  return new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

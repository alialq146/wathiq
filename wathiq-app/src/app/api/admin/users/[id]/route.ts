import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, ADMIN_FORBIDDEN } from "@/lib/admin";
import { getPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

/** GET /api/admin/users/:id — one user's detail (metadata only, no document content). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  const { id } = await ctx.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      role: true,
      accountStatus: true,
      subscriptionStatus: true,
      analysisCount: true,
      analysisLimit: true,
      limitOverride: true,
      resetDate: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ ok: false, error: "not-found" });

  const [projects, byStatus, cost, recent, reqCount] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: id },
      orderBy: { order: "asc" },
      take: 50,
      select: { id: true, name: true, code: true, status: true, createdAt: true },
    }),
    prisma.aiUsage.groupBy({ by: ["status"], _count: true, where: { userId: id } }),
    prisma.aiUsage.aggregate({ _sum: { estimatedCost: true }, where: { userId: id } }),
    prisma.aiUsage.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        status: true,
        modelUsed: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCost: true,
        errorMessage: true,
        projectId: true,
        requirementId: true,
      },
    }),
    prisma.requirement.count({ where: { ownerId: id } }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const s of byStatus) statusMap[s.status] = s._count;

  return NextResponse.json({
    ok: true,
    user: {
      ...user,
      limit: user.limitOverride ? user.analysisLimit : getPlan(user.plan).analysisLimit,
      resetDate: user.resetDate?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    requirements: reqCount,
    projects: projects.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    usage: {
      byStatus: statusMap,
      costUsd: Math.round((cost._sum.estimatedCost ?? 0) * 100) / 100,
      recent: recent.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        errorMessage: r.errorMessage ? r.errorMessage.slice(0, 160) : null,
      })),
    },
  });
}

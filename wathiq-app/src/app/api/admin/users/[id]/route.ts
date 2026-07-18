import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, ADMIN_FORBIDDEN } from "@/lib/admin";

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
      aiCreditsGranted: true,
      aiCreditsUsed: true,
      aiCreditsOverride: true,
      aiCreditsPeriodEnd: true,
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
    prisma.aiOperation.groupBy({ by: ["status"], _count: true, where: { userId: id } }),
    prisma.aiOperation.aggregate({ _sum: { estimatedCostUsd: true, creditsCommitted: true }, where: { userId: id } }),
    prisma.aiOperation.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        status: true,
        taskKey: true,
        level: true,
        model: true,
        creditsCommitted: true,
        promptTokens: true,
        completionTokens: true,
        estimatedCostUsd: true,
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
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      role: user.role,
      accountStatus: user.accountStatus,
      subscriptionStatus: user.subscriptionStatus,
      creditsUsed: user.aiCreditsUsed,
      creditsGranted: user.aiCreditsGranted,
      creditsOverride: user.aiCreditsOverride,
      periodEnd: user.aiCreditsPeriodEnd?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    requirements: reqCount,
    projects: projects.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    usage: {
      byStatus: statusMap,
      costUsd: Math.round((cost._sum.estimatedCostUsd ?? 0) * 100) / 100,
      creditsSpent: cost._sum.creditsCommitted ?? 0,
      recent: recent.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        errorMessage: r.errorMessage ? r.errorMessage.slice(0, 160) : null,
      })),
    },
  });
}

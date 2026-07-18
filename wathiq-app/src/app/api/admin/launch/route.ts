import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, ADMIN_FORBIDDEN } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/launch — «لوحة الإطلاق»: مؤشرات آخر 7 و30 يومًا من الجداول
 * الداخلية فقط (User/Project/AuditEvent/AiUsage/ProductEvent/UserFeedback).
 * لا أسرار ولا محتوى متطلبات — عناوين وأعداد وحالات فقط.
 */
export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const kpisFor = async (since: Date) => {
    const [newUsers, newProjects, newRequirements, ai, exportsBrd, exportsSrs, exportsReport, quotaHits, upgradeClicks, activeEventUsers, activeAiUsers] =
      await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: since } } }),
        prisma.project.count({ where: { createdAt: { gte: since } } }),
        // المتطلبات ليس لها createdAt — سجل التدقيق هو المصدر التاريخي الموثوق.
        prisma.auditEvent.count({ where: { action: "requirement_created", createdAt: { gte: since } } }),
        prisma.aiOperation.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
        prisma.productEvent.count({ where: { eventName: "export_brd_created", createdAt: { gte: since } } }),
        prisma.productEvent.count({ where: { eventName: "export_srs_created", createdAt: { gte: since } } }),
        prisma.productEvent.count({ where: { eventName: "export_report_created", createdAt: { gte: since } } }),
        prisma.aiOperation.count({ where: { status: "REJECTED", createdAt: { gte: since } } }),
        prisma.productEvent.count({ where: { eventName: "upgrade_clicked", createdAt: { gte: since } } }),
        prisma.productEvent.groupBy({ by: ["userId"], where: { createdAt: { gte: since }, userId: { not: null } } }),
        prisma.aiOperation.groupBy({ by: ["userId"], where: { createdAt: { gte: since } } }),
      ]);

    const aiByStatus = Object.fromEntries(ai.map((r) => [r.status, r._count._all]));
    const activeIds = new Set<string>([
      ...activeEventUsers.map((r) => r.userId as string),
      ...activeAiUsers.map((r) => r.userId),
    ]);

    return {
      newUsers,
      activeUsers: activeIds.size,
      newProjects,
      newRequirements,
      assistantRuns: (aiByStatus["COMMITTED"] ?? 0) + (aiByStatus["FAILED"] ?? 0),
      assistantSuccess: aiByStatus["COMMITTED"] ?? 0,
      assistantFailed: aiByStatus["FAILED"] ?? 0,
      quotaHits,
      upgradeClicks,
      exportsBrd,
      exportsSrs,
      exportsReport,
    };
  };

  const [k7, k30, openFeedback, planGroups, recentFeedback, topEvents, recentAiErrors, recentUpgrades] = await Promise.all([
    kpisFor(d7),
    kpisFor(d30),
    prisma.userFeedback.count({ where: { status: "open" } }),
    prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.userFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, userId: true, type: true, severity: true, message: true, createdAt: true, status: true },
    }),
    prisma.productEvent.groupBy({
      by: ["eventName"],
      where: { createdAt: { gte: d30 } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    prisma.aiOperation.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, userId: true, model: true, errorMessage: true, createdAt: true },
    }),
    prisma.productEvent.findMany({
      where: { eventName: "upgrade_clicked" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, userId: true, plan: true, metadata: true, createdAt: true },
    }),
  ]);

  // قمع بسيط (آخر 30 يومًا): مستخدمون مميزون لكل خطوة.
  const [funnelProjects, funnelReqs, funnelAssistant, funnelExports] = await Promise.all([
    prisma.project.groupBy({ by: ["ownerId"], where: { createdAt: { gte: d30 } } }),
    prisma.auditEvent.groupBy({ by: ["ownerId"], where: { action: "requirement_created", createdAt: { gte: d30 }, ownerId: { not: null } } }),
    prisma.aiOperation.groupBy({ by: ["userId"], where: { createdAt: { gte: d30 } } }),
    prisma.productEvent.groupBy({ by: ["userId"], where: { eventName: { startsWith: "export_" }, createdAt: { gte: d30 }, userId: { not: null } } }),
  ]);

  const feedbackUserIds = [...new Set(recentFeedback.map((f) => f.userId))];
  const errorUserIds = [...new Set(recentAiErrors.map((e) => e.userId))];
  const upgradeUserIds = [...new Set(recentUpgrades.map((u) => u.userId).filter(Boolean))] as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set([...feedbackUserIds, ...errorUserIds, ...upgradeUserIds])] } },
    select: { id: true, email: true },
  });
  const emailOf = new Map(users.map((u) => [u.id, u.email]));

  const topPlan = planGroups.length
    ? planGroups.reduce((a, b) => (b._count._all > a._count._all ? b : a)).plan
    : null;

  return NextResponse.json({
    ok: true,
    last7: k7,
    last30: k30,
    openFeedback,
    topPlan,
    funnel30: {
      signedUp: await prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      createdProject: funnelProjects.length,
      addedRequirement: funnelReqs.length,
      ranAssistant: funnelAssistant.length,
      exported: funnelExports.length,
    },
    recentFeedback: recentFeedback.map((f) => ({
      id: f.id,
      type: f.type,
      severity: f.severity,
      status: f.status,
      message: f.message.slice(0, 120),
      email: emailOf.get(f.userId) ?? "",
      createdAt: f.createdAt.toISOString(),
    })),
    topEvents: topEvents.map((e) => ({ eventName: e.eventName, count: e._count._all })),
    recentUpgrades: recentUpgrades.map((u) => ({
      id: u.id,
      email: u.userId ? (emailOf.get(u.userId) ?? "") : "",
      plan: u.plan ?? "",
      from: typeof u.metadata === "object" && u.metadata !== null && "from" in u.metadata ? String((u.metadata as Record<string, unknown>).from) : "",
      createdAt: u.createdAt.toISOString(),
    })),
    recentAiErrors: recentAiErrors.map((e) => ({
      id: e.id,
      email: emailOf.get(e.userId) ?? "",
      modelUsed: e.model,
      error: (e.errorMessage ?? "").slice(0, 120),
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

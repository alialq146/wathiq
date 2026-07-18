import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, ADMIN_FORBIDDEN } from "@/lib/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const STATUSES = ["RESERVED", "COMMITTED", "REFUNDED", "FAILED", "REJECTED"];
const ERROR_STATUSES = ["FAILED", "REJECTED"];

function rangeStart(range: string): Date | null {
  const d = new Date();
  switch (range) {
    case "today":
      d.setHours(0, 0, 0, 0);
      return d;
    case "7d":
      d.setDate(d.getDate() - 7);
      return d;
    case "month":
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    default:
      return null; // all
  }
}

/**
 * GET /api/admin/usage?page&range&status&model&plan&q
 * Paginated AiOperation log (metadata only) + aggregates for the same filter.
 * status may be one of STATUSES or "ERRORS" (= all non-success).
 */
export async function GET(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const range = url.searchParams.get("range") ?? "month";
  const status = (url.searchParams.get("status") ?? "").toUpperCase();
  const model = url.searchParams.get("model") ?? "";
  const plan = (url.searchParams.get("plan") ?? "").toUpperCase();
  const q = (url.searchParams.get("q") ?? "").trim();

  const where: Record<string, unknown> = {};
  const start = rangeStart(range);
  if (start) where.createdAt = { gte: start };
  if (status === "ERRORS") where.status = { in: ERROR_STATUSES };
  else if (STATUSES.includes(status)) where.status = status;
  if (model) where.model = model;

  // Plan / email filters resolve to user ids first (bounded query).
  if (plan || q) {
    const users = await prisma.user.findMany({
      where: {
        ...(plan ? { plan } : {}),
        ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
      },
      select: { id: true },
      take: 2000,
    });
    where.userId = { in: users.map((u) => u.id) };
  }

  const [total, rows, byStatus, cost, models] = await Promise.all([
    prisma.aiOperation.count({ where }),
    prisma.aiOperation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        userId: true,
        projectId: true,
        requirementId: true,
        documentId: true,
        taskKey: true,
        level: true,
        model: true,
        status: true,
        creditsCommitted: true,
        promptTokens: true,
        completionTokens: true,
        estimatedCostUsd: true,
        errorMessage: true,
      },
    }),
    prisma.aiOperation.groupBy({ by: ["status"], _count: true, where }),
    prisma.aiOperation.aggregate({ _sum: { estimatedCostUsd: true }, where }),
    prisma.aiOperation.groupBy({ by: ["model"], _count: true, where }),
  ]);

  // Attach user email + plan for just this page's rows.
  const ids = [...new Set(rows.map((r) => r.userId))];
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, plan: true } })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));

  const statusMap: Record<string, number> = {};
  for (const s of byStatus) statusMap[s.status] = s._count;

  return NextResponse.json({
    ok: true,
    page,
    pageSize: PAGE_SIZE,
    total,
    aggregates: {
      byStatus: statusMap,
      costUsd: Math.round((cost._sum.estimatedCostUsd ?? 0) * 100) / 100,
      models: models.map((m) => ({ model: m.model, requests: m._count })).sort((a, b) => b.requests - a.requests),
    },
    rows: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      userEmail: byId.get(r.userId)?.email ?? r.userId,
      userPlan: byId.get(r.userId)?.plan ?? "—",
      projectId: r.projectId,
      requirementId: r.requirementId,
      documentId: r.documentId,
      task: r.taskKey,
      level: r.level,
      model: r.model,
      status: r.status,
      credits: r.creditsCommitted,
      inputTokens: r.promptTokens,
      outputTokens: r.completionTokens,
      costUsd: r.estimatedCostUsd,
      // Metadata only — never file/requirement content.
      errorMessage: r.errorMessage ? r.errorMessage.slice(0, 160) : null,
    })),
  });
}

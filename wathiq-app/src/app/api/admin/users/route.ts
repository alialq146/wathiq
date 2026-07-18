import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, ADMIN_FORBIDDEN } from "@/lib/admin";
import { PLANS, type PlanId } from "@/lib/plans";
import { getResolvedPlan } from "@/lib/settings";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
function plusMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}

/** GET /api/admin/users?page=1&q=... — paginated user list with usage/cost. */
export async function GET(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const q = (url.searchParams.get("q") ?? "").trim();

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
    }),
  ]);

  // Enrich only the page's users (never the whole table).
  const ids = users.map((u) => u.id);
  const [projectCounts, costs, lastUse] = ids.length
    ? await Promise.all([
        prisma.project.groupBy({ by: ["ownerId"], _count: true, where: { ownerId: { in: ids } } }),
        prisma.aiOperation.groupBy({ by: ["userId"], _sum: { estimatedCostUsd: true }, _count: true, where: { userId: { in: ids } } }),
        prisma.aiOperation.groupBy({ by: ["userId"], _max: { createdAt: true }, where: { userId: { in: ids } } }),
      ])
    : [[], [], []];
  const projByUser = new Map(projectCounts.map((p) => [p.ownerId, p._count]));
  const costByUser = new Map(costs.map((c) => [c.userId, { cost: c._sum.estimatedCostUsd ?? 0, calls: c._count }]));
  const lastByUser = new Map(lastUse.map((l) => [l.userId, l._max.createdAt]));

  return NextResponse.json({
    ok: true,
    page,
    pageSize: PAGE_SIZE,
    total,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      plan: u.plan,
      role: u.role,
      accountStatus: u.accountStatus,
      subscriptionStatus: u.subscriptionStatus,
      creditsUsed: u.aiCreditsUsed,
      creditsGranted: u.aiCreditsGranted,
      creditsOverride: u.aiCreditsOverride,
      periodEnd: u.aiCreditsPeriodEnd?.toISOString() ?? null,
      projects: projByUser.get(u.id) ?? 0,
      aiCalls: costByUser.get(u.id)?.calls ?? 0,
      costUsd: Math.round((costByUser.get(u.id)?.cost ?? 0) * 100) / 100,
      lastActivity: lastByUser.get(u.id)?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

/** POST /api/admin/users — guarded mutations on a single user. */
export async function POST(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  let body: { userId?: unknown; action?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" });
  }
  const userId = typeof body.userId === "string" ? body.userId : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!userId || !action) return NextResponse.json({ ok: false, error: "bad-request" });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ ok: false, error: "not-found" });

  try {
    switch (action) {
      case "set-plan": {
        const plan = String(body.value ?? "").toUpperCase() as PlanId;
        if (!PLANS[plan]) return NextResponse.json({ ok: false, error: "bad-plan" });
        // تغيير الخطة يمسح أي تجاوز رصيد ويمنح رصيد الخطة الجديدة (دورة نظيفة).
        const grant = (await getResolvedPlan(plan)).monthlyCredits;
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan, subscriptionStatus: plan === "FREE" ? "ACTIVE" : "MANUAL",
            aiCreditsOverride: null, aiCreditsGranted: grant, aiCreditsUsed: 0, aiCreditsPeriodEnd: plusMonth(),
          },
        });
        break;
      }
      case "reset-credits": {
        // تصفير الاستهلاك يبدأ دورة نقاط جديدة فورًا.
        await prisma.user.update({ where: { id: userId }, data: { aiCreditsUsed: 0, aiCreditsDayUsed: 0, aiCreditsPeriodEnd: plusMonth() } });
        break;
      }
      case "set-credits": {
        // تجاوز أدمن لمنحة النقاط الشهرية لهذا المستخدم — يُطبَّق فورًا.
        const n = Number(body.value);
        if (!Number.isInteger(n) || n < 0 || n > 1_000_000) return NextResponse.json({ ok: false, error: "bad-credits" });
        await prisma.user.update({ where: { id: userId }, data: { aiCreditsOverride: n, aiCreditsGranted: n } });
        break;
      }
      case "clear-credits": {
        // إزالة التجاوز → العودة لمنحة الخطة الافتراضية.
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
        const grant = (await getResolvedPlan(u?.plan ?? "FREE")).monthlyCredits;
        await prisma.user.update({ where: { id: userId }, data: { aiCreditsOverride: null, aiCreditsGranted: grant } });
        break;
      }
      case "set-status": {
        const status = String(body.value ?? "").toUpperCase();
        if (!["ACTIVE", "DISABLED"].includes(status)) return NextResponse.json({ ok: false, error: "bad-status" });
        if (userId === admin.id) return NextResponse.json({ ok: false, error: "self" }); // can't disable yourself
        await prisma.user.update({ where: { id: userId }, data: { accountStatus: status } });
        break;
      }
      default:
        return NextResponse.json({ ok: false, error: "bad-action" });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/admin/users] mutation failed", err);
    return NextResponse.json({ ok: false, error: "server" });
  }
}

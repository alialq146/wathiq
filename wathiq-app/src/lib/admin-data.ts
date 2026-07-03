/**
 * Admin dashboard data layer — server-only. Everything here is aggregation
 * queries (count / groupBy / sum); no table is ever loaded whole. Secrets are
 * reduced to Configured/Missing booleans and never leave the server as values.
 */

import { prisma } from "./db";
import { PLANS, PLAN_ORDER, getPlan, whatsappUpgradeLink, type PlanId } from "./plans";
import { modelForPlan } from "./usage";
import { APP_VERSION } from "./version";

/* ---------------- shapes returned to the admin UI ---------------- */

export interface AdminAlert {
  severity: "success" | "info" | "warn" | "error";
  text: string;
  hint?: string;
}

export interface UsageRowLite {
  id: string;
  createdAt: string;
  status: string;
  modelUsed: string;
  estimatedCost: number | null;
  errorMessage: string | null;
  userEmail: string;
  userPlan: string;
}

export interface TopConsumer {
  userId: string;
  name: string;
  email: string;
  plan: string;
  analyses: number;
  blocked: number;
  costUsd: number;
  topModel: string;
  note: string | null;
}

export interface AdminOverviewData {
  generatedAt: string;
  kpis: {
    totalUsers: number;
    newToday: number;
    newMonth: number;
    activeMonth: number;
    totalProjects: number;
    totalRequirements: number;
    aiTotal: number;
    aiSuccess: number;
    aiFailed: number;
    aiBlockedLimit: number;
    aiBlockedSize: number;
    aiBlockedAuth: number;
  };
  finance: {
    proUsers: number;
    enterpriseUsers: number;
    mrrSar: number;
    arrSar: number;
    aiCostMonthUsd: number;
    aiCostMonthSar: number;
    usdToSar: number;
    netMonthSar: number;
    avgCostPerAnalysisUsd: number | null;
  };
  usage: {
    requestsToday: number;
    requestsMonth: number;
    successMonth: number;
    failedMonth: number;
    blockedLimitMonth: number;
    blockedSizeMonth: number;
    costTodayUsd: number;
    costMonthUsd: number;
    byModel: Array<{
      model: string;
      requests: number;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      pct: number;
    }>;
  };
  subscriptions: {
    counts: Record<PlanId, number>;
    freeToPaidPct: number | null;
    atLimit: number;
    nearLimit: number;
    perPlan: Array<{
      plan: PlanId;
      planName: string;
      users: number;
      limit: number | null;
      avgUsage: number;
      revenueSar: number | null;
      aiCostUsd: number;
      marginSar: number | null;
    }>;
  };
  topConsumers: TopConsumer[];
  recentErrors: UsageRowLite[];
  recentAnalyses: UsageRowLite[];
  alerts: AdminAlert[];
  health: AdminHealthData;
}

export interface AdminHealthData {
  db: "healthy" | "down";
  environment: string;
  appVersion: string;
  counts: { users: number; projects: number; requirements: number; aiUsage: number };
  lastAi: string | null;
  lastSuccess: string | null;
  lastFailed: string | null;
  env: {
    databaseUrl: boolean;
    anthropicKey: boolean;
    sessionSecret: boolean;
    aiModelFree: boolean;
    aiModelPro: boolean;
    aiModelEnterprise: boolean;
  };
  models: { free: string; pro: string; enterprise: string };
  limits: { free: number | null; pro: number | null; enterprise: number | null };
  contact: { whatsapp: string };
  maxPdfNote: string;
  checklist: Array<{ label: string; ok: boolean; hint?: string }>;
}

/* ---------------- helpers ---------------- */

const USD_TO_SAR = Number(process.env.USD_TO_SAR || "3.75");
const PRO_PRICE_SAR = 149;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const round2 = (n: number) => Math.round(n * 100) / 100;

function statusCounts(rows: Array<{ status: string; _count: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = r._count;
  return out;
}

async function attachUsers(
  rows: Array<{
    id: string;
    createdAt: Date;
    status: string;
    modelUsed: string;
    estimatedCost: number | null;
    errorMessage: string | null;
    userId: string;
  }>
): Promise<UsageRowLite[]> {
  const ids = [...new Set(rows.map((r) => r.userId))];
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, plan: true } })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    status: r.status,
    modelUsed: r.modelUsed,
    estimatedCost: r.estimatedCost,
    errorMessage: r.errorMessage ? r.errorMessage.slice(0, 160) : null,
    userEmail: byId.get(r.userId)?.email ?? r.userId,
    userPlan: byId.get(r.userId)?.plan ?? "—",
  }));
}

/* ---------------- health (also used standalone) ---------------- */

export async function getAdminHealth(): Promise<AdminHealthData> {
  let db: "healthy" | "down" = "healthy";
  let counts = { users: 0, projects: 0, requirements: 0, aiUsage: 0 };
  let lastAi: Date | null = null;
  let lastSuccess: Date | null = null;
  let lastFailed: Date | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [users, projects, requirements, aiUsage, a, s, f] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.requirement.count(),
      prisma.aiUsage.count(),
      prisma.aiUsage.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.aiUsage.findFirst({ where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.aiUsage.findFirst({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    ]);
    counts = { users, projects, requirements, aiUsage };
    lastAi = a?.createdAt ?? null;
    lastSuccess = s?.createdAt ?? null;
    lastFailed = f?.createdAt ?? null;
  } catch {
    db = "down";
  }

  const has = (k: string) => Boolean((process.env[k] ?? "").trim());
  const env = {
    databaseUrl: has("DATABASE_URL") || has("POSTGRES_PRISMA_URL") || has("POSTGRES_URL"),
    anthropicKey: has("ANTHROPIC_API_KEY"),
    sessionSecret: has("WATHIQ_SESSION_SECRET"),
    aiModelFree: has("AI_MODEL_FREE"),
    aiModelPro: has("AI_MODEL_PRO"),
    aiModelEnterprise: has("AI_MODEL_ENTERPRISE"),
  };

  const todayFailed =
    db === "healthy"
      ? await prisma.aiUsage.count({ where: { status: "FAILED", createdAt: { gte: startOfToday() } } }).catch(() => 0)
      : 0;

  return {
    db,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    appVersion: APP_VERSION,
    counts,
    lastAi: iso(lastAi),
    lastSuccess: iso(lastSuccess),
    lastFailed: iso(lastFailed),
    env,
    // Model names are not secrets — safe to display.
    models: { free: modelForPlan("FREE"), pro: modelForPlan("PRO"), enterprise: modelForPlan("ENTERPRISE") },
    limits: {
      free: PLANS.FREE.analysisLimit,
      pro: PLANS.PRO.analysisLimit,
      enterprise: PLANS.ENTERPRISE.analysisLimit,
    },
    contact: { whatsapp: whatsappUpgradeLink() },
    maxPdfNote: "حجم PDF الأقصى ≈ 3.3MB (حد ثابت في /api/analyze)",
    checklist: [
      { label: "DATABASE_URL مضبوط", ok: env.databaseUrl, hint: "تحقق من DATABASE_URL في Vercel واتصال PostgreSQL." },
      { label: "ANTHROPIC_API_KEY مضبوط", ok: env.anthropicKey, hint: "أضف المفتاح في Vercel ثم أعد النشر." },
      { label: "WATHIQ_SESSION_SECRET مضبوط", ok: env.sessionSecret, hint: "بدونه يُشتق سر مؤقت من رابط القاعدة — يُفضَّل ضبطه صراحة." },
      { label: "AI_MODEL_FREE مضبوط", ok: env.aiModelFree, hint: "غير مضبوط → يُستخدم النموذج الافتراضي (fallback آمن)." },
      { label: "AI_MODEL_PRO مضبوط", ok: env.aiModelPro, hint: "غير مضبوط → يُستخدم النموذج الافتراضي (fallback آمن)." },
      { label: "AI_MODEL_ENTERPRISE مضبوط", ok: env.aiModelEnterprise, hint: "غير مضبوط → يُستخدم النموذج الافتراضي (fallback آمن)." },
      {
        label: "آخر تحليل AI نجح",
        ok: Boolean(lastSuccess && (!lastFailed || lastSuccess >= lastFailed)),
        hint: "راجع سجل الأخطاء: مفتاح Claude، أسماء النماذج، حجم الملفات، أو rate limits.",
      },
      { label: "لا أخطاء متكررة اليوم", ok: todayFailed < 3, hint: "٣ أخطاء أو أكثر اليوم — افحص تبويب الأخطاء." },
    ],
  };
}

/* ---------------- the big overview (one server call) ---------------- */

export async function getAdminOverview(): Promise<AdminOverviewData> {
  const today = startOfToday();
  const month = startOfMonth();

  const [
    totalUsers,
    newToday,
    newMonth,
    totalProjects,
    totalRequirements,
    allByStatus,
    monthByStatus,
    todayCount,
    monthCost,
    todayCost,
    byModelMonth,
    planGroups,
    activeUserRows,
    topRows,
    recentErrorRows,
    recentRows,
    health,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { createdAt: { gte: month } } }),
    prisma.project.count(),
    prisma.requirement.count(),
    prisma.aiUsage.groupBy({ by: ["status"], _count: true }),
    prisma.aiUsage.groupBy({ by: ["status"], _count: true, where: { createdAt: { gte: month } } }),
    prisma.aiUsage.count({ where: { createdAt: { gte: today } } }),
    prisma.aiUsage.aggregate({ _sum: { estimatedCost: true }, where: { createdAt: { gte: month } } }),
    prisma.aiUsage.aggregate({ _sum: { estimatedCost: true }, where: { createdAt: { gte: today } } }),
    prisma.aiUsage.groupBy({
      by: ["modelUsed"],
      _count: true,
      _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
      where: { createdAt: { gte: month } },
    }),
    prisma.user.groupBy({ by: ["plan"], _count: true, _avg: { analysisCount: true } }),
    prisma.aiUsage.findMany({
      where: { createdAt: { gte: month } },
      distinct: ["userId"],
      select: { userId: true },
      take: 5000,
    }),
    prisma.aiUsage.groupBy({
      by: ["userId"],
      _count: true,
      _sum: { estimatedCost: true },
      where: { createdAt: { gte: month } },
      orderBy: { _count: { userId: "desc" } },
      take: 5,
    }),
    prisma.aiUsage.findMany({
      where: { status: { in: ["FAILED", "BLOCKED_LIMIT", "BLOCKED_SIZE", "BLOCKED_AUTH"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, status: true, modelUsed: true, estimatedCost: true, errorMessage: true, userId: true },
    }),
    prisma.aiUsage.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, status: true, modelUsed: true, estimatedCost: true, errorMessage: true, userId: true },
    }),
    getAdminHealth(),
  ]);

  const all = statusCounts(allByStatus);
  const mon = statusCounts(monthByStatus);
  const aiTotal = Object.values(all).reduce((a, b) => a + b, 0);
  const monthTotal = Object.values(mon).reduce((a, b) => a + b, 0);
  const costMonthUsd = round2(monthCost._sum.estimatedCost ?? 0);
  const costTodayUsd = round2(todayCost._sum.estimatedCost ?? 0);

  // Plans.
  const planCounts: Record<PlanId, number> = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
  const planAvg: Record<PlanId, number> = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
  for (const g of planGroups) {
    const id = getPlan(g.plan).id;
    planCounts[id] += g._count;
    planAvg[id] = round2(g._avg.analysisCount ?? 0);
  }
  const paid = planCounts.PRO + planCounts.ENTERPRISE;

  // Users at/near their FREE or PRO limit (server-side count queries only).
  const [atFree, atPro, nearFree, nearPro] = await Promise.all([
    prisma.user.count({ where: { plan: "FREE", limitOverride: false, analysisCount: { gte: PLANS.FREE.analysisLimit! } } }),
    prisma.user.count({ where: { plan: "PRO", limitOverride: false, analysisCount: { gte: PLANS.PRO.analysisLimit! } } }),
    prisma.user.count({
      where: { plan: "FREE", limitOverride: false, analysisCount: { gte: Math.ceil(PLANS.FREE.analysisLimit! * 0.8), lt: PLANS.FREE.analysisLimit! } },
    }),
    prisma.user.count({
      where: { plan: "PRO", limitOverride: false, analysisCount: { gte: Math.ceil(PLANS.PRO.analysisLimit! * 0.8), lt: PLANS.PRO.analysisLimit! } },
    }),
  ]);

  // Finance (v1 estimates: PRO × 149 SAR; ENTERPRISE is manual/contact).
  const mrrSar = planCounts.PRO * PRO_PRICE_SAR;
  const aiCostMonthSar = round2(costMonthUsd * USD_TO_SAR);
  const successMonth = mon.SUCCESS ?? 0;

  // Cost per plan this month (join usage → user plan via the top-5000 active set is
  // inaccurate; instead group cost by userId then bucket by plan for page users only
  // would miss rows — so approximate per-plan cost by model routing, which maps 1:1).
  const modelToPlan = new Map<string, PlanId>();
  for (const id of PLAN_ORDER) modelToPlan.set(modelForPlan(id), id);
  const costByPlan: Record<PlanId, number> = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
  for (const m of byModelMonth) {
    const planId = modelToPlan.get(m.modelUsed) ?? "FREE";
    costByPlan[planId] = round2(costByPlan[planId] + (m._sum.estimatedCost ?? 0));
  }

  // Top consumers: enrich with user info + blocked counts + dominant model.
  const topIds = topRows.map((r) => r.userId);
  const [topUsers, topBlocked, topModels] = await Promise.all([
    topIds.length
      ? prisma.user.findMany({ where: { id: { in: topIds } }, select: { id: true, name: true, email: true, plan: true } })
      : Promise.resolve([]),
    topIds.length
      ? prisma.aiUsage.groupBy({
          by: ["userId"],
          _count: true,
          where: { userId: { in: topIds }, status: { in: ["BLOCKED_LIMIT", "BLOCKED_SIZE", "BLOCKED_AUTH"] }, createdAt: { gte: month } },
        })
      : Promise.resolve([] as Array<{ userId: string; _count: number }>),
    topIds.length
      ? prisma.aiUsage.groupBy({
          by: ["userId", "modelUsed"],
          _count: true,
          where: { userId: { in: topIds }, createdAt: { gte: month } },
        })
      : Promise.resolve([] as Array<{ userId: string; modelUsed: string; _count: number }>),
  ]);
  const userById = new Map(topUsers.map((u) => [u.id, u]));
  const blockedById = new Map(topBlocked.map((b) => [b.userId, b._count]));
  const topModelById = new Map<string, { model: string; n: number }>();
  for (const row of topModels) {
    const cur = topModelById.get(row.userId);
    if (!cur || row._count > cur.n) topModelById.set(row.userId, { model: row.modelUsed, n: row._count });
  }
  const topConsumers: TopConsumer[] = topRows.map((r) => {
    const u = userById.get(r.userId);
    const blocked = blockedById.get(r.userId) ?? 0;
    const plan = u?.plan ?? "—";
    let note: string | null = null;
    if (plan === "FREE" && blocked >= 2) note = "مستخدم مجاني بمحاولات محجوبة متكررة — مرشّح للترقية أو المراقبة.";
    else if (plan === "FREE" && r._count >= 3) note = "مستخدم مجاني نشِط — فرصة تحويل إلى Pro.";
    return {
      userId: r.userId,
      name: u?.name ?? "—",
      email: u?.email ?? r.userId,
      plan,
      analyses: r._count,
      blocked,
      costUsd: round2(r._sum.estimatedCost ?? 0),
      topModel: topModelById.get(r.userId)?.model ?? "—",
      note,
    };
  });

  const [recentErrors, recentAnalyses] = await Promise.all([
    attachUsers(recentErrorRows),
    attachUsers(recentRows),
  ]);

  /* ---- smart alerts ---- */
  const alerts: AdminAlert[] = [];
  if (!health.env.sessionSecret)
    alerts.push({ severity: "error", text: "تحذير أمني: WATHIQ_SESSION_SECRET غير مضبوط.", hint: "أضفه في Vercel ثم أعد النشر — يُستخدم لتوقيع جلسات الدخول." });
  if (!health.env.anthropicKey)
    alerts.push({ severity: "error", text: "ANTHROPIC_API_KEY غير مضبوط — التحليل بالذكاء الاصطناعي متوقف.", hint: "أضف المفتاح في Vercel." });
  for (const [key, label] of [["aiModelFree", "المجانية"], ["aiModelPro", "الاحترافية"], ["aiModelEnterprise", "الأعمال"]] as const) {
    if (!health.env[key])
      alerts.push({ severity: "info", text: `نموذج الخطة ${label} غير مضبوط — سيُستخدم النموذج الافتراضي (fallback).` });
  }
  const failedMonth = mon.FAILED ?? 0;
  if (failedMonth >= 3 || (monthTotal > 0 && failedMonth / monthTotal > 0.2))
    alerts.push({ severity: "warn", text: "ارتفاع في التحليلات الفاشلة هذا الشهر.", hint: "تحقق من Claude API (المفتاح، الرصيد، rate limits) أو حجم الملفات — تفاصيل في تبويب الأخطاء." });
  if (atFree > 0)
    alerts.push({ severity: "success", text: `${atFree} من مستخدمي الخطة المجانية وصلوا للحد — فرصة لتحويلهم إلى Pro.`, hint: "راجع تبويب المستخدمين ورقّ من تريد يدويًا." });
  if (costMonthUsd >= 10)
    alerts.push({ severity: "warn", text: `استهلاك AI مرتفع هذا الشهر (≈ $${costMonthUsd}).`, hint: "راجع أكثر المستخدمين استهلاكًا في تبويب AI Usage." });
  if (aiTotal === 0)
    alerts.push({ severity: "info", text: "لا توجد سجلات استخدام AI حتى الآن.", hint: "تأكد أن التسجيل يعمل بعد أول تحليل ناجح." });
  if (health.db === "down")
    alerts.push({ severity: "error", text: "تعذر الاتصال بقاعدة البيانات.", hint: "تحقق من DATABASE_URL واتصال PostgreSQL وmigrations." });
  if (alerts.length === 0)
    alerts.push({ severity: "success", text: "كل المؤشرات سليمة — لا تنبيهات حالية." });

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalUsers,
      newToday,
      newMonth,
      activeMonth: activeUserRows.length,
      totalProjects,
      totalRequirements,
      aiTotal,
      aiSuccess: all.SUCCESS ?? 0,
      aiFailed: all.FAILED ?? 0,
      aiBlockedLimit: all.BLOCKED_LIMIT ?? 0,
      aiBlockedSize: all.BLOCKED_SIZE ?? 0,
      aiBlockedAuth: all.BLOCKED_AUTH ?? 0,
    },
    finance: {
      proUsers: planCounts.PRO,
      enterpriseUsers: planCounts.ENTERPRISE,
      mrrSar,
      arrSar: mrrSar * 12,
      aiCostMonthUsd: costMonthUsd,
      aiCostMonthSar,
      usdToSar: USD_TO_SAR,
      netMonthSar: round2(mrrSar - aiCostMonthSar),
      avgCostPerAnalysisUsd: successMonth > 0 ? round2(costMonthUsd / successMonth) : null,
    },
    usage: {
      requestsToday: todayCount,
      requestsMonth: monthTotal,
      successMonth,
      failedMonth,
      blockedLimitMonth: mon.BLOCKED_LIMIT ?? 0,
      blockedSizeMonth: mon.BLOCKED_SIZE ?? 0,
      costTodayUsd,
      costMonthUsd,
      byModel: byModelMonth
        .map((m) => ({
          model: m.modelUsed,
          requests: m._count,
          inputTokens: m._sum.inputTokens ?? 0,
          outputTokens: m._sum.outputTokens ?? 0,
          costUsd: round2(m._sum.estimatedCost ?? 0),
          pct: monthTotal > 0 ? Math.round((m._count / monthTotal) * 100) : 0,
        }))
        .sort((a, b) => b.requests - a.requests),
    },
    subscriptions: {
      counts: planCounts,
      freeToPaidPct: totalUsers > 0 ? Math.round((paid / totalUsers) * 100) : null,
      atLimit: atFree + atPro,
      nearLimit: nearFree + nearPro,
      perPlan: PLAN_ORDER.map((id) => {
        const revenueSar = id === "PRO" ? planCounts.PRO * PRO_PRICE_SAR : id === "FREE" ? 0 : null;
        return {
          plan: id,
          planName: PLANS[id].name,
          users: planCounts[id],
          limit: PLANS[id].analysisLimit,
          avgUsage: planAvg[id],
          revenueSar,
          aiCostUsd: costByPlan[id],
          marginSar: revenueSar == null ? null : round2(revenueSar - costByPlan[id] * USD_TO_SAR),
        };
      }),
    },
    topConsumers,
    recentErrors,
    recentAnalyses,
    alerts,
    health,
  };
}

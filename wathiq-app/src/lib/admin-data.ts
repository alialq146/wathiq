/**
 * Admin dashboard data layer — server-only. Everything here is aggregation
 * queries (count / groupBy / sum); no table is ever loaded whole. Secrets are
 * reduced to Configured/Missing booleans and never leave the server as values.
 */

import { prisma } from "./db";
import { PLANS, PLAN_ORDER, getPlan, whatsappUpgradeLink, type PlanId } from "./plans";
import { getResolvedAiSettings, getResolvedPlan } from "@/lib/settings";
import { APP_VERSION } from "./version";

/** توجيه النموذج لكل خطة من الإعدادات (متغيّر البيئة يتقدّم) — خادمي بحت. */
async function planModelMap(): Promise<Record<PlanId, string>> {
  const ai = await getResolvedAiSettings();
  const pick = (id: PlanId) => process.env[`AI_MODEL_${id}`]?.trim() || ai.modelRouting[id] || ai.fallbackModel;
  return { FREE: pick("FREE"), PRO: pick("PRO"), ENTERPRISE: pick("ENTERPRISE") };
}
/** منحة نقاط كل خطة من الإعدادات. */
async function planCreditMap(): Promise<Record<PlanId, number>> {
  const [f, p, e] = await Promise.all([getResolvedPlan("FREE"), getResolvedPlan("PRO"), getResolvedPlan("ENTERPRISE")]);
  return { FREE: f.monthlyCredits, PRO: p.monthlyCredits, ENTERPRISE: e.monthlyCredits };
}

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
    model: string;
    estimatedCostUsd: number | null;
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
    modelUsed: r.model,
    estimatedCost: r.estimatedCostUsd,
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
      prisma.aiOperation.count(),
      prisma.aiOperation.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.aiOperation.findFirst({ where: { status: "COMMITTED" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.aiOperation.findFirst({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
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
      ? await prisma.aiOperation.count({ where: { status: "FAILED", createdAt: { gte: startOfToday() } } }).catch(() => 0)
      : 0;

  const [models, credits] = await Promise.all([planModelMap(), planCreditMap()]);

  return {
    db,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    appVersion: APP_VERSION,
    counts,
    lastAi: iso(lastAi),
    lastSuccess: iso(lastSuccess),
    lastFailed: iso(lastFailed),
    env,
    // توجيه النموذج إعداد خادمي (لا يُعرض للعميل النهائي) — يظهر للأدمن فقط.
    models: { free: models.FREE, pro: models.PRO, enterprise: models.ENTERPRISE },
    // «الحدود» الآن = منحة النقاط الشهرية لكل خطة.
    limits: { free: credits.FREE, pro: credits.PRO, enterprise: credits.ENTERPRISE },
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
    prisma.aiOperation.groupBy({ by: ["status"], _count: true }),
    prisma.aiOperation.groupBy({ by: ["status"], _count: true, where: { createdAt: { gte: month } } }),
    prisma.aiOperation.count({ where: { createdAt: { gte: today } } }),
    prisma.aiOperation.aggregate({ _sum: { estimatedCostUsd: true }, where: { createdAt: { gte: month } } }),
    prisma.aiOperation.aggregate({ _sum: { estimatedCostUsd: true }, where: { createdAt: { gte: today } } }),
    prisma.aiOperation.groupBy({
      by: ["model"],
      _count: true,
      _sum: { promptTokens: true, completionTokens: true, estimatedCostUsd: true },
      where: { createdAt: { gte: month } },
    }),
    prisma.user.groupBy({ by: ["plan"], _count: true, _avg: { aiCreditsUsed: true } }),
    prisma.aiOperation.findMany({
      where: { createdAt: { gte: month } },
      distinct: ["userId"],
      select: { userId: true },
      take: 5000,
    }),
    prisma.aiOperation.groupBy({
      by: ["userId"],
      _count: true,
      _sum: { estimatedCostUsd: true },
      where: { createdAt: { gte: month } },
      orderBy: { _count: { userId: "desc" } },
      take: 5,
    }),
    prisma.aiOperation.findMany({
      where: { status: { in: ["FAILED", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, status: true, model: true, estimatedCostUsd: true, errorMessage: true, userId: true },
    }),
    prisma.aiOperation.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, status: true, model: true, estimatedCostUsd: true, errorMessage: true, userId: true },
    }),
    getAdminHealth(),
  ]);

  const all = statusCounts(allByStatus);
  const mon = statusCounts(monthByStatus);
  const aiTotal = Object.values(all).reduce((a, b) => a + b, 0);
  const monthTotal = Object.values(mon).reduce((a, b) => a + b, 0);
  const costMonthUsd = round2(monthCost._sum.estimatedCostUsd ?? 0);
  const costTodayUsd = round2(todayCost._sum.estimatedCostUsd ?? 0);

  // Plans.
  const planCounts: Record<PlanId, number> = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
  const planAvg: Record<PlanId, number> = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
  for (const g of planGroups) {
    const id = getPlan(g.plan).id;
    planCounts[id] += g._count;
    planAvg[id] = round2(g._avg.aiCreditsUsed ?? 0);
  }
  const paid = planCounts.PRO + planCounts.ENTERPRISE;

  // مستخدمون بلغوا/قاربوا رصيد نقاطهم — يقارَن aiCreditsUsed بمنحة المستخدم
  // المخزّنة (aiCreditsGranted) عبر SQL خام (Prisma لا يقارن عمودين مباشرة).
  const nearThreshold = 0.8;
  const [atLimit, nearLimit] = await Promise.all([
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM "User"
      WHERE "aiCreditsGranted" > 0 AND "aiCreditsUsed" >= "aiCreditsGranted"`,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM "User"
      WHERE "aiCreditsGranted" > 0
        AND "aiCreditsUsed" >= CEIL("aiCreditsGranted" * ${nearThreshold})
        AND "aiCreditsUsed" < "aiCreditsGranted"`,
  ]);
  const atLimitCount = Number(atLimit[0]?.n ?? 0);
  const nearLimitCount = Number(nearLimit[0]?.n ?? 0);
  const creditsByPlan = await planCreditMap();

  // Finance (v1 estimates: PRO × 149 SAR; ENTERPRISE is manual/contact).
  const mrrSar = planCounts.PRO * PRO_PRICE_SAR;
  const aiCostMonthSar = round2(costMonthUsd * USD_TO_SAR);
  const successMonth = mon.COMMITTED ?? 0;

  // تكلفة كل خطة هذا الشهر — مباشرة من عمود `plan` على AiOperation (v2.6: دقيق،
  // لا استدلال من النموذج).
  const costByPlan: Record<PlanId, number> = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
  const planCostRows = await prisma.aiOperation.groupBy({
    by: ["plan"],
    _sum: { estimatedCostUsd: true },
    where: { createdAt: { gte: month }, status: "COMMITTED" },
  });
  for (const row of planCostRows) {
    const id = getPlan(row.plan).id;
    costByPlan[id] = round2(costByPlan[id] + (row._sum.estimatedCostUsd ?? 0));
  }

  // Top consumers: enrich with user info + blocked counts + dominant model.
  const topIds = topRows.map((r) => r.userId);
  const [topUsers, topBlocked, topModels] = await Promise.all([
    topIds.length
      ? prisma.user.findMany({ where: { id: { in: topIds } }, select: { id: true, name: true, email: true, plan: true } })
      : Promise.resolve([]),
    topIds.length
      ? prisma.aiOperation.groupBy({
          by: ["userId"],
          _count: true,
          where: { userId: { in: topIds }, status: "REJECTED", createdAt: { gte: month } },
        })
      : Promise.resolve([] as Array<{ userId: string; _count: number }>),
    topIds.length
      ? prisma.aiOperation.groupBy({
          by: ["userId", "model"],
          _count: true,
          where: { userId: { in: topIds }, createdAt: { gte: month } },
        })
      : Promise.resolve([] as Array<{ userId: string; model: string; _count: number }>),
  ]);
  const userById = new Map(topUsers.map((u) => [u.id, u]));
  const blockedById = new Map(topBlocked.map((b) => [b.userId, b._count]));
  const topModelById = new Map<string, { model: string; n: number }>();
  for (const row of topModels) {
    const cur = topModelById.get(row.userId);
    if (!cur || row._count > cur.n) topModelById.set(row.userId, { model: row.model, n: row._count });
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
      costUsd: round2(r._sum.estimatedCostUsd ?? 0),
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
  if (atLimitCount > 0)
    alerts.push({ severity: "success", text: `${atLimitCount} مستخدمًا استنفدوا رصيد نقاطهم — فرصة لترقيتهم أو رفع الرصيد.`, hint: "راجع تبويب المستخدمين." });
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
      aiSuccess: all.COMMITTED ?? 0,
      aiFailed: all.FAILED ?? 0,
      aiBlockedLimit: all.REJECTED ?? 0,
      aiBlockedSize: 0, // v2.6: رفض الحجم/المصادقة يُرفض قبل المحاسبة (لا يُسجَّل كعملية)
      aiBlockedAuth: 0,
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
      blockedLimitMonth: mon.REJECTED ?? 0,
      blockedSizeMonth: 0,
      costTodayUsd,
      costMonthUsd,
      byModel: byModelMonth
        .map((m) => ({
          model: m.model,
          requests: m._count,
          inputTokens: m._sum.promptTokens ?? 0,
          outputTokens: m._sum.completionTokens ?? 0,
          costUsd: round2(m._sum.estimatedCostUsd ?? 0),
          pct: monthTotal > 0 ? Math.round((m._count / monthTotal) * 100) : 0,
        }))
        .sort((a, b) => b.requests - a.requests),
    },
    subscriptions: {
      counts: planCounts,
      freeToPaidPct: totalUsers > 0 ? Math.round((paid / totalUsers) * 100) : null,
      atLimit: atLimitCount,
      nearLimit: nearLimitCount,
      perPlan: PLAN_ORDER.map((id) => {
        const revenueSar = id === "PRO" ? planCounts.PRO * PRO_PRICE_SAR : id === "FREE" ? 0 : null;
        return {
          plan: id,
          planName: PLANS[id].name,
          users: planCounts[id],
          limit: creditsByPlan[id], // منحة النقاط الشهرية
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

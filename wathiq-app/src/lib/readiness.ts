/**
 * محرك جاهزية المشروع والوثائق (v2.3) — خدمة مركزية واحدة:
 *
 * - `computeReadiness` نقية بالكامل (بيانات + إعدادات → نتيجة): قابلة للاختبار،
 *   مستقلة عن الواجهة، وتُعاد استخدامها في الصفحة والتصدير والبطاقة المختصرة.
 * - لا تستدعي أي نموذج ذكاء اصطناعي أبدًا ولا تستهلك حصة المستخدم —
 *   تعتمد على البيانات المحفوظة ونتائج التحليلات السابقة والقواعد البرمجية.
 * - الوثيقة غير المطلوبة (NOT_APPLICABLE) لا تدخل الحساب إطلاقًا ولا تُمنح
 *   صفرًا؛ الاختيارية تُحسب مستقلة ولا تؤثر على درجة المشروع العامة.
 * - عند استبعاد محور غير منطبق تُعاد تطبيع الأوزان على المحاور المطبقة —
 *   بحماية كاملة من القسمة على صفر وNaN والقيم السالبة وتجاوز 100.
 */

import { prisma } from "./db";
import { Prisma } from "@prisma/client";
import { getReadinessSettings, getSystemSettings } from "@/lib/settings";
import type { ReadinessSettings, DocumentApplicability } from "@/lib/settings/types";
import { arReqCount } from "@/lib/arabic";

/* ---------------- الأنواع ---------------- */

export type IssueSeverity = "critical" | "important" | "optional";
export type IssueScope = "project" | "requirements" | "brd" | "srs";
export type AxisKey = "context" | "requirements" | "quality" | "acceptance" | "questions" | "status" | "docData";
export type ReadinessStatus = "ready" | "ready_with_notes" | "needs_work" | "not_ready";

export interface ReadinessIssue {
  code: string;
  severity: IssueSeverity;
  scope: IssueScope;
  title: string;
  description: string;
  count: number;
  entityType?: "project" | "requirement" | "document";
  entityId?: string | null;
  /** إجراء رمزي تفهمه الواجهة (تنقّل داخل مساحة العمل) — ليس URL خارجيًا. */
  fixAction?: string;
  actionLabel?: string;
}

export interface AxisResult {
  key: AxisKey;
  label: string;
  score: number;
  weight: number;
  applied: boolean;
  weightedScore: number;
  status: ReadinessStatus;
  issues: ReadinessIssue[];
  metrics: Record<string, number>;
}

export interface DocReadiness {
  type: "BRD" | "SRS";
  applicability: Exclude<DocumentApplicability, "NOT_APPLICABLE">;
  score: number;
  status: ReadinessStatus;
  statusLabel: string;
  criticalCount: number;
  importantCount: number;
  topIssues: ReadinessIssue[];
}

export interface RequirementsSummary {
  total: number;
  approved: number;
  inReview: number;
  drafts: number;
  needsInfo: number;
  blocked: number;
  withoutCriteria: number;
  notAnalyzed: number;
  lowQuality: number;
  openQuestions: number;
}

/**
 * إجراء مُرتَّب بالأثر — «ماذا يفعل المستخدم الآن». يُشتق من الملاحظات القائمة
 * بمحاكاة «ماذا لو أُصلح هذا» وإعادة حساب الدرجة. `scoreGain`/`estimated` للترتيب
 * الداخلي فقط؛ الواجهة تعرض `directive` + زرًا ينقل إلى `fixAction`.
 */
export interface RankedAction {
  code: string;
  severity: IssueSeverity;
  /** جملة أمر قصيرة تُعرض للمستخدم (ماذا يفعل الآن). */
  directive: string;
  /** هدف تنقّل رمزي تفهمه مساحة العمل (requirements | context | requirement:<id>). */
  fixAction: string;
  /** مقدار ارتفاع الدرجة العامة عند التنفيذ — للترتيب الداخلي، لا يُعرض. */
  scoreGain: number;
  /** أثر تقديري (يعتمد على تحليل لاحق) لا دقيق — للترتيب فقط. */
  estimated: boolean;
  /** إن أصبح تصدير وثيقة مطلوبة ممكنًا بعد التنفيذ (سياسة block_critical). */
  unlocksExport: "BRD" | "SRS" | null;
}

export interface ReadinessResult {
  overallScore: number;
  overallStatus: ReadinessStatus;
  statusLabel: string;
  statusMessage: string;
  axes: AxisResult[];
  issues: ReadinessIssue[];
  counts: { critical: number; important: number; optional: number };
  documents: { brd: DocReadiness | null; srs: DocReadiness | null };
  requirementsSummary: RequirementsSummary;
  /** الإجراءات الأعلى أثرًا — تُحسب في المسار الخادمي عند الطلب فقط (v2.7). */
  topActions?: RankedAction[];
  calculatedAt: string;
  calculationVersion: number;
}

export const CALCULATION_VERSION = 1;

export const READINESS_STATUS_AR: Record<ReadinessStatus, string> = {
  ready: "جاهز للإصدار",
  ready_with_notes: "جاهز مع ملاحظات",
  needs_work: "يحتاج استكمال",
  not_ready: "غير جاهز",
};

export const AXIS_LABELS: Record<AxisKey, string> = {
  context: "اكتمال سياق المشروع",
  requirements: "اكتمال المتطلبات",
  quality: "جودة المتطلبات",
  acceptance: "معايير القبول وقابلية الاختبار",
  questions: "الأسئلة والمعلومات الناقصة",
  status: "حالة المتطلبات والاعتماد",
  docData: "بيانات الوثائق المطلوبة",
};

/* ---------------- مدخلات الحساب (نقية — بلا Prisma) ---------------- */

export interface ReadinessProjectInput {
  name: string;
  description: string | null;
  client: string | null;
  projectIdea: string | null;
  projectGoal: string | null;
  targetUsers: string | null;
  projectScope: string | null;
  outOfScope: string | null;
  relatedSystems: string | null;
  constraints: string | null;
  brdApplicability: DocumentApplicability;
  srsApplicability: DocumentApplicability;
}
export interface ReadinessRequirementInput {
  id: string;
  title: string;
  description: string;
  status: string; // draft | analyzing | review | needs_info | approved | blocked
  priority: string; // critical | high | medium | low
  type: string | null;
  source: string | null;
  stakeholders: string[];
  notes: string | null;
  qualityScore: number | null; // من التحليل المحفوظ — null = لم يُحلل
  missingInfoCount: number; // من التحليل المحفوظ
  criteriaCount: number;
}
export interface ReadinessInput {
  project: ReadinessProjectInput | null;
  requirements: ReadinessRequirementInput[];
  openQuestionsUnanswered: number;
}

/* ---------------- أدوات آمنة ---------------- */

const clampScore = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};
const pct = (part: number, total: number): number => (total > 0 ? (part / total) * 100 : 0);
const filled = (v: string | null | undefined): boolean => typeof v === "string" && v.trim().length > 0;

function statusFor(score: number, t: ReadinessSettings["thresholds"]): ReadinessStatus {
  if (score >= t.readyMin) return "ready";
  if (score >= t.notesMin) return "ready_with_notes";
  if (score >= t.needsWorkMin) return "needs_work";
  return "not_ready";
}

/* ---------------- الحساب النقي ---------------- */

export function computeReadiness(input: ReadinessInput, s: ReadinessSettings, now = new Date()): ReadinessResult {
  const p = input.project;
  const reqs = input.requirements;
  const total = reqs.length;

  const brdApp = p?.brdApplicability ?? "REQUIRED";
  const srsApp = p?.srsApplicability ?? "REQUIRED";
  const hasRequiredDoc = brdApp === "REQUIRED" || srsApp === "REQUIRED";

  const issues: ReadinessIssue[] = [];
  const axes: AxisResult[] = [];
  const push = (i: ReadinessIssue) => { if (i.count > 0) issues.push(i); };

  /* ملخص المتطلبات */
  const byStatus = (st: string) => reqs.filter((r) => r.status === st).length;
  const withoutCriteria = reqs.filter((r) => r.criteriaCount < Math.max(1, s.minCriteriaPerRequirement));
  const analyzed = reqs.filter((r) => r.qualityScore != null);
  const lowQuality = analyzed.filter((r) => (r.qualityScore ?? 0) < s.minQualityScore);
  const summary: RequirementsSummary = {
    total,
    approved: byStatus("approved"),
    inReview: byStatus("review") + byStatus("analyzing"),
    drafts: byStatus("draft"),
    needsInfo: byStatus("needs_info"),
    blocked: byStatus("blocked"),
    withoutCriteria: withoutCriteria.length,
    notAnalyzed: total - analyzed.length,
    lowQuality: lowQuality.length,
    openQuestions: input.openQuestionsUnanswered,
  };

  /* ── 1) اكتمال سياق المشروع ── */
  {
    const fields: Array<[string, boolean, IssueSeverity, string, string]> = [
      // [الاسم، ممتلئ؟، خطورة غيابه، عنوان الملاحظة، fixAction]
      ["الوصف", filled(p?.description), "critical", "لا يوجد وصف للمشروع", "context"],
      ["الهدف العام", filled(p?.projectGoal), "important", "هدف المشروع غير موثق", "context"],
      ["النطاق", filled(p?.projectScope), "important", "نطاق المشروع غير موثق", "context"],
      ["خارج النطاق", filled(p?.outOfScope), "optional", "لم تُحدد عناصر خارج النطاق", "context"],
      ["المستخدمون المستهدفون", filled(p?.targetUsers), "important", "المستخدمون المستهدفون غير محددين", "context"],
      ["الجهة / العميل", filled(p?.client), "optional", "الجهة أو العميل غير محدد", "context"],
      ["فكرة المشروع", filled(p?.projectIdea), "optional", "سياق المشروع وسبب الحاجة غير موثق", "context"],
      ["الأنظمة المرتبطة", filled(p?.relatedSystems), "optional", "الأنظمة أو التكاملات المرتبطة غير موثقة", "context"],
      ["القيود", filled(p?.constraints), "optional", "قيود المشروع غير موثقة", "context"],
    ];
    const done = fields.filter(([, ok]) => ok).length;
    const score = clampScore(pct(done, fields.length));
    const axisIssues: ReadinessIssue[] = [];
    for (const [name, ok, sev, title, fix] of fields) {
      if (!ok) {
        axisIssues.push({
          code: `context_missing_${name}`, severity: p ? sev : "critical", scope: "project",
          title, description: `حقل «${name}» يحسّن دقة الوثائق والتحليل — يوصى باستكماله من سياق المشروع.`,
          count: 1, entityType: "project", fixAction: fix, actionLabel: "أكمل سياق المشروع",
        });
      }
    }
    axisIssues.forEach(push);
    axes.push({
      key: "context", label: AXIS_LABELS.context, score, weight: s.weights.context,
      applied: true, weightedScore: 0, status: statusFor(score, s.thresholds), issues: axisIssues,
      metrics: { fieldsTotal: fields.length, fieldsFilled: done },
    });
  }

  /* ── 2) اكتمال المتطلبات ── */
  {
    const applied = true; // يبقى مطبقًا حتى مع مشروع فارغ — غيابها نقص حرج
    let score = 0;
    const axisIssues: ReadinessIssue[] = [];
    if (total === 0) {
      axisIssues.push({
        code: "no_requirements", severity: "critical", scope: "requirements",
        title: "لا توجد متطلبات في المشروع",
        description: "أضف المتطلبات يدويًا أو عبر تحليل وثيقة قبل إصدار أي وثيقة.",
        count: 1, entityType: "project", fixAction: "requirements", actionLabel: "أضف المتطلبات",
      });
    } else {
      // اكتمال كل متطلب: أساسيات (عنوان + وصف كافٍ + نوع) 70% وإثراء 30%.
      let sum = 0;
      let weakDesc = 0, noType = 0, noSource = 0, noStakeholders = 0;
      for (const r of reqs) {
        const core = (filled(r.title) ? 1 : 0) + (r.description.trim().length >= 20 ? 1 : 0) + (filled(r.type) ? 1 : 0);
        const extra = (filled(r.source) ? 1 : 0) + (r.stakeholders.length > 0 ? 1 : 0) + (filled(r.notes) ? 1 : 0);
        sum += (core / 3) * 70 + (extra / 3) * 30;
        if (r.description.trim().length < 20) weakDesc++;
        if (!filled(r.type)) noType++;
        if (!filled(r.source)) noSource++;
        if (r.stakeholders.length === 0) noStakeholders++;
      }
      score = clampScore(sum / total);
      if (weakDesc) axisIssues.push({ code: "weak_descriptions", severity: "important", scope: "requirements", title: `${weakDesc} متطلبًا بوصف قصير جدًا`, description: "الوصف القصير يضعف الوثائق والتحليل — يوصى بتفصيله.", count: weakDesc, entityType: "requirement", fixAction: "requirements", actionLabel: "راجع المتطلبات" });
      if (noType) axisIssues.push({ code: "missing_type", severity: "optional", scope: "requirements", title: `${noType} متطلبًا بلا نوع محدد`, description: "تحديد النوع (وظيفي/غير وظيفي/قيد) يحسّن تنظيم SRS.", count: noType, entityType: "requirement", fixAction: "requirements", actionLabel: "راجع المتطلبات" });
      if (noStakeholders === total) axisIssues.push({ code: "no_stakeholders", severity: "important", scope: "requirements", title: "أصحاب المصلحة غير مكتملين", description: "لا يوجد أي متطلب مرتبط بصاحب مصلحة.", count: 1, entityType: "project", fixAction: "requirements", actionLabel: "أضف أصحاب المصلحة" });
      if (noSource === total && total > 2) axisIssues.push({ code: "no_sources", severity: "optional", scope: "requirements", title: "مصادر المتطلبات غير موثقة", description: "توثيق المصدر يقوي تتبع المتطلبات.", count: 1, fixAction: "requirements", actionLabel: "راجع المتطلبات" });
    }
    axisIssues.forEach(push);
    axes.push({
      key: "requirements", label: AXIS_LABELS.requirements, score, weight: s.weights.requirements,
      applied, weightedScore: 0, status: statusFor(score, s.thresholds), issues: axisIssues,
      metrics: { total },
    });
  }

  /* ── 3) جودة المتطلبات (من التحليلات المحفوظة فقط — لا AI هنا أبدًا) ── */
  {
    const applied = total > 0 && s.missingAnalysisPolicy !== "ignore";
    let score = 0;
    const axisIssues: ReadinessIssue[] = [];
    if (applied) {
      const avg = analyzed.length ? analyzed.reduce((a, r) => a + (r.qualityScore ?? 0), 0) / analyzed.length : 0;
      const coverage = analyzed.length / total;
      score = clampScore(avg * coverage);
      const notAnalyzed = total - analyzed.length;
      if (notAnalyzed > 0) {
        const sev: IssueSeverity = s.missingAnalysisPolicy === "note" ? "optional" : "important";
        axisIssues.push({
          code: "not_analyzed", severity: sev, scope: "requirements",
          title: `${notAnalyzed} متطلبًا لم يتم تحليل جودته بعد`,
          description: "شغّل تحليل الجودة من صفحة المتطلب عندما تريد — لا يُشغَّل تلقائيًا ولا يستهلك حصتك من هنا.",
          count: notAnalyzed, entityType: "requirement", fixAction: "requirements", actionLabel: "حلّل الجودة",
        });
      }
      if (lowQuality.length) {
        axisIssues.push({
          code: "low_quality", severity: "important", scope: "requirements",
          title: `${lowQuality.length} متطلبًا بدرجة جودة منخفضة`,
          description: `درجة الجودة أقل من الحد الأدنى (${s.minQualityScore}) — يوصى بتحسين الصياغة.`,
          count: lowQuality.length, entityType: "requirement",
          entityId: lowQuality[0]?.id ?? null, fixAction: "requirements", actionLabel: "راجع المتطلبات",
        });
      }
    }
    axisIssues.forEach(push);
    axes.push({
      key: "quality", label: AXIS_LABELS.quality, score, weight: s.weights.quality,
      applied, weightedScore: 0, status: statusFor(score, s.thresholds), issues: axisIssues,
      metrics: { analyzed: analyzed.length, notAnalyzed: total - analyzed.length, lowQuality: lowQuality.length },
    });
  }

  /* ── 4) معايير القبول وقابلية الاختبار ── */
  {
    const applied = total > 0;
    let score = 0;
    const axisIssues: ReadinessIssue[] = [];
    if (applied) {
      score = clampScore(pct(total - withoutCriteria.length, total));
      const criticalNoCriteria = withoutCriteria.filter((r) => r.priority === "critical" || r.priority === "high");
      if (s.criticalNoCriteriaForCritical && criticalNoCriteria.length) {
        axisIssues.push({
          code: "critical_without_criteria", severity: "critical", scope: "requirements",
          title: `${criticalNoCriteria.length} متطلبًا رئيسيًا بلا معايير قبول`,
          description: "المتطلبات الحرجة/العالية بلا معايير قبول خطر مباشر على الاختبار والاعتماد.",
          count: criticalNoCriteria.length, entityType: "requirement",
          entityId: criticalNoCriteria[0]?.id ?? null, fixAction: `requirement:${criticalNoCriteria[0]?.id ?? ""}`, actionLabel: "أضف معايير القبول",
        });
      }
      const rest = withoutCriteria.length - (s.criticalNoCriteriaForCritical ? criticalNoCriteria.length : 0);
      if (rest > 0 || (!s.criticalNoCriteriaForCritical && withoutCriteria.length)) {
        const cnt = s.criticalNoCriteriaForCritical ? rest : withoutCriteria.length;
        if (cnt > 0) axisIssues.push({
          code: "without_criteria", severity: s.requireAcceptanceCriteria ? "critical" : "important", scope: "requirements",
          title: `${cnt} متطلبًا بلا معايير قبول`,
          description: "معايير القبول تجعل المتطلب قابلًا للاختبار والاعتماد.",
          count: cnt, entityType: "requirement", fixAction: "requirements", actionLabel: "أضف معايير القبول",
        });
      }
    }
    axisIssues.forEach(push);
    axes.push({
      key: "acceptance", label: AXIS_LABELS.acceptance, score, weight: s.weights.acceptance,
      applied, weightedScore: 0, status: statusFor(score, s.thresholds), issues: axisIssues,
      metrics: { totalRequirements: total, requirementsWithCriteria: total - withoutCriteria.length, requirementsWithoutCriteria: withoutCriteria.length },
    });
  }

  /* ── 5) الأسئلة والمعلومات الناقصة ── */
  {
    const unanswered = input.openQuestionsUnanswered;
    const missingInfoItems = reqs.reduce((a, r) => a + r.missingInfoCount, 0);
    const anySignal = total > 0 || unanswered > 0;
    const applied = anySignal;
    let score = 0;
    const axisIssues: ReadinessIssue[] = [];
    if (applied) {
      // عقوبات نسبية محسوبة وموثقة — بلا NaN وبقصّ [0,100].
      const penalty = unanswered * 8 + summary.needsInfo * 12 + summary.blocked * 15 + Math.min(20, missingInfoItems * 2);
      score = clampScore(100 - penalty);
      if (summary.blocked) {
        const blockedCritical = reqs.filter((r) => r.status === "blocked" && (r.priority === "critical" || r.priority === "high")).length;
        axisIssues.push({
          code: "blocked_requirements", severity: blockedCritical > 0 ? "critical" : "important", scope: "requirements",
          title: blockedCritical > 0 ? `${blockedCritical} متطلبًا رئيسيًا محظورًا` : `${summary.blocked} متطلبًا محظورًا`,
          description: "المتطلبات المحظورة تحتاج قرارًا أو حلًا قبل التسليم.",
          count: summary.blocked, entityType: "requirement", fixAction: "requirements", actionLabel: "راجع المتطلبات",
        });
      }
      if (summary.needsInfo) axisIssues.push({
        code: "needs_info", severity: summary.needsInfo >= Math.max(2, Math.ceil(total * 0.3)) ? "critical" : "important", scope: "requirements",
        title: `${summary.needsInfo} متطلبًا بحاجة لمعلومات`,
        description: "معلومات ناقصة تمنع اعتماد هذه المتطلبات.",
        count: summary.needsInfo, entityType: "requirement", fixAction: "requirements", actionLabel: "راجع المتطلبات",
      });
      if (unanswered) axisIssues.push({
        code: "open_questions", severity: "important", scope: "requirements",
        title: `${unanswered} سؤالًا مفتوحًا بلا إجابة`,
        description: "إجابات أصحاب المصلحة تسد النواقص قبل إصدار الوثائق.",
        count: unanswered, entityType: "requirement", fixAction: "requirements", actionLabel: "أجب عن الأسئلة",
      });
    }
    axisIssues.forEach(push);
    axes.push({
      key: "questions", label: AXIS_LABELS.questions, score, weight: s.weights.questions,
      applied, weightedScore: 0, status: statusFor(score, s.thresholds), issues: axisIssues,
      metrics: { unanswered, needsInfo: summary.needsInfo, blocked: summary.blocked, missingInfoItems },
    });
  }

  /* ── 6) حالة المتطلبات والاعتماد ── */
  {
    const applied = total > 0;
    let score = 0;
    const axisIssues: ReadinessIssue[] = [];
    if (applied) {
      const approvedPct = pct(summary.approved, total);
      const draftPct = pct(summary.drafts, total);
      score = clampScore(approvedPct * 0.7 + (100 - draftPct) * 0.3);
      if (draftPct >= 50) axisIssues.push({
        code: "many_drafts", severity: "important", scope: "requirements",
        title: `${summary.drafts} متطلبًا ما زال مسودة`,
        description: "نسبة عالية من المسودات — راجعها واعتمد الجاهز منها.",
        count: summary.drafts, entityType: "requirement", fixAction: "requirements", actionLabel: "راجع المتطلبات",
      });
      if (s.minApprovedPercent > 0 && approvedPct < s.minApprovedPercent) axisIssues.push({
        code: "approved_below_min", severity: "important", scope: "requirements",
        title: `نسبة الاعتماد ${Math.round(approvedPct)}% أقل من الحد الأدنى (${s.minApprovedPercent}%)`,
        description: "اعتمد المزيد من المتطلبات قبل التسليم.",
        count: 1, fixAction: "requirements", actionLabel: "راجع المتطلبات",
      });
    }
    axisIssues.forEach(push);
    axes.push({
      key: "status", label: AXIS_LABELS.status, score, weight: s.weights.status,
      applied, weightedScore: 0, status: statusFor(score, s.thresholds), issues: axisIssues,
      metrics: { approved: summary.approved, drafts: summary.drafts, inReview: summary.inReview },
    });
  }

  /* ── 7) بيانات الوثائق المطلوبة — للوثائق REQUIRED فقط في الدرجة العامة ── */
  const docFieldsScore = (doc: "BRD" | "SRS"): { score: number; issues: ReadinessIssue[] } => {
    const scope: IssueScope = doc === "BRD" ? "brd" : "srs";
    const fields: Array<[string, boolean]> =
      doc === "BRD"
        ? [["وصف المشروع", filled(p?.description)], ["الهدف العام", filled(p?.projectGoal)], ["النطاق", filled(p?.projectScope)], ["الجهة / العميل", filled(p?.client)], ["أصحاب المصلحة", reqs.some((r) => r.stakeholders.length > 0)]]
        : [["وصف المشروع", filled(p?.description)], ["المستخدمون المستهدفون", filled(p?.targetUsers)], ["متطلبات وظيفية", reqs.some((r) => r.type !== "قيد")], ["معايير قبول", reqs.some((r) => r.criteriaCount > 0)]];
    const done = fields.filter(([, ok]) => ok).length;
    const missing = fields.filter(([, ok]) => !ok).map(([n]) => n);
    const docIssues: ReadinessIssue[] = missing.length
      ? [{
          code: `${doc.toLowerCase()}_data_missing`, severity: done === 0 ? "critical" : "important", scope,
          title: `بيانات ناقصة لوثيقة ${doc}: ${missing.join("، ")}`,
          description: "توجد معلومات مطلوبة قبل إصدار الوثيقة.",
          count: missing.length, entityType: "document", fixAction: "context",
          actionLabel: doc === "BRD" ? "أكمل بيانات BRD" : "أكمل بيانات SRS",
        }]
      : [];
    return { score: clampScore(pct(done, fields.length)), issues: docIssues };
  };

  {
    const applied = hasRequiredDoc; // لا يُفحص محور بيانات وثيقة غير مطلوبة
    let score = 0;
    const axisIssues: ReadinessIssue[] = [];
    if (applied) {
      const parts: number[] = [];
      if (brdApp === "REQUIRED") { const r = docFieldsScore("BRD"); parts.push(r.score); axisIssues.push(...r.issues); }
      if (srsApp === "REQUIRED") { const r = docFieldsScore("SRS"); parts.push(r.score); axisIssues.push(...r.issues); }
      score = clampScore(parts.reduce((a, x) => a + x, 0) / Math.max(1, parts.length));
    }
    axisIssues.forEach(push);
    axes.push({
      key: "docData", label: AXIS_LABELS.docData, score, weight: s.weights.docData,
      applied, weightedScore: 0, status: statusFor(score, s.thresholds), issues: axisIssues,
      metrics: { requiredDocs: (brdApp === "REQUIRED" ? 1 : 0) + (srsApp === "REQUIRED" ? 1 : 0) },
    });
  }

  /* ── الدرجة العامة: تطبيع الأوزان على المحاور المطبقة فقط ── */
  const appliedAxes = axes.filter((a) => a.applied);
  const weightSum = appliedAxes.reduce((a, x) => a + x.weight, 0);
  for (const a of axes) a.weightedScore = a.applied ? Math.round(((a.score * a.weight) / 100) * 10) / 10 : 0;
  const overallScore = weightSum > 0
    ? clampScore(appliedAxes.reduce((a, x) => a + x.score * x.weight, 0) / weightSum)
    : 0;
  const overallStatus = statusFor(overallScore, s.thresholds);

  /* ── جاهزية الوثائق المفعلة (REQUIRED/OPTIONAL) — مستقلة عن العامة ── */
  const axisScore = (k: AxisKey) => axes.find((a) => a.key === k);
  const buildDoc = (doc: "BRD" | "SRS", app: DocumentApplicability, enabled: boolean): DocReadiness | null => {
    if (app === "NOT_APPLICABLE" || !enabled) return null;
    const own = docFieldsScore(doc);
    // مزيج داخلي موثق: سياق 25% + اكتمال 20% + جودة 15% + معايير (SRS 25 / BRD 10) + بيانات الوثيقة (BRD 30 / SRS 15).
    const mix: Array<[AxisKey | "own", number]> = doc === "BRD"
      ? [["context", 25], ["requirements", 20], ["quality", 15], ["acceptance", 10], ["own", 30]]
      : [["context", 25], ["requirements", 20], ["quality", 15], ["acceptance", 25], ["own", 15]];
    let num = 0, den = 0;
    for (const [k, w] of mix) {
      const ax = k === "own" ? { score: own.score, applied: true } : axisScore(k as AxisKey);
      if (ax && ax.applied) { num += ax.score * w; den += w; }
    }
    const score = den > 0 ? clampScore(num / den) : 0;
    const scope: IssueScope = doc === "BRD" ? "brd" : "srs";
    const docIssues = [
      ...own.issues,
      ...issues.filter((i) => i.severity === "critical" && i.scope !== "brd" && i.scope !== "srs"),
    ].map((i) => ({ ...i, scope: i.scope === "project" || i.scope === "requirements" ? i.scope : scope }));
    const criticalCount = docIssues.filter((i) => i.severity === "critical").length;
    const importantCount = docIssues.filter((i) => i.severity === "important").length;
    const st = statusFor(score, s.thresholds);
    return {
      type: doc, applicability: app as "REQUIRED" | "OPTIONAL", score, status: st,
      statusLabel: READINESS_STATUS_AR[st], criticalCount, importantCount,
      topIssues: docIssues.slice(0, 5),
    };
  };

  const documents = {
    brd: buildDoc("BRD", brdApp, s.brdReadinessEnabled),
    srs: buildDoc("SRS", srsApp, s.srsReadinessEnabled),
  };

  const counts = {
    critical: issues.filter((i) => i.severity === "critical").length,
    important: issues.filter((i) => i.severity === "important").length,
    optional: issues.filter((i) => i.severity === "optional").length,
  };
  const order: Record<IssueSeverity, number> = { critical: 0, important: 1, optional: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  const statusMessage =
    overallStatus === "ready" ? "المشروع جاهز للتسليم وإصدار الوثائق المطلوبة."
    : overallStatus === "ready_with_notes" ? "المشروع جاهز مع ملاحظات — يُنصح بمراجعتها قبل الإصدار."
    : overallStatus === "needs_work" ? `يوجد ${counts.critical + counts.important} إجراءً مهمًا قبل اكتمال المشروع.`
    : "المشروع غير جاهز بعد — ابدأ بمعالجة النواقص الحرجة.";

  return {
    overallScore, overallStatus, statusLabel: READINESS_STATUS_AR[overallStatus], statusMessage,
    axes, issues, counts, documents, requirementsSummary: summary,
    calculatedAt: now.toISOString(), calculationVersion: CALCULATION_VERSION,
  };
}

/* ---------------- الترتيب بالأثر: «ماذا يفعل المستخدم الآن» ---------------- */

/** نسخة سطحية كافية للمحاكاة (المُحلِّلات تعدّل حقول المشروع/المتطلبات فقط). */
function cloneInput(input: ReadinessInput): ReadinessInput {
  return {
    project: input.project ? { ...input.project } : null,
    requirements: input.requirements.map((r) => ({ ...r, stakeholders: [...r.stakeholders] })),
    openQuestionsUnanswered: input.openQuestionsUnanswered,
  };
}

/** حقول السياق النصية فقط (تُستثنى حقول قابلية الوثائق). */
type ContextFieldKey =
  | "description" | "projectGoal" | "projectScope" | "outOfScope" | "targetUsers"
  | "client" | "projectIdea" | "relatedSystems" | "constraints";

/** ربط كود ملاحظة السياق بحقل المشروع المقابل (الأكواد مُولَّدة في المحور 1). */
const CONTEXT_FIELD_BY_CODE: Record<string, ContextFieldKey> = {
  "context_missing_الوصف": "description",
  "context_missing_الهدف العام": "projectGoal",
  "context_missing_النطاق": "projectScope",
  "context_missing_خارج النطاق": "outOfScope",
  "context_missing_المستخدمون المستهدفون": "targetUsers",
  "context_missing_الجهة / العميل": "client",
  "context_missing_فكرة المشروع": "projectIdea",
  "context_missing_الأنظمة المرتبطة": "relatedSystems",
  "context_missing_القيود": "constraints",
};

/** أكواد تُعالَج بإجراء واحد — تُدمج بعد الترتيب لتفادي تكرار البطاقات. */
const ACTION_GROUP: Record<string, string> = {
  without_criteria: "criteria",
  critical_without_criteria: "criteria",
};

const FILL = "—مُكمَّل—";
const FILL_LONG = "وصف تفصيلي كافٍ للمتطلب (محاكاة تقدير الأثر فقط).";

/** يُنتج مدخلًا مُحاكى «كأنّ هذه الملاحظة عولجت»، أو null إن تعذّرت محاكاتها. */
function simulateFix(input: ReadinessInput, issue: ReadinessIssue, s: ReadinessSettings): ReadinessInput | null {
  if (issue.code === "no_requirements") return null;
  const inp = cloneInput(input);
  const p = inp.project;
  const reqs = inp.requirements;
  const minCrit = Math.max(1, s.minCriteriaPerRequirement);

  if (issue.code.startsWith("context_missing_")) {
    if (!p) return null;
    const key = CONTEXT_FIELD_BY_CODE[issue.code];
    if (!key) return null;
    p[key] = FILL;
    return inp;
  }

  switch (issue.code) {
    case "weak_descriptions":
      for (const r of reqs) if (r.description.trim().length < 20) r.description = FILL_LONG;
      return inp;
    case "missing_type":
      for (const r of reqs) if (!filled(r.type)) r.type = "وظيفي";
      return inp;
    case "no_stakeholders":
      for (const r of reqs) if (r.stakeholders.length === 0) r.stakeholders = ["صاحب مصلحة"];
      return inp;
    case "no_sources":
      for (const r of reqs) if (!filled(r.source)) r.source = "مصدر";
      return inp;
    case "not_analyzed":
    case "low_quality": {
      // تقديري: تغطية كاملة بمتوسط الجودة الحالي (أو الحد الأدنى إن لا تحليل بعد).
      const done = reqs.filter((r) => r.qualityScore != null);
      const avg = done.length ? done.reduce((a, r) => a + (r.qualityScore ?? 0), 0) / done.length : s.minQualityScore;
      const target = Math.max(s.minQualityScore, Math.round(avg));
      for (const r of reqs) {
        if (r.qualityScore == null) r.qualityScore = target;
        else if (r.qualityScore < s.minQualityScore) r.qualityScore = s.minQualityScore;
      }
      return inp;
    }
    case "without_criteria":
    case "critical_without_criteria":
      for (const r of reqs) if (r.criteriaCount < minCrit) r.criteriaCount = minCrit;
      return inp;
    case "blocked_requirements":
      for (const r of reqs) if (r.status === "blocked") r.status = "review";
      return inp;
    case "needs_info":
      for (const r of reqs) if (r.status === "needs_info") r.status = "review";
      return inp;
    case "many_drafts":
    case "approved_below_min":
      for (const r of reqs) if (r.status === "draft") r.status = "approved";
      return inp;
    case "open_questions":
      inp.openQuestionsUnanswered = 0;
      return inp;
    case "brd_data_missing":
    case "srs_data_missing": {
      if (p) for (const k of ["description", "projectGoal", "projectScope", "client", "targetUsers"] as const) {
        if (!filled(p[k])) p[k] = FILL;
      }
      for (const r of reqs) {
        if (r.stakeholders.length === 0) r.stakeholders = ["صاحب مصلحة"];
        if (r.criteriaCount < 1) r.criteriaCount = 1;
        if (!filled(r.type)) r.type = "وظيفي";
      }
      return inp;
    }
    default:
      return null;
  }
}

/** جملة أمر قصيرة (ماذا يفعل الآن) — تُفضَّل على وصف الملاحظة التقني. */
function directiveFor(issue: ReadinessIssue): string {
  const n = issue.count;
  switch (issue.code) {
    case "without_criteria":
    case "critical_without_criteria": return `أضف معايير القبول إلى ${arReqCount(n)}`;
    case "open_questions": return `أجب عن ${n} من الأسئلة المفتوحة`;
    case "needs_info": return `استكمل معلومات ${arReqCount(n)}`;
    case "blocked_requirements": return `عالج المتطلبات المحظورة (${n})`;
    case "many_drafts": return `اعتمد ${arReqCount(n)} من المسودات`;
    case "approved_below_min": return "اعتمد مزيدًا من المتطلبات";
    case "weak_descriptions": return `فصّل وصف ${arReqCount(n)}`;
    case "not_analyzed": return `حلّل جودة ${arReqCount(n)}`;
    case "low_quality": return `حسّن صياغة ${arReqCount(n)}`;
    case "no_stakeholders": return "أضف أصحاب المصلحة للمتطلبات";
    case "no_sources": return "وثّق مصادر المتطلبات";
    case "missing_type": return `حدّد نوع ${arReqCount(n)}`;
    case "no_requirements": return "أضف أول متطلبات المشروع";
    default: return issue.title; // السياق وبيانات الوثائق: العنوان واضح بذاته
  }
}

function exportUnlocked(before: ReadinessResult, after: ReadinessResult, doc: "BRD" | "SRS"): boolean {
  const b = doc === "BRD" ? before.documents.brd : before.documents.srs;
  const a = doc === "BRD" ? after.documents.brd : after.documents.srs;
  if (!b || !a) return false;
  return b.applicability === "REQUIRED" && b.criticalCount > 0 && a.criticalCount === 0;
}

/**
 * يرتّب الملاحظات القابلة للتنفيذ حسب أثرها الفعلي على الجاهزية — نقيّ بالكامل:
 * لكل ملاحظة يُحاكى «كأنها عولجت» ثم يُعاد حساب الدرجة. الترتيب: يفتح تصديرًا ←
 * الأعلى رفعًا للدرجة ← الأشد خطورة. تُدمج الأكواد المتشابهة في إجراء واحد.
 */
export function rankActionsByImpact(input: ReadinessInput, s: ReadinessSettings, base?: ReadinessResult): RankedAction[] {
  const b = base ?? computeReadiness(input, s);
  const seen = new Set<string>();
  const actions: RankedAction[] = [];
  for (const issue of b.issues) {
    if (!issue.fixAction || seen.has(issue.code)) continue;
    seen.add(issue.code);
    const sim = simulateFix(input, issue, s);
    let scoreGain = 0;
    let unlocks: "BRD" | "SRS" | null = null;
    if (sim) {
      const after = computeReadiness(sim, s);
      scoreGain = Math.max(0, after.overallScore - b.overallScore);
      if (s.exportPolicy === "block_critical") {
        unlocks = exportUnlocked(b, after, "BRD") ? "BRD" : exportUnlocked(b, after, "SRS") ? "SRS" : null;
      }
    }
    actions.push({
      code: issue.code,
      severity: issue.severity,
      directive: directiveFor(issue),
      fixAction: issue.fixAction,
      scoreGain,
      estimated: issue.code === "not_analyzed" || issue.code === "low_quality",
      unlocksExport: unlocks,
    });
  }

  // الترتيب: يفتح تصديرًا ← الأشد خطورة (الحاجب أولًا) ← الأعلى رفعًا للدرجة.
  const sevRank: Record<IssueSeverity, number> = { critical: 0, important: 1, optional: 2 };
  actions.sort((a, z) =>
    (a.unlocksExport ? 0 : 1) - (z.unlocksExport ? 0 : 1) ||
    sevRank[a.severity] - sevRank[z.severity] ||
    z.scoreGain - a.scoreGain
  );

  // دمج الأكواد المتشابهة (مثل معايير القبول) — نُبقي الأعلى ترتيبًا فقط.
  const usedGroups = new Set<string>();
  return actions.filter((a) => {
    const g = ACTION_GROUP[a.code] ?? a.code;
    if (usedGroups.has(g)) return false;
    usedGroups.add(g);
    return true;
  });
}

/* ---------------- الغلاف الخادمي: جلب البيانات + لقطة ---------------- */

/**
 * يحسب جاهزية مشروع مملوك للمستخدم — استعلامات قليلة ومجمعة (لا N+1):
 * المشروع + المتطلبات (select الحقول اللازمة فقط) + عدّ المعايير groupBy +
 * عدّ الأسئلة غير المجابة. يكتب ReadinessSnapshot عند الطلب الصريح أو
 * عندما تكون آخر لقطة أقدم من 10 دقائق.
 */
export async function calculateProjectReadiness(
  projectId: string,
  ownerId: string,
  opts: { snapshot?: boolean; withActions?: boolean } = {}
): Promise<ReadinessResult | null> {
  const settings = await getReadinessSettings();

  // ملكية مفروضة في الخادم — مشروع الغير = null (المسارات تعامله كـ 404).
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId },
    select: {
      id: true, name: true, description: true, client: true,
      projectIdea: true, projectGoal: true, targetUsers: true, projectScope: true,
      outOfScope: true, relatedSystems: true, constraints: true,
      brdApplicability: true, srsApplicability: true,
    },
  });
  if (!project) return null;

  const [reqRows, criteriaGroups, unanswered] = await Promise.all([
    prisma.requirement.findMany({
      where: { projectId, ownerId },
      select: {
        id: true, title: true, description: true, status: true, priority: true,
        type: true, source: true, stakeholders: true, notes: true, analysis: true,
      },
    }),
    prisma.acceptanceCriterion.groupBy({
      by: ["requirementId"],
      where: { projectId, ownerId },
      _count: { _all: true },
    }),
    prisma.openQuestion.count({ where: { projectId, ownerId, answer: null } }),
  ]);

  const critOf = new Map(criteriaGroups.map((g) => [g.requirementId, g._count._all]));
  const input: ReadinessInput = {
    project: {
      name: project.name,
      description: project.description,
      client: project.client,
      projectIdea: project.projectIdea,
      projectGoal: project.projectGoal,
      targetUsers: project.targetUsers,
      projectScope: project.projectScope,
      outOfScope: project.outOfScope,
      relatedSystems: project.relatedSystems,
      constraints: project.constraints,
      brdApplicability: project.brdApplicability as DocumentApplicability,
      srsApplicability: project.srsApplicability as DocumentApplicability,
    },
    requirements: reqRows.map((r) => {
      const a = r.analysis as { qualityScore?: number; ambiguity?: { missingInfo?: string[] } } | null;
      return {
        id: r.id, title: r.title, description: r.description, status: r.status,
        priority: r.priority, type: r.type, source: r.source,
        stakeholders: r.stakeholders, notes: r.notes,
        qualityScore: typeof a?.qualityScore === "number" ? a.qualityScore : null,
        missingInfoCount: a?.ambiguity?.missingInfo?.length ?? 0,
        criteriaCount: critOf.get(r.id) ?? 0,
      };
    }),
    openQuestionsUnanswered: unanswered,
  };

  const result = computeReadiness(input, settings);

  // الإجراءات الأعلى أثرًا — تُحسب عند الطلب فقط (مسار الشاشة)، لا في مسار التصدير.
  if (opts.withActions) result.topActions = rankActionsByImpact(input, settings, result);

  // لقطة تاريخية خفيفة — لا تُكتب مع كل فتح صفحة.
  try {
    const last = await prisma.readinessSnapshot.findFirst({
      where: { projectId },
      orderBy: { calculatedAt: "desc" },
      select: { calculatedAt: true },
    });
    const stale = !last || Date.now() - last.calculatedAt.getTime() > 10 * 60 * 1000;
    if (opts.snapshot || stale) {
      const sys = await getSystemSettings();
      void sys; // schemaVersion ثابت حاليًا
      await prisma.readinessSnapshot.create({
        data: {
          projectId, ownerId,
          overallScore: result.overallScore,
          brdScore: result.documents.brd?.score ?? null,
          srsScore: result.documents.srs?.score ?? null,
          criticalIssuesCount: result.counts.critical,
          importantIssuesCount: result.counts.important,
          optionalIssuesCount: result.counts.optional,
          calculationVersion: CALCULATION_VERSION,
          settingsVersion: 1,
          issues: result.issues.slice(0, 30).map((i) => ({
            code: i.code, severity: i.severity, scope: i.scope,
            entityType: i.entityType ?? null, entityId: i.entityId ?? null, count: i.count,
          })) as Prisma.InputJsonValue,
        },
      });
    }
  } catch (err) {
    // اللقطة تتبعية — فشلها لا يمنع عرض النتيجة.
    console.error("[readiness] snapshot failed:", err instanceof Error ? err.message : "error");
  }

  return result;
}

/* ---------------- فحص التصدير (يُستدعى من Server Action) ---------------- */

export interface ExportCheck {
  ok: boolean;
  reason?: "not-applicable" | "blocked";
  mode: "allow" | "warn" | "block";
  applicability: DocumentApplicability;
  score: number | null;
  criticalCount: number;
  topIssues: Array<{ title: string; severity: IssueSeverity }>;
}

/** يتحقق خادميًا من قابلية تصدير BRD/SRS حسب الحالة والسياسة — لا يكفي إخفاء الزر. */
export async function checkDocumentExport(projectId: string, ownerId: string, docType: "BRD" | "SRS"): Promise<ExportCheck | null> {
  const settings = await getReadinessSettings();
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId },
    select: { brdApplicability: true, srsApplicability: true },
  });
  if (!project) return null;

  const app = (docType === "BRD" ? project.brdApplicability : project.srsApplicability) as DocumentApplicability;
  if (app === "NOT_APPLICABLE") {
    return { ok: false, reason: "not-applicable", mode: "block", applicability: app, score: null, criticalCount: 0, topIssues: [] };
  }

  // الميزة معطلة أو سياسة السماح: تصدير مباشر بلا حساب.
  if (!settings.enabled || settings.exportPolicy === "allow") {
    return { ok: true, mode: "allow", applicability: app, score: null, criticalCount: 0, topIssues: [] };
  }

  const result = await calculateProjectReadiness(projectId, ownerId);
  const doc = docType === "BRD" ? result?.documents.brd : result?.documents.srs;
  const score = doc?.score ?? result?.overallScore ?? null;
  const criticalCount = doc?.criticalCount ?? result?.counts.critical ?? 0;
  const topIssues = (doc?.topIssues ?? result?.issues ?? []).slice(0, 3).map((i) => ({ title: i.title, severity: i.severity }));

  // المنع الكامل: للوثيقة المطلوبة فقط وعند سياسة block_critical مع نواقص حرجة.
  // الاختيارية تُصدَّر دائمًا مع ملاحظاتها (لا تُمنع).
  if (settings.exportPolicy === "block_critical" && app === "REQUIRED" && criticalCount > 0) {
    return { ok: false, reason: "blocked", mode: "block", applicability: app, score, criticalCount, topIssues };
  }
  return { ok: true, mode: criticalCount > 0 || (score != null && score < settings.thresholds.notesMin) ? "warn" : "allow", applicability: app, score, criticalCount, topIssues };
}

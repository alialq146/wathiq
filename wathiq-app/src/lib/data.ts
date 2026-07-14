/* Mock project + requirements data for the Wathiq workspace.
   Bilingual where the domain calls for it: Arabic copy, Western IDs/metrics. */

import type { RequirementStatus, PriorityLevel } from "@/components/ds";

/** Per-requirement AI analysis result (axis 2). */
export type ReqAnalysisStatus = "ready" | "needs_info" | "needs_improvement" | "high_risk";

export type SmartRating = "pass" | "partial" | "fail";
export interface SmartItem {
  rating: SmartRating;
  reason: string;
}

export interface RequirementAnalysis {
  qualityScore: number;
  status: ReqAnalysisStatus;
  summary: string;
  /** اختيارية للتوافق مع التحليلات المحفوظة قبل v1.9.8. */
  strengths?: string[];
  issues?: string[];
  recommendations?: string[];
  ambiguity: {
    vagueWords: string[];
    missingInfo: string[];
    assumptions: string[];
    risks: string[];
  };
  stakeholderQuestions: string[];
  acceptanceCriteria: string[];
  smart: {
    specific: SmartItem;
    measurable: SmartItem;
    achievable: SmartItem;
    relevant: SmartItem;
    testable: SmartItem;
  };
  improvedVersion: string;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: RequirementStatus;
  priority: PriorityLevel;
  type?: string | null;
  confidence: number | null;
  criteria: number;
  openQuestions: number;
  module: string;
  stakeholders: string[];
  notes?: string | null;
  source?: string | null; // مصدر المتطلب (عميل/اجتماع/وثيقة/بريد/ورشة عمل/أخرى)
  assignee?: string | null; // المسؤول عن المتطلب
  version?: number; // إصدار المتطلب (افتراضي 1)
  /** v2.4: للتزامن التفاؤلي (ISO) — تُرسل مع التعديل ليرفض الخادم الكتابة فوق أحدث. */
  updatedAt?: string;
  projectId?: string | null;
  moduleId?: string | null; // وحدة المشروع (اختيارية) — null = متطلب عام
  analysis?: RequirementAnalysis | null;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  domain: string | null;
  client: string | null;
  status: string;
  color: string | null;
  icon: string | null;
  /** سياق المشروع (اختياري بالكامل) — يحسّن دقة المساعد والوثائق. */
  projectIdea?: string | null;
  projectGoal?: string | null;
  targetUsers?: string | null;
  projectScope?: string | null;
  outOfScope?: string | null;
  relatedSystems?: string | null;
  constraints?: string | null;
  /** الوثائق والمخرجات (v2.3): REQUIRED | OPTIONAL | NOT_APPLICABLE. */
  brdApplicability?: string;
  srsApplicability?: string;
}

/** وحدة مشروع (اختيارية) لتنظيم متطلبات المشاريع الكبيرة. */
export interface ProjectModule {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
}

export const PROJECT = {
  id: "PRJ-4821",
  name: "منصة المدفوعات المؤسسية",
  code: "EPP",
} as const;

export const REQUIREMENTS: Requirement[] = [
  {
    id: "FR-014",
    title: "تسجيل الدخول عبر الهوية الوطنية",
    description:
      "يجب أن يدعم النظام تسجيل الدخول عبر منصة النفاذ الوطني الموحّد للأفراد والمنشآت، مع التحقق الثنائي.",
    status: "review",
    priority: "high",
    confidence: 88,
    criteria: 6,
    openQuestions: 2,
    module: "المصادقة",
    stakeholders: ["سارة العتيبي", "عمر فيصل", "ليان حسن"],
  },
  {
    id: "FR-021",
    title: "إنشاء أمر دفع متعدد المستفيدين",
    description:
      "تمكين المنشأة من رفع ملف دفعات وإنشاء أوامر دفع مجمّعة مع التحقق من أرصدة المستفيدين.",
    status: "approved",
    priority: "critical",
    confidence: 94,
    criteria: 9,
    openQuestions: 0,
    module: "المدفوعات",
    stakeholders: ["خالد النمر", "نورة", "سارة العتيبي", "ماجد", "ريم"],
  },
  {
    id: "FR-008",
    title: "لوحة متابعة حالة المعاملات",
    description:
      "عرض حالة كل معاملة (قيد المعالجة، مكتملة، مرفوضة) مع إمكانية التصفية والتصدير.",
    status: "analyzing",
    priority: "medium",
    confidence: 71,
    criteria: 4,
    openQuestions: 1,
    module: "التقارير",
    stakeholders: ["نورة القحطاني", "عمر فيصل"],
  },
  {
    id: "FR-033",
    title: "حدود الصلاحيات حسب الدور الوظيفي",
    description:
      "تعريف صلاحيات دقيقة (إنشاء، اعتماد، صرف) مرتبطة بأدوار وظيفية قابلة للتهيئة.",
    status: "needs_info",
    priority: "high",
    confidence: 52,
    criteria: 3,
    openQuestions: 4,
    module: "الصلاحيات",
    stakeholders: ["ماجد الدوسري", "ريم"],
  },
  {
    id: "NFR-003",
    title: "زمن استجابة المعاملة أقل من ثانيتين",
    description:
      "يجب ألا يتجاوز زمن معالجة أمر الدفع الواحد ثانيتين تحت حمل ٥٠٠ معاملة بالثانية.",
    status: "draft",
    priority: "medium",
    confidence: null,
    criteria: 2,
    openQuestions: 1,
    module: "الأداء",
    stakeholders: ["عمر فيصل"],
  },
  {
    id: "FR-040",
    title: "إشعارات فورية عند فشل الصرف",
    description:
      "إرسال إشعار فوري (تطبيق + بريد) للمسؤول المالي عند فشل أي عملية صرف مع سبب الفشل.",
    status: "blocked",
    priority: "low",
    confidence: 64,
    criteria: 3,
    openQuestions: 2,
    module: "الإشعارات",
    stakeholders: ["ليان حسن", "خالد النمر"],
  },
];

export interface AcceptanceCriterion {
  id: string;
  requirementId: string | null;
  text: string;
  done: boolean;
  ai: boolean;
}

export const ACCEPTANCE_CRITERIA: AcceptanceCriterion[] = [
  { id: "AC-1.1", requirementId: "FR-014", text: "عند إدخال هوية صحيحة وكلمة مرور صحيحة، يُعاد توجيه المستخدم إلى لوحة التحكم.", done: true, ai: true },
  { id: "AC-1.2", requirementId: "FR-014", text: "عند فشل التحقق، تظهر رسالة خطأ واضحة دون كشف سبب الفشل لأسباب أمنية.", done: true, ai: true },
  { id: "AC-1.3", requirementId: "FR-014", text: "يُطلب رمز التحقق الثنائي بعد التحقق الأول من بيانات الدخول.", done: true, ai: true },
  { id: "AC-1.4", requirementId: "FR-014", text: "بعد ثلاث محاولات فاشلة، يُقفل الحساب مؤقتًا لمدة ١٥ دقيقة.", done: false, ai: true },
  { id: "AC-1.5", requirementId: "FR-014", text: "تنتهي صلاحية الجلسة تلقائيًا بعد ٣٠ دقيقة من الخمول.", done: false, ai: false },
  { id: "AC-1.6", requirementId: "FR-014", text: "يُسجَّل كل دخول ناجح أو فاشل في سجل التدقيق مع الطابع الزمني.", done: true, ai: true },
];

export interface BusinessRule {
  id: string;
  requirementId: string | null;
  text: string;
  source: string;
}

export const BUSINESS_RULES: BusinessRule[] = [
  { id: "BR-22", requirementId: "FR-014", text: "لا يُسمح بتسجيل الدخول إلا للحسابات الموثّقة عبر النفاذ الوطني فقط.", source: "سياسة الأمان ٢٫٣" },
  { id: "BR-23", requirementId: "FR-014", text: "يجب أن يكون المستخدم مرتبطًا بمنشأة واحدة فعّالة على الأقل.", source: "قواعد العمل" },
  { id: "BR-24", requirementId: "FR-014", text: "تُحفظ سجلات الدخول لمدة لا تقل عن ١٨ شهرًا.", source: "متطلب تنظيمي" },
];

export interface OpenQuestion {
  id: string;
  requirementId: string | null;
  text: string;
  to: string;
  ai: boolean;
  answer: string | null;
}

export const OPEN_QUESTIONS: OpenQuestion[] = [
  { id: "Q-1", requirementId: "FR-014", text: "ما السلوك المتوقع عند تعطّل منصة النفاذ الوطني؟ هل يُسمح بمسار دخول بديل؟", to: "خالد النمر", ai: true, answer: null },
  { id: "Q-2", requirementId: "FR-014", text: "هل تختلف مدة قفل الحساب حسب نوع المستخدم (فرد / منشأة)؟", to: "سارة العتيبي", ai: true, answer: null },
];

export interface AuditEvent {
  id: string;
  requirementId: string | null;
  action: string;
  detail: string;
  actor: string;
  /** ISO timestamp string (kept as string so it crosses the server→client boundary cleanly). */
  createdAt: string;
}

/** A few illustrative events for the fallback (no-database) experience. */
export const AUDIT_EVENTS: AuditEvent[] = [
  { id: "EV-3", requirementId: "FR-021", action: "status_changed", detail: "اعتماد المتطلب «إنشاء أمر دفع متعدد المستفيدين».", actor: "خالد النمر", createdAt: "2026-06-29T09:12:00.000Z" },
  { id: "EV-2", requirementId: "FR-014", action: "question_added", detail: "أضاف وثّق سؤالًا مفتوحًا حول تعطّل منصة النفاذ الوطني.", actor: "وثّق", createdAt: "2026-06-28T14:03:00.000Z" },
  { id: "EV-1", requirementId: "FR-014", action: "requirement_created", detail: "استُخرج المتطلب «تسجيل الدخول عبر الهوية الوطنية» من المستند المرفوع.", actor: "وثّق", createdAt: "2026-06-28T13:58:00.000Z" },
];

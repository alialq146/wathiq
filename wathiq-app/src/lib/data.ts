/* Mock project + requirements data for the Wathiq workspace.
   Bilingual where the domain calls for it: Arabic copy, Western IDs/metrics. */

import type { RequirementStatus, PriorityLevel } from "@/components/ds";

export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: RequirementStatus;
  priority: PriorityLevel;
  confidence: number | null;
  criteria: number;
  openQuestions: number;
  module: string;
  stakeholders: string[];
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
  text: string;
  done: boolean;
  ai: boolean;
}

export const ACCEPTANCE_CRITERIA: AcceptanceCriterion[] = [
  { id: "AC-1.1", text: "عند إدخال هوية صحيحة وكلمة مرور صحيحة، يُعاد توجيه المستخدم إلى لوحة التحكم.", done: true, ai: true },
  { id: "AC-1.2", text: "عند فشل التحقق، تظهر رسالة خطأ واضحة دون كشف سبب الفشل لأسباب أمنية.", done: true, ai: true },
  { id: "AC-1.3", text: "يُطلب رمز التحقق الثنائي بعد التحقق الأول من بيانات الدخول.", done: true, ai: true },
  { id: "AC-1.4", text: "بعد ثلاث محاولات فاشلة، يُقفل الحساب مؤقتًا لمدة ١٥ دقيقة.", done: false, ai: true },
  { id: "AC-1.5", text: "تنتهي صلاحية الجلسة تلقائيًا بعد ٣٠ دقيقة من الخمول.", done: false, ai: false },
  { id: "AC-1.6", text: "يُسجَّل كل دخول ناجح أو فاشل في سجل التدقيق مع الطابع الزمني.", done: true, ai: true },
];

export interface BusinessRule {
  id: string;
  text: string;
  source: string;
}

export const BUSINESS_RULES: BusinessRule[] = [
  { id: "BR-22", text: "لا يُسمح بتسجيل الدخول إلا للحسابات الموثّقة عبر النفاذ الوطني فقط.", source: "سياسة الأمان ٢٫٣" },
  { id: "BR-23", text: "يجب أن يكون المستخدم مرتبطًا بمنشأة واحدة فعّالة على الأقل.", source: "قواعد العمل" },
  { id: "BR-24", text: "تُحفظ سجلات الدخول لمدة لا تقل عن ١٨ شهرًا.", source: "متطلب تنظيمي" },
];

export interface OpenQuestion {
  id: string;
  text: string;
  to: string;
  ai: boolean;
}

export const OPEN_QUESTIONS: OpenQuestion[] = [
  { id: "Q-1", text: "ما السلوك المتوقع عند تعطّل منصة النفاذ الوطني؟ هل يُسمح بمسار دخول بديل؟", to: "خالد النمر", ai: true },
  { id: "Q-2", text: "هل تختلف مدة قفل الحساب حسب نوع المستخدم (فرد / منشأة)؟", to: "سارة العتيبي", ai: true },
];

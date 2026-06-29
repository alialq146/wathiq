/* Shared helpers for the Wathiq workspace UI kit.
   Exposes DS components + a Lucide <Icon> + mock data on window so each
   screen file (separate Babel scope) can use them as globals. */

const DS = window.WathiqDesignSystem_f0eeb8 || {};

function Icon({ name, size = 18, color, style, strokeWidth = 1.75 }) {
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return (
    <span
      className="wq-ic"
      style={{ ["--ic"]: size + "px", color, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", ...style }}
    >
      <i data-lucide={name} style={{ strokeWidth }}></i>
    </span>
  );
}

/* ---- Mock project + requirements data ---- */
const PROJECT = { id: "PRJ-4821", name: "منصة المدفوعات المؤسسية", code: "EPP" };

const REQUIREMENTS = [
  {
    id: "FR-014", title: "تسجيل الدخول عبر الهوية الوطنية",
    description: "يجب أن يدعم النظام تسجيل الدخول عبر منصة النفاذ الوطني الموحّد للأفراد والمنشآت، مع التحقق الثنائي.",
    status: "review", priority: "high", confidence: 88, criteria: 6, openQuestions: 2,
    module: "المصادقة", stakeholders: ["سارة العتيبي", "عمر فيصل", "ليان حسن"],
  },
  {
    id: "FR-021", title: "إنشاء أمر دفع متعدد المستفيدين",
    description: "تمكين المنشأة من رفع ملف دفعات وإنشاء أوامر دفع مجمّعة مع التحقق من أرصدة المستفيدين.",
    status: "approved", priority: "critical", confidence: 94, criteria: 9, openQuestions: 0,
    module: "المدفوعات", stakeholders: ["خالد النمر", "نورة", "سارة العتيبي", "ماجد", "ريم"],
  },
  {
    id: "FR-008", title: "لوحة متابعة حالة المعاملات",
    description: "عرض حالة كل معاملة (قيد المعالجة، مكتملة، مرفوضة) مع إمكانية التصفية والتصدير.",
    status: "analyzing", priority: "medium", confidence: 71, criteria: 4, openQuestions: 1,
    module: "التقارير", stakeholders: ["نورة القحطاني", "عمر فيصل"],
  },
  {
    id: "FR-033", title: "حدود الصلاحيات حسب الدور الوظيفي",
    description: "تعريف صلاحيات دقيقة (إنشاء، اعتماد، صرف) مرتبطة بأدوار وظيفية قابلة للتهيئة.",
    status: "needs_info", priority: "high", confidence: 52, criteria: 3, openQuestions: 4,
    module: "الصلاحيات", stakeholders: ["ماجد الدوسري", "ريم"],
  },
  {
    id: "NFR-003", title: "زمن استجابة المعاملة أقل من ثانيتين",
    description: "يجب ألا يتجاوز زمن معالجة أمر الدفع الواحد ثانيتين تحت حمل ٥٠٠ معاملة بالثانية.",
    status: "draft", priority: "medium", confidence: null, criteria: 2, openQuestions: 1,
    module: "الأداء", stakeholders: ["عمر فيصل"],
  },
  {
    id: "FR-040", title: "إشعارات فورية عند فشل الصرف",
    description: "إرسال إشعار فوري (تطبيق + بريد) للمسؤول المالي عند فشل أي عملية صرف مع سبب الفشل.",
    status: "blocked", priority: "low", confidence: 64, criteria: 3, openQuestions: 2,
    module: "الإشعارات", stakeholders: ["ليان حسن", "خالد النمر"],
  },
];

const ACCEPTANCE_CRITERIA = [
  { id: "AC-1.1", text: "عند إدخال هوية صحيحة وكلمة مرور صحيحة، يُعاد توجيه المستخدم إلى لوحة التحكم.", done: true, ai: true },
  { id: "AC-1.2", text: "عند فشل التحقق، تظهر رسالة خطأ واضحة دون كشف سبب الفشل لأسباب أمنية.", done: true, ai: true },
  { id: "AC-1.3", text: "يُطلب رمز التحقق الثنائي بعد التحقق الأول من بيانات الدخول.", done: true, ai: true },
  { id: "AC-1.4", text: "بعد ثلاث محاولات فاشلة، يُقفل الحساب مؤقتًا لمدة ١٥ دقيقة.", done: false, ai: true },
  { id: "AC-1.5", text: "تنتهي صلاحية الجلسة تلقائيًا بعد ٣٠ دقيقة من الخمول.", done: false, ai: false },
  { id: "AC-1.6", text: "يُسجَّل كل دخول ناجح أو فاشل في سجل التدقيق مع الطابع الزمني.", done: true, ai: true },
];

const BUSINESS_RULES = [
  { id: "BR-22", text: "لا يُسمح بتسجيل الدخول إلا للحسابات الموثّقة عبر النفاذ الوطني فقط.", source: "سياسة الأمان ٢٫٣" },
  { id: "BR-23", text: "يجب أن يكون المستخدم مرتبطًا بمنشأة واحدة فعّالة على الأقل.", source: "قواعد العمل" },
  { id: "BR-24", text: "تُحفظ سجلات الدخول لمدة لا تقل عن ١٨ شهرًا.", source: "متطلب تنظيمي" },
];

const OPEN_QUESTIONS = [
  { id: "Q-1", text: "ما السلوك المتوقع عند تعطّل منصة النفاذ الوطني؟ هل يُسمح بمسار دخول بديل؟", to: "خالد النمر", ai: true },
  { id: "Q-2", text: "هل تختلف مدة قفل الحساب حسب نوع المستخدم (فرد / منشأة)؟", to: "سارة العتيبي", ai: true },
];

Object.assign(window, {
  Icon, PROJECT, REQUIREMENTS, ACCEPTANCE_CRITERIA, BUSINESS_RULES, OPEN_QUESTIONS,
  ...DS,
});

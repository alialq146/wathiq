/**
 * القيم الافتراضية الآمنة لإعدادات النظام (v2.2).
 * قاعدة ذهبية: هذه القيم تطابق سلوك المنصة قبل v2.2 حرفيًا — غياب سجل
 * SystemSettings (أو فشل قراءته) يعني أن المنصة تعمل تمامًا كما كانت.
 * الـ fallback لا يخفض الأمان ولا يرفع الحصص أبدًا.
 */

import type {
  SystemSettingsShape, GeneralSettings, ContactSettings, NotificationSettings,
  DocumentSettings, PlanSettings, AssistantSettings, FeatureSettings, ReadinessSettings,
} from "./types";

/* ───── سقوف صلبة في الكود — النظام يستطيع التخفيض، لا التجاوز ─────
 * تُطبق في الخادم عند القراءة (resolve) وعند الحفظ (validation) معًا. */
export const HARD_CEILINGS = {
  analysisLimitMax: 1000, // أقصى حد تحليلات لأي خطة من النظام
  projectLimitMax: 500,
  assistantTaskTokensMax: 1500, // أقصى tokens لمهمة مساعد (الافتراضي 500–700)
  fullAnalysisTokensMax: 12000, // الافتراضي 8000
  reminderDaysMax: 60,
  textMax: 1000, // أقصى طول نص إعداد عام
  longTextMax: 4000, // النصوص الطويلة (تعليمات/سرية)
} as const;

const GENERAL: GeneralSettings = {
  platformName: "وثّق",
  platformNameLatin: "WATHIQ",
  tagline: "منصة تحليل وإدارة متطلبات المشاريع بالذكاء الاصطناعي",
  logoUrl: "",
  faviconUrl: "",
  locale: "ar",
  timezone: "Asia/Riyadh",
  dateFormat: "DD/MM/YYYY",
  homepageUrl: "",
  linkedinUrl: "",
  xUrl: "",
  footerText: "© 2026 وثّق · WATHIQ — جميع الحقوق محفوظة.",
  showVersion: true,
};

const CONTACT: ContactSettings = {
  whatsappNumber: "966531800106",
  supportEmail: "wathiq.ai.app@gmail.com",
  salesEmail: "",
  phone: "+966531800106",
  businessHours: "",
  contactUrl: "",
  upgradeMessageText:
    "مرحبًا، أرغب في ترقية حسابي في منصة وثّق.\nالخطة المطلوبة: {plan}\nالبريد المسجل: \nملاحظات: ",
  renewalMessageText:
    "مرحبًا، أرغب في تجديد اشتراكي في منصة وثّق.\nالخطة الحالية: {plan}\nالبريد المسجل: {email}\nتاريخ انتهاء الاشتراك: {endDate}\nملاحظات: ",
  enterpriseCtaText: "تواصل معنا",
  activationTimeText: "الترقية حاليًا بالتواصل المباشر، ويتم التفعيل خلال 24 ساعة عمل.",
  upgradeCtaText: "طلب الترقية",
  renewalCtaText: "طلب التجديد",
  showWhatsapp: true,
  showEmail: true,
  showBusinessHours: false,
};

const NOTIFICATIONS: NotificationSettings = {
  // مطابق لسلوك v2.0/v2.1: تذكيرات 7/3/1 + يوم الانتهاء فقط.
  remind30Enabled: false,
  remind14Enabled: false,
  remind7Enabled: true,
  remind3Enabled: true,
  remind1Enabled: true,
  remindExpiryDayEnabled: true,
  inAppRemindersEnabled: true,
  emailRemindersEnabled: true, // البوابة الفعلية تبقى BILLING_EMAIL_ENABLED (env)
  adminAlertsEnabled: true,
  customerReminderText: "",
  expiryText: "",
  renewalText: "",
  suppressWhenScheduled: true,
};

const DOCUMENTS: DocumentSettings = {
  issuerName: "", // فارغ = اسم المنصة
  docLogoUrl: "",
  contactLine: "",
  classification: "داخلي",
  defaultDocVersion: "V1",
  confidentialityText: "", // لا نص سرية افتراضيًا (مطابق للسلوك الحالي)
  footerTextOverride: "",
  needsInputText: "يحتاج استكمال من صاحب المصلحة.",
  notAvailableText: "غير متوفر في بيانات المشروع الحالية.",
  notDefinedText: "لم يتم تحديده بعد.",
  aiDisclosureText: "تم إعداد بعض أجزاء هذه الوثيقة بمساعدة نماذج ذكاء اصطناعي متقدمة.",
  brd: {
    executiveSummary: true, goals: true, scope: true, outOfScope: true,
    stakeholders: true, assumptions: true, risks: true, approvalTable: true, changeLog: true,
  },
  srs: {
    overview: true, environment: true, constraints: true, functional: true,
    nonFunctional: true, businessRules: true, rtm: true, approvalTable: true,
  },
  print: { pageSize: "A4", showLogo: true, showFooter: true },
};

const PLANS_DEFAULT: PlanSettings = {
  FREE: {
    displayName: "مجاني",
    title: "الخطة المجانية",
    desc: "مناسبة لتجربة وثّق على مشروع واحد قبل الترقية.",
    price: "0",
    priceNote: "ريال",
    yearlyPrice: "",
    recommended: false,
    visible: true,
    enabled: true,
    ctaText: "",
    analysisLimit: 3,
    projectLimit: 1,
    features: [
      "مشروع واحد",
      "٣ تحليلات ذكاء اصطناعي شهريًا",
      "رفع ملف PDF محدود",
      "إضافة متطلبات يدويًا",
      "عرض مؤشر الجودة ونقاط الغموض",
      "الأسئلة المقترحة الأساسية",
      "لوحة تحكم أساسية",
    ],
    sortOrder: 1,
  },
  PRO: {
    displayName: "احترافي",
    title: "الخطة الاحترافية",
    desc: "للمحللين ومدراء المشاريع الذين يحتاجون إلى تحليل متطلبات أكثر احترافية.",
    price: "149",
    priceNote: "ريال / شهريًا",
    yearlyPrice: "",
    recommended: true,
    visible: true,
    enabled: true,
    ctaText: "",
    analysisLimit: 50,
    projectLimit: null,
    features: [
      "حتى ٥٠ تحليل ذكاء اصطناعي شهريًا",
      "مشاريع متعددة",
      "رفع ملفات أكبر",
      "تحليل أعمق لنقاط الغموض والنواقص",
      "توليد الأسئلة المقترحة للعميل",
      "إنشاء معايير قبول واضحة",
      "اقتراح تحسين صياغة المتطلبات",
      "سجل التحليلات",
      "مناسبة لمحللي الأعمال ومدراء المشاريع",
    ],
    sortOrder: 2,
  },
  ENTERPRISE: {
    displayName: "الأعمال",
    title: "خطة الأعمال",
    desc: "للشركات والجهات التي تحتاج إلى حدود مخصصة ودعم أعلى.",
    price: "تواصل معنا",
    priceNote: "للفرق والمؤسسات",
    yearlyPrice: "",
    recommended: false,
    visible: true,
    enabled: true,
    ctaText: "",
    analysisLimit: null,
    projectLimit: null,
    features: [
      "عدد تحليلات مخصص",
      "عدد مشاريع مخصص",
      "إعدادات تحليل تناسب طبيعة الجهة",
      "دعم مباشر",
      "متابعة أعلى للاستخدام والتكلفة",
      "خيارات أمان وتخصيص حسب الاتفاق",
      "مناسبة للجهات الحكومية، الشركات، ومكاتب إدارة المشاريع",
    ],
    sortOrder: 3,
  },
};

const ASSISTANT: AssistantSettings = {
  // مطابق للحالي: المساعد متاح لكل الخطط (بوابة الحصة الذرية تبقى كما هي).
  enabledForFree: true,
  enabledForPro: true,
  enabledForEnterprise: true,
  fullAnalysisMaxTokens: 8000,
  tasks: {
    improve: { enabled: true, maxOutputTokens: 500, requiresPaidPlan: false, label: "تحسين الصياغة", description: "إعادة صياغة المتطلب بوضوح دون تغيير القصد." },
    criteria: { enabled: true, maxOutputTokens: 700, requiresPaidPlan: false, label: "معايير القبول", description: "توليد معايير قبول قابلة للاختبار." },
    questions: { enabled: true, maxOutputTokens: 600, requiresPaidPlan: false, label: "أسئلة العميل", description: "أسئلة لصاحب المصلحة تسد النواقص." },
    ambiguity: { enabled: true, maxOutputTokens: 600, requiresPaidPlan: false, label: "كشف الغموض", description: "الكلمات الغامضة والمعلومات الناقصة." },
    risks: { enabled: true, maxOutputTokens: 700, requiresPaidPlan: false, label: "المخاطر", description: "مخاطر مرتبطة بالمتطلب مع إجراءات تخفيف." },
  },
};

const FEATURES: FeatureSettings = {
  publicRegistrationEnabled: true,
  projectCollaborationEnabled: false, // مستقبلي — لا يعرض أي زر مشاركة الآن
  projectAuditLogEnabled: true,
  optimisticConcurrencyEnabled: true,
  commentsEnabled: false, // مستقبلي
  maintenanceMode: false,
  maintenanceMessage: "المنصة تحت الصيانة حاليًا — نعود قريبًا. شكرًا لصبركم.",
  demoModeEnabled: true,
  feedbackEnabled: true,
  samplesEnabled: true,
  assistantEnabled: true,
  documentExportEnabled: true,
  billingEnabled: true,
  billingEmailsEnabled: true, // الفعلي = هذا AND BILLING_EMAIL_ENABLED (env)
};

const READINESS: ReadinessSettings = {
  enabled: true,
  brdReadinessEnabled: true,
  srsReadinessEnabled: true,
  thresholds: { readyMin: 90, notesMin: 75, needsWorkMin: 50 },
  weights: { context: 15, requirements: 20, quality: 20, acceptance: 20, questions: 10, status: 10, docData: 5 },
  missingAnalysisPolicy: "important",
  requireAcceptanceCriteria: false,
  criticalNoCriteriaForCritical: true,
  minQualityScore: 60,
  minApprovedPercent: 0,
  minCriteriaPerRequirement: 1,
  exportPolicy: "warn",
  planAccess: { FREE: "summary", PRO: "full", ENTERPRISE: "full" },
  freeMaxIssues: 5,
  // REQUIRED للوثيقتين = سلوك المنصة الحالي (الوثيقتان متاحتان دائمًا).
  defaultBrdApplicability: "REQUIRED",
  defaultSrsApplicability: "REQUIRED",
};

export const SETTINGS_DEFAULTS: SystemSettingsShape = {
  general: GENERAL,
  contact: CONTACT,
  notifications: NOTIFICATIONS,
  documents: DOCUMENTS,
  plans: PLANS_DEFAULT,
  assistant: ASSISTANT,
  features: FEATURES,
  readiness: READINESS,
};

export const SETTINGS_SCHEMA_VERSION = 1;

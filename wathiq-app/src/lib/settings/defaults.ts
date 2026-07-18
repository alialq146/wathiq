/**
 * القيم الافتراضية الآمنة لإعدادات النظام (v2.2).
 * قاعدة ذهبية: هذه القيم تطابق سلوك المنصة قبل v2.2 حرفيًا — غياب سجل
 * SystemSettings (أو فشل قراءته) يعني أن المنصة تعمل تمامًا كما كانت.
 * الـ fallback لا يخفض الأمان ولا يرفع الحصص أبدًا.
 */

import type {
  SystemSettingsShape, GeneralSettings, ContactSettings, NotificationSettings,
  DocumentSettings, PlanSettings, AiSettings, FeatureSettings, ReadinessSettings,
} from "./types";

/* ───── سقوف صلبة في الكود — النظام يستطيع التخفيض، لا التجاوز ─────
 * تُطبق في الخادم عند القراءة (resolve) وعند الحفظ (validation) معًا.
 * حماية تكلفة الذكاء الاصطناعي: كل قيم النقاط/الرموز/المهلات مقصوصة هنا. */
export const HARD_CEILINGS = {
  projectLimitMax: 500,
  // AI accounting (v2.6)
  monthlyCreditsMax: 1_000_000, // سقف أمان لمنحة أي خطة/تجاوز مستخدم
  taskCreditMax: 1000, // أقصى تكلفة نقاط لمهمة واحدة
  dailyCreditMax: 1_000_000,
  perRequestCreditMax: 5000, // أقصى نقاط لعملية واحدة (بعد المضاعِف)
  levelMultiplierMax: 10, // أقصى مضاعِف مستوى
  outputTokensMax: 12000, // أقصى حد إخراج لأي مهمة/مستوى
  aiTimeoutMsMax: 300_000, // أقصى مهلة (Fluid Compute 300s)
  aiRetryCountMax: 5,
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
    projectLimit: 1,
    features: [
      "مشروع واحد",
      "رصيد ذكاء اصطناعي شهري للتجربة",
      "رفع ملف PDF محدود",
      "إضافة متطلبات يدويًا",
      "عرض مؤشر الجودة ونقاط الغموض",
      "الأسئلة المقترحة الأساسية",
      "لوحة تحكم أساسية",
    ],
    sortOrder: 1,
    monthlyCredits: 30,
    dailyCreditLimit: 10,
    perRequestCreditLimit: null,
    fullAnalysisEnabled: false,
    allowedTasks: ["extract", "improve", "criteria", "questions", "ambiguity"],
    allowedLevels: ["quick"],
    allowedPersonas: ["default"],
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
    projectLimit: null,
    features: [
      "رصيد ذكاء اصطناعي شهري أعلى",
      "مشاريع متعددة",
      "تحليل المتطلب بالكامل",
      "مستويات تحليل متعددة (سريع/احترافي/خبير)",
      "شخصيات تحليل متعددة",
      "توليد الأسئلة المقترحة للعميل",
      "إنشاء معايير قبول واضحة",
      "اقتراح تحسين صياغة المتطلبات",
      "سجل التحليلات",
    ],
    sortOrder: 2,
    monthlyCredits: 400,
    dailyCreditLimit: null,
    perRequestCreditLimit: null,
    fullAnalysisEnabled: true,
    allowedTasks: ["extract", "full", "improve", "criteria", "questions", "ambiguity", "risks"],
    allowedLevels: ["quick", "standard", "expert"],
    allowedPersonas: ["default", "ba", "consultant", "qa", "po", "tech"],
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
    projectLimit: null,
    features: [
      "رصيد ذكاء اصطناعي مخصّص وعالٍ",
      "عدد مشاريع مخصص",
      "كل مستويات وشخصيات التحليل",
      "إعدادات تحليل تناسب طبيعة الجهة",
      "دعم مباشر",
      "متابعة أعلى للاستخدام والتكلفة",
      "خيارات أمان وتخصيص حسب الاتفاق",
    ],
    sortOrder: 3,
    // حتى الباقة المؤسسية لها منحة عالية لكن محدودة — حماية تكلفة الذكاء (تُرفع لكل عميل عبر تجاوز الأدمن).
    monthlyCredits: 5000,
    dailyCreditLimit: null,
    perRequestCreditLimit: null,
    fullAnalysisEnabled: true,
    allowedTasks: ["extract", "full", "improve", "criteria", "questions", "ambiguity", "risks"],
    allowedLevels: ["quick", "standard", "expert"],
    allowedPersonas: ["default", "ba", "consultant", "qa", "po", "tech"],
  },
};

/**
 * محاسبة الذكاء الاصطناعي — كل الأرقام أمثلة قابلة للتعديل من الأدمن.
 * تكلفة العملية = credits(المهمة) × multiplier(المستوى)، مقصوصة للسقوف.
 * أسماء النماذج/المزوّدين إعداد خادمي (لا تُعرض للعميل النهائي أبدًا).
 */
const AI: AiSettings = {
  tasks: {
    extract: { enabled: true, credits: 3, maxOutputTokens: 8000, label: "استخراج المتطلبات" },
    full: { enabled: true, credits: 8, maxOutputTokens: 3500, label: "تحليل المتطلب بالكامل" },
    improve: { enabled: true, credits: 1, maxOutputTokens: 500, label: "تحسين الصياغة" },
    criteria: { enabled: true, credits: 2, maxOutputTokens: 700, label: "معايير القبول" },
    questions: { enabled: true, credits: 2, maxOutputTokens: 600, label: "أسئلة العميل" },
    ambiguity: { enabled: true, credits: 2, maxOutputTokens: 600, label: "كشف الغموض" },
    risks: { enabled: true, credits: 3, maxOutputTokens: 700, label: "المخاطر" },
  },
  levels: {
    quick: { enabled: true, multiplier: 0.5, tokenMultiplier: 0.6, label: "مراجعة سريعة" },
    standard: { enabled: true, multiplier: 1, tokenMultiplier: 1, label: "تحليل احترافي" },
    expert: { enabled: true, multiplier: 2, tokenMultiplier: 1.5, label: "تحليل خبير" },
  },
  personas: {
    default: { enabled: true, label: "افتراضي", systemHint: "" },
    ba: { enabled: true, label: "محلل أعمال", systemHint: "حلّل من منظور محلل أعمال يركّز على وضوح المتطلب وقيمته." },
    consultant: { enabled: true, label: "استشاري أعمال", systemHint: "حلّل من منظور استشاري يركّز على الفجوة بين الوضع الحالي والمستهدف." },
    qa: { enabled: true, label: "ضمان الجودة", systemHint: "حلّل من منظور مختبِر يركّز على قابلية الاختبار والحالات الاستثنائية." },
    po: { enabled: true, label: "مالك المنتج", systemHint: "حلّل من منظور مالك منتج يركّز على القيمة والأولوية وتجربة المستخدم." },
    tech: { enabled: true, label: "مراجعة تقنية", systemHint: "حلّل من منظور تقني يركّز على التكاملات والبيانات والأداء والأمن." },
  },
  defaultProvider: "anthropic",
  providers: ["anthropic"],
  // توجيه النموذج خادمي بحت — قابل للتجاوز عبر متغيّرات البيئة AI_MODEL_{PLAN}.
  modelRouting: {
    FREE: "claude-haiku-4-5-20251001",
    PRO: "claude-sonnet-5",
    ENTERPRISE: "claude-opus-4-8",
  },
  fallbackModel: "claude-haiku-4-5-20251001",
  timeoutMs: 120_000,
  retryCount: 1,
  // أسعار تقديرية (دولار/ألف رمز) لحساب التكلفة الداخلية فقط.
  costRates: {
    "claude-haiku-4-5-20251001": { in: 0.001, out: 0.005 },
    "claude-sonnet-5": { in: 0.003, out: 0.015 },
    "claude-opus-4-8": { in: 0.015, out: 0.075 },
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
  ai: AI,
  features: FEATURES,
  readiness: READINESS,
};

export const SETTINGS_SCHEMA_VERSION = 1;

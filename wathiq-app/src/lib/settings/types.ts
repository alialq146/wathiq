/**
 * أنواع إعدادات النظام المركزية (v2.2) — كل مجموعة Typed بالكامل.
 * القيم المخزنة في SystemSettings أجزاء (Partial) تُدمج فوق defaults.ts؛
 * لا Secrets هنا إطلاقًا (المفاتيح كلها Environment Variables).
 */

export interface GeneralSettings {
  platformName: string;
  platformNameLatin: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  locale: string;
  timezone: string;
  dateFormat: string;
  homepageUrl: string;
  linkedinUrl: string;
  xUrl: string;
  footerText: string;
  showVersion: boolean;
}

export interface ContactSettings {
  whatsappNumber: string; // أرقام فقط بصيغة دولية بلا +
  supportEmail: string;
  salesEmail: string;
  phone: string;
  businessHours: string;
  contactUrl: string;
  upgradeMessageText: string; // نص رسالة واتساب للترقية
  renewalMessageText: string; // نص رسالة واتساب للتجديد
  enterpriseCtaText: string;
  activationTimeText: string; // «التفعيل خلال 24 ساعة عمل»
  upgradeCtaText: string;
  renewalCtaText: string;
  showWhatsapp: boolean;
  showEmail: boolean;
  showBusinessHours: boolean;
}

export interface NotificationSettings {
  /** أيام التذكير قبل الانتهاء (تنازليًا) — كل يوم له مفتاح تفعيل. */
  remind30Enabled: boolean;
  remind14Enabled: boolean;
  remind7Enabled: boolean;
  remind3Enabled: boolean;
  remind1Enabled: boolean;
  remindExpiryDayEnabled: boolean;
  inAppRemindersEnabled: boolean;
  emailRemindersEnabled: boolean; // AND مع BILLING_EMAIL_ENABLED (env) — البوابة الرئيسية تبقى env
  adminAlertsEnabled: boolean;
  customerReminderText: string; // فارغ = النص الافتراضي في القوالب
  expiryText: string;
  renewalText: string;
  suppressWhenScheduled: boolean; // لا تذكير لمن لديه تجديد مجدول
}

export interface DocumentSectionToggles {
  executiveSummary: boolean;
  goals: boolean;
  scope: boolean;
  outOfScope: boolean;
  stakeholders: boolean;
  assumptions: boolean;
  risks: boolean;
  approvalTable: boolean;
  changeLog: boolean;
}
export interface SrsSectionToggles {
  overview: boolean;
  environment: boolean;
  constraints: boolean;
  functional: boolean;
  nonFunctional: boolean;
  businessRules: boolean;
  rtm: boolean;
  approvalTable: boolean;
}

export interface DocumentSettings {
  issuerName: string; // فارغ = اسم المنصة
  docLogoUrl: string;
  contactLine: string; // سطر تواصل اختياري في الوثيقة
  classification: string; // «داخلي»
  defaultDocVersion: string; // V1
  confidentialityText: string; // فارغ = لا يظهر
  footerTextOverride: string; // فارغ = خاتمة النوع الافتراضية
  needsInputText: string;
  notAvailableText: string;
  notDefinedText: string;
  aiDisclosureText: string;
  brd: DocumentSectionToggles;
  srs: SrsSectionToggles;
  print: { pageSize: "A4"; showLogo: boolean; showFooter: boolean };
}

/* ───── الباقات والامتيازات (Plans & Entitlements) ───── */

export type PlanId = "FREE" | "PRO" | "ENTERPRISE";

export interface PlanDisplaySettings {
  displayName: string;
  title: string;
  desc: string;
  price: string; // نص معروض
  priceNote: string;
  yearlyPrice: string; // نص معروض اختياري
  recommended: boolean;
  visible: boolean; // ظاهرة في صفحة الأسعار
  enabled: boolean; // متاحة للترقية اليدوية
  ctaText: string;
  /** null = غير محدود/مخصص. تخضع لسقوف صلبة في الكود. */
  projectLimit: number | null;
  features: string[];
  sortOrder: number;
  /* ---- امتيازات الذكاء الاصطناعي (Entitlements) ---- */
  monthlyCredits: number; // منحة النقاط الشهرية
  dailyCreditLimit: number | null; // سقف يومي اختياري (null = بلا سقف يومي)
  perRequestCreditLimit: number | null; // أقصى نقاط لعملية واحدة (null = فقط تكلفة المهمة)
  fullAnalysisEnabled: boolean; // «تحليل المتطلب بالكامل»
  allowedTasks: AiTaskKey[]; // المهام المتاحة لهذه الباقة
  allowedLevels: AiLevelKey[]; // مستويات التحليل المتاحة
  allowedPersonas: AiPersonaKey[]; // الشخصيات المتاحة
}
export interface PlanSettings {
  FREE: PlanDisplaySettings;
  PRO: PlanDisplaySettings;
  ENTERPRISE: PlanDisplaySettings;
}

/* ───── محاسبة الذكاء الاصطناعي (AI accounting — v2.6) ───── */

/** كل عمليات الذكاء الاصطناعي القابلة للمحاسبة. */
export type AiTaskKey =
  | "extract" // استخراج المتطلبات من مستند/PDF
  | "full" // تحليل المتطلب بالكامل
  | "improve" // تحسين الصياغة
  | "criteria" // معايير القبول
  | "questions" // أسئلة أصحاب المصلحة
  | "ambiguity" // كشف الغموض والنواقص
  | "risks"; // تحليل المخاطر

export type AiLevelKey = "quick" | "standard" | "expert";
export type AiPersonaKey = "default" | "ba" | "consultant" | "qa" | "po" | "tech";

export interface AiTaskConfig {
  enabled: boolean;
  credits: number; // التكلفة الأساسية بالنقاط (يُقصّ للسقف الصلب)
  maxOutputTokens: number; // حد الإخراج (يُقصّ للسقف الصلب)
  label: string;
}
export interface AiLevelConfig {
  enabled: boolean;
  multiplier: number; // مضاعِف التكلفة والعمق (يُقصّ للسقف الصلب)
  tokenMultiplier: number; // مضاعِف حد الإخراج
  label: string;
}
export interface AiPersonaConfig {
  enabled: boolean;
  label: string;
  systemHint: string; // لمسة تُضاف لتعليمة النظام (لا تُكشف للعميل)
}
export interface AiModelRate {
  in: number; // دولار لكل ألف رمز إدخال (لتقدير التكلفة فقط)
  out: number; // دولار لكل ألف رمز إخراج
}

/**
 * محاسبة الذكاء الاصطناعي — مستقلة عن أي مزوّد. كل الأرقام قابلة للتعديل من
 * الأدمن دون تعديل كود. `modelRouting`/`costRates` تبقى في الخادم ولا تُكشف
 * للعميل، ولا يُذكر اسم أي نموذج في الواجهة.
 */
export interface AiSettings {
  tasks: Record<AiTaskKey, AiTaskConfig>;
  levels: Record<AiLevelKey, AiLevelConfig>;
  personas: Record<AiPersonaKey, AiPersonaConfig>;
  defaultProvider: string; // مزوّد افتراضي (anthropic | openai | ...)
  providers: string[]; // المزوّدون المتاحون
  modelRouting: Record<PlanId, string>; // خطة → معرّف النموذج (خادمي)
  fallbackModel: string; // نموذج بديل عند فشل الأساسي
  timeoutMs: number; // مهلة الطلب
  retryCount: number; // عدد إعادات المحاولة (لا تُضاعف الخصم — Idempotency)
  costRates: Record<string, AiModelRate>; // نموذج → أسعار تقديرية (خادمي)
}

export interface FeatureSettings {
  publicRegistrationEnabled: boolean;
  /** v2.4: جاهزية التعاون — أعلام مستقبلية لا تنشئ ميزة الآن (الملكية ليست Flag). */
  projectCollaborationEnabled: boolean;
  projectAuditLogEnabled: boolean;
  optimisticConcurrencyEnabled: boolean;
  commentsEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  demoModeEnabled: boolean;
  feedbackEnabled: boolean;
  samplesEnabled: boolean;
  assistantEnabled: boolean;
  documentExportEnabled: boolean;
  billingEnabled: boolean;
  billingEmailsEnabled: boolean; // AND مع env — لا يستطيع تفعيل البريد بلا مزود
}

/* ───── مركز جاهزية المشروع والوثائق (v2.3) ───── */

export type DocumentApplicability = "REQUIRED" | "OPTIONAL" | "NOT_APPLICABLE";
export type MissingAnalysisPolicy = "note" | "important" | "block_export" | "ignore";
export type ExportPolicy = "allow" | "warn" | "block_critical";
export type ReadinessPlanAccess = "summary" | "full";

export interface ReadinessWeights {
  context: number; // اكتمال سياق المشروع
  requirements: number; // اكتمال المتطلبات
  quality: number; // جودة المتطلبات (من التحليلات المحفوظة)
  acceptance: number; // معايير القبول وقابلية الاختبار
  questions: number; // الأسئلة والمعلومات الناقصة
  status: number; // حالة المتطلبات والاعتماد
  docData: number; // بيانات الوثائق المطلوبة
}

export interface ReadinessSettings {
  enabled: boolean;
  brdReadinessEnabled: boolean;
  srsReadinessEnabled: boolean;
  /** عتبات التصنيف: جاهز ≥ readyMin، جاهز مع ملاحظات ≥ notesMin، يحتاج استكمال ≥ needsWorkMin. */
  thresholds: { readyMin: number; notesMin: number; needsWorkMin: number };
  /** الأوزان — مجموعها 100 (يتحقق الخادم). */
  weights: ReadinessWeights;
  missingAnalysisPolicy: MissingAnalysisPolicy;
  requireAcceptanceCriteria: boolean; // اشتراط معايير القبول لكل متطلب
  criticalNoCriteriaForCritical: boolean; // غياب المعايير عن متطلب حرج = نقص حرج
  minQualityScore: number; // الحد الأدنى لاعتبار الجودة مقبولة
  minApprovedPercent: number; // الحد الأدنى لنسبة المعتمد (0 = لا اشتراط)
  minCriteriaPerRequirement: number;
  exportPolicy: ExportPolicy; // سياسة تصدير الوثيقة المطلوبة عند وجود نواقص حرجة
  planAccess: { FREE: ReadinessPlanAccess; PRO: ReadinessPlanAccess; ENTERPRISE: ReadinessPlanAccess };
  freeMaxIssues: number; // حد الملاحظات المعروضة لخطة الملخص
  defaultBrdApplicability: DocumentApplicability; // للمشاريع الجديدة
  defaultSrsApplicability: DocumentApplicability;
}

export interface SystemSettingsShape {
  general: GeneralSettings;
  contact: ContactSettings;
  notifications: NotificationSettings;
  documents: DocumentSettings;
  plans: PlanSettings;
  ai: AiSettings;
  features: FeatureSettings;
  readiness: ReadinessSettings;
}

export type SettingsSection = keyof SystemSettingsShape;
export const SETTINGS_SECTIONS: SettingsSection[] = [
  "general", "contact", "notifications", "documents", "plans", "ai", "features", "readiness",
];

/** Subset عامة آمنة تُمرر لمكونات العميل — لا إعدادات داخلية ولا أسماء نماذج. */
export interface PublicSettings {
  platformName: string;
  footerText: string;
  supportEmail: string;
  whatsappNumber: string;
  phone: string;
  showWhatsapp: boolean;
  showEmail: boolean;
  activationTimeText: string;
  upgradeMessageText: string;
  upgradeCtaText: string;
}

/**
 * Settings Service المركزي (v2.2) — نقطة القراءة/الكتابة الوحيدة لإعدادات
 * النظام. لا يقرأ أي Component قاعدة البيانات مباشرة:
 *
 * - القراءة: صف singleton واحد → deep-merge فوق defaults → Cache.
 * - Cache: ذاكرة العملية TTL 60 ثانية + دمج لكل طلب عبر React cache().
 *   الحفظ يلغي كاش الـ instance نفسه فورًا؛ بقية الـ instances تلتقط
 *   القيمة خلال ≤ 60 ثانية (موثّق ومقبول لإعدادات تشغيلية).
 * - الكتابة: SUPER_ADMIN فقط (يتحقق منه الـ API)، تحقق خادمي لكل قسم،
 *   سقوف صلبة لا يمكن تجاوزها من النظام، وسجل تدقيق آمن بلا أسرار.
 * - فشل قاعدة البيانات لا يكسر المنصة: نعود إلى defaults الحالية حرفيًا.
 */

import { cache } from "react";
import { prisma, hasDatabase } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { SETTINGS_DEFAULTS, SETTINGS_SCHEMA_VERSION, HARD_CEILINGS } from "./defaults";
import type {
  SystemSettingsShape, SettingsSection, PublicSettings,
  PlanDisplaySettings, AssistantTaskKey,
} from "./types";
import { SETTINGS_SECTIONS } from "./types";

export * from "./types";
export { SETTINGS_DEFAULTS, HARD_CEILINGS } from "./defaults";

/* ---------------- دمج عميق آمن ---------------- */

type PlainObject = Record<string, unknown>;
const isObj = (v: unknown): v is PlainObject =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** يدمج المخزَّن (جزئي) فوق الافتراضي — المفاتيح غير المعروفة تُهمل. */
function mergeOverDefaults<T>(defaults: T, stored: unknown): T {
  if (!isObj(stored)) return defaults;
  const out: PlainObject = { ...(defaults as PlainObject) };
  for (const [k, dv] of Object.entries(defaults as PlainObject)) {
    const sv = stored[k];
    if (sv === undefined) continue;
    if (isObj(dv)) out[k] = mergeOverDefaults(dv, sv);
    else if (Array.isArray(dv)) out[k] = Array.isArray(sv) ? sv : dv;
    else if (typeof sv === typeof dv) out[k] = sv;
  }
  return out as T;
}

/* ---------------- Cache ---------------- */

const TTL_MS = 60_000;
type CacheBox = { value: SystemSettingsShape; at: number } | null;
const g = globalThis as { __wathiqSettingsCache?: CacheBox };

async function readMerged(): Promise<SystemSettingsShape> {
  if (!hasDatabase()) return SETTINGS_DEFAULTS;
  const boxed = g.__wathiqSettingsCache;
  if (boxed && Date.now() - boxed.at < TTL_MS) return boxed.value;
  try {
    const row = await prisma.systemSettings.findUnique({ where: { id: "singleton" } });
    const value: SystemSettingsShape = {
      general: mergeOverDefaults(SETTINGS_DEFAULTS.general, row?.general),
      contact: mergeOverDefaults(SETTINGS_DEFAULTS.contact, row?.contact),
      notifications: mergeOverDefaults(SETTINGS_DEFAULTS.notifications, row?.notifications),
      documents: mergeOverDefaults(SETTINGS_DEFAULTS.documents, row?.documents),
      plans: mergeOverDefaults(SETTINGS_DEFAULTS.plans, row?.plans),
      assistant: mergeOverDefaults(SETTINGS_DEFAULTS.assistant, row?.assistant),
      features: mergeOverDefaults(SETTINGS_DEFAULTS.features, row?.features),
      readiness: mergeOverDefaults(SETTINGS_DEFAULTS.readiness, row?.readiness),
    };
    g.__wathiqSettingsCache = { value, at: Date.now() };
    return value;
  } catch (err) {
    // فشل القراءة لا يكسر المنصة — defaults تطابق السلوك التاريخي.
    console.error("[settings] read failed, using defaults:", err instanceof Error ? err.message : "error");
    return SETTINGS_DEFAULTS;
  }
}

/** قراءة الإعدادات كاملة — مدموجة لكل طلب (React cache) + كاش ذاكرة. */
export const getSystemSettings = cache(readMerged);

export function invalidateSettingsCache(): void {
  g.__wathiqSettingsCache = null;
}

/* getters لكل قسم — استخدم الأخص دائمًا */
export const getGeneralSettings = async () => (await getSystemSettings()).general;
export const getContactSettings = async () => (await getSystemSettings()).contact;
export const getNotificationSettings = async () => (await getSystemSettings()).notifications;
export const getDocumentSettings = async () => (await getSystemSettings()).documents;
export const getPlanSettings = async () => (await getSystemSettings()).plans;
export const getAssistantSettings = async () => (await getSystemSettings()).assistant;
export const getFeatureSettings = async () => (await getSystemSettings()).features;
export const getReadinessSettings = async () => (await getSystemSettings()).readiness;

/** Subset عامة آمنة لتمريرها إلى مكونات العميل — لا إعدادات داخلية. */
export async function getPublicSettings(): Promise<PublicSettings> {
  const s = await getSystemSettings();
  return {
    platformName: s.general.platformName,
    footerText: s.general.footerText,
    supportEmail: s.contact.showEmail ? s.contact.supportEmail : "",
    whatsappNumber: s.contact.showWhatsapp ? s.contact.whatsappNumber : "",
    phone: s.contact.phone,
    showWhatsapp: s.contact.showWhatsapp,
    showEmail: s.contact.showEmail,
    activationTimeText: s.contact.activationTimeText,
    upgradeMessageText: s.contact.upgradeMessageText,
    upgradeCtaText: s.contact.upgradeCtaText,
  };
}

/* ---------------- Resolved helpers (تُطبق السقوف الصلبة) ---------------- */

const clampLimit = (v: number | null, max: number): number | null =>
  v === null ? null : Math.max(0, Math.min(Math.trunc(v), max));

/** خطة محلولة للاستخدام الخادمي — الحدود مقصوصة بالسقوف الصلبة دائمًا. */
export async function getResolvedPlan(planId: string | null | undefined): Promise<PlanDisplaySettings & { id: "FREE" | "PRO" | "ENTERPRISE" }> {
  const plans = await getPlanSettings();
  const id = (planId === "PRO" || planId === "ENTERPRISE" ? planId : "FREE") as "FREE" | "PRO" | "ENTERPRISE";
  const p = plans[id] ?? SETTINGS_DEFAULTS.plans[id];
  return {
    ...p,
    id,
    analysisLimit: clampLimit(p.analysisLimit, HARD_CEILINGS.analysisLimitMax),
    projectLimit: clampLimit(p.projectLimit, HARD_CEILINGS.projectLimitMax),
  };
}

export async function resolvedAnalysisLimitFor(plan: string | null | undefined): Promise<number | null> {
  return (await getResolvedPlan(plan)).analysisLimit;
}
export async function resolvedProjectLimitFor(plan: string | null | undefined): Promise<number | null> {
  return (await getResolvedPlan(plan)).projectLimit;
}

/** حد رموز مهمة المساعد — الإعداد يستطيع التخفيض فقط، السقف في الكود. */
export async function assistantTaskBudget(task: AssistantTaskKey): Promise<{ enabled: boolean; requiresPaidPlan: boolean; maxTokens: number }> {
  const a = await getAssistantSettings();
  const t = a.tasks[task] ?? SETTINGS_DEFAULTS.assistant.tasks[task];
  return {
    enabled: t.enabled,
    requiresPaidPlan: t.requiresPaidPlan,
    maxTokens: Math.min(Math.max(100, Math.trunc(t.maxOutputTokens)), HARD_CEILINGS.assistantTaskTokensMax),
  };
}

/** أيام التذكير الفعالة (تنازليًا) من إعدادات الإشعارات. */
export async function reminderOffsets(): Promise<Array<{ type: string; days: number }>> {
  const n = await getNotificationSettings();
  const out: Array<{ type: string; days: number }> = [];
  if (n.remind30Enabled) out.push({ type: "EXPIRY_30_DAYS", days: 30 });
  if (n.remind14Enabled) out.push({ type: "EXPIRY_14_DAYS", days: 14 });
  if (n.remind7Enabled) out.push({ type: "EXPIRY_7_DAYS", days: 7 });
  if (n.remind3Enabled) out.push({ type: "EXPIRY_3_DAYS", days: 3 });
  if (n.remind1Enabled) out.push({ type: "EXPIRY_1_DAY", days: 1 });
  if (n.remindExpiryDayEnabled) out.push({ type: "EXPIRED", days: 0 });
  return out;
}

/** رابط واتساب مبني من الإعدادات — يستبدل {plan}/{email}/{endDate}. */
export function buildWhatsappLink(number: string, template: string, vars: Record<string, string> = {}): string {
  const num = number.replace(/[^0-9]/g, "");
  const msg = template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "—");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

/* ---------------- التحقق والتطبيع (الخادم هو مرجع الحقيقة) ---------------- */

const str = (v: unknown, max: number, dflt = ""): string =>
  typeof v === "string" ? v.trim().slice(0, max) : dflt;
const bool = (v: unknown, dflt: boolean): boolean => (typeof v === "boolean" ? v : dflt);
const intIn = (v: unknown, min: number, max: number, dflt: number): number => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(n, max)) : dflt;
};
const nullableLimit = (v: unknown, max: number, dflt: number | null): number | null => {
  if (v === null) return null;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : dflt;
};
/** روابط http(s) فقط — يرفض javascript: وdata: وكل ما عداها. */
const safeUrl = (v: unknown): string => {
  const s = str(v, 400);
  if (!s) return "";
  return /^https?:\/\/[^\s<>"']+$/i.test(s) ? s : "";
};
const digits = (v: unknown, max = 15): string => str(v, 20).replace(/[^0-9]/g, "").slice(0, max);
const strArr = (v: unknown, maxItems: number, maxLen: number, dflt: string[]): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, maxLen)).filter(Boolean).slice(0, maxItems) : dflt;

const T = HARD_CEILINGS.textMax;
const LT = HARD_CEILINGS.longTextMax;

type Norm = (input: PlainObject, base: SystemSettingsShape) => PlainObject | { error: string };

const normalizers: Record<SettingsSection, Norm> = {
  general: (i, b) => ({
    platformName: str(i.platformName, 80, b.general.platformName) || b.general.platformName,
    platformNameLatin: str(i.platformNameLatin, 80, b.general.platformNameLatin),
    tagline: str(i.tagline, 200, b.general.tagline),
    logoUrl: safeUrl(i.logoUrl),
    faviconUrl: safeUrl(i.faviconUrl),
    locale: str(i.locale, 8, b.general.locale) || "ar",
    timezone: str(i.timezone, 60, b.general.timezone) || "Asia/Riyadh",
    dateFormat: str(i.dateFormat, 20, b.general.dateFormat) || "DD/MM/YYYY",
    homepageUrl: safeUrl(i.homepageUrl),
    linkedinUrl: safeUrl(i.linkedinUrl),
    xUrl: safeUrl(i.xUrl),
    footerText: str(i.footerText, 300, b.general.footerText),
    showVersion: bool(i.showVersion, b.general.showVersion),
  }),

  contact: (i, b) => {
    const wa = digits(i.whatsappNumber);
    if (typeof i.whatsappNumber === "string" && i.whatsappNumber.trim() && !wa) return { error: "invalid-whatsapp" };
    return {
      whatsappNumber: wa,
      supportEmail: str(i.supportEmail, 160),
      salesEmail: str(i.salesEmail, 160),
      phone: str(i.phone, 30),
      businessHours: str(i.businessHours, 200),
      contactUrl: safeUrl(i.contactUrl),
      upgradeMessageText: str(i.upgradeMessageText, T, b.contact.upgradeMessageText),
      renewalMessageText: str(i.renewalMessageText, T, b.contact.renewalMessageText),
      enterpriseCtaText: str(i.enterpriseCtaText, 80, b.contact.enterpriseCtaText),
      activationTimeText: str(i.activationTimeText, 300, b.contact.activationTimeText),
      upgradeCtaText: str(i.upgradeCtaText, 60, b.contact.upgradeCtaText) || b.contact.upgradeCtaText,
      renewalCtaText: str(i.renewalCtaText, 60, b.contact.renewalCtaText) || b.contact.renewalCtaText,
      showWhatsapp: bool(i.showWhatsapp, b.contact.showWhatsapp),
      showEmail: bool(i.showEmail, b.contact.showEmail),
      showBusinessHours: bool(i.showBusinessHours, b.contact.showBusinessHours),
    };
  },

  notifications: (i, b) => ({
    remind30Enabled: bool(i.remind30Enabled, b.notifications.remind30Enabled),
    remind14Enabled: bool(i.remind14Enabled, b.notifications.remind14Enabled),
    remind7Enabled: bool(i.remind7Enabled, b.notifications.remind7Enabled),
    remind3Enabled: bool(i.remind3Enabled, b.notifications.remind3Enabled),
    remind1Enabled: bool(i.remind1Enabled, b.notifications.remind1Enabled),
    remindExpiryDayEnabled: bool(i.remindExpiryDayEnabled, b.notifications.remindExpiryDayEnabled),
    inAppRemindersEnabled: bool(i.inAppRemindersEnabled, b.notifications.inAppRemindersEnabled),
    emailRemindersEnabled: bool(i.emailRemindersEnabled, b.notifications.emailRemindersEnabled),
    adminAlertsEnabled: bool(i.adminAlertsEnabled, b.notifications.adminAlertsEnabled),
    customerReminderText: str(i.customerReminderText, T),
    expiryText: str(i.expiryText, T),
    renewalText: str(i.renewalText, T),
    suppressWhenScheduled: bool(i.suppressWhenScheduled, b.notifications.suppressWhenScheduled),
  }),

  documents: (i, b) => {
    const brdIn = isObj(i.brd) ? i.brd : {};
    const srsIn = isObj(i.srs) ? i.srs : {};
    const printIn = isObj(i.print) ? i.print : {};
    const bb = b.documents.brd, sb = b.documents.srs;
    return {
      issuerName: str(i.issuerName, 120),
      docLogoUrl: safeUrl(i.docLogoUrl),
      contactLine: str(i.contactLine, 200),
      classification: str(i.classification, 40, b.documents.classification) || b.documents.classification,
      defaultDocVersion: str(i.defaultDocVersion, 20, b.documents.defaultDocVersion) || "V1",
      confidentialityText: str(i.confidentialityText, LT),
      footerTextOverride: str(i.footerTextOverride, T),
      needsInputText: str(i.needsInputText, 200, b.documents.needsInputText) || b.documents.needsInputText,
      notAvailableText: str(i.notAvailableText, 200, b.documents.notAvailableText) || b.documents.notAvailableText,
      notDefinedText: str(i.notDefinedText, 200, b.documents.notDefinedText) || b.documents.notDefinedText,
      aiDisclosureText: str(i.aiDisclosureText, 300, b.documents.aiDisclosureText),
      brd: {
        executiveSummary: bool(brdIn.executiveSummary, bb.executiveSummary),
        goals: bool(brdIn.goals, bb.goals),
        scope: bool(brdIn.scope, bb.scope),
        outOfScope: bool(brdIn.outOfScope, bb.outOfScope),
        stakeholders: bool(brdIn.stakeholders, bb.stakeholders),
        assumptions: bool(brdIn.assumptions, bb.assumptions),
        risks: bool(brdIn.risks, bb.risks),
        approvalTable: bool(brdIn.approvalTable, bb.approvalTable),
        changeLog: bool(brdIn.changeLog, bb.changeLog),
      },
      srs: {
        overview: bool(srsIn.overview, sb.overview),
        environment: bool(srsIn.environment, sb.environment),
        constraints: bool(srsIn.constraints, sb.constraints),
        functional: bool(srsIn.functional, sb.functional),
        nonFunctional: bool(srsIn.nonFunctional, sb.nonFunctional),
        businessRules: bool(srsIn.businessRules, sb.businessRules),
        rtm: bool(srsIn.rtm, sb.rtm),
        approvalTable: bool(srsIn.approvalTable, sb.approvalTable),
      },
      print: {
        pageSize: "A4",
        showLogo: bool(printIn.showLogo, b.documents.print.showLogo),
        showFooter: bool(printIn.showFooter, b.documents.print.showFooter),
      },
    };
  },

  plans: (i, b) => {
    const out: PlainObject = {};
    const codes = ["FREE", "PRO", "ENTERPRISE"] as const; // ثابتة — لا تُغيَّر من الواجهة
    for (const code of codes) {
      const p = isObj(i[code]) ? (i[code] as PlainObject) : {};
      const base = b.plans[code];
      out[code] = {
        displayName: str(p.displayName, 60, base.displayName) || base.displayName,
        title: str(p.title, 80, base.title) || base.title,
        desc: str(p.desc, 300, base.desc),
        price: str(p.price, 40, base.price) || base.price,
        priceNote: str(p.priceNote, 60, base.priceNote),
        yearlyPrice: str(p.yearlyPrice, 40, base.yearlyPrice),
        recommended: bool(p.recommended, base.recommended),
        visible: bool(p.visible, base.visible),
        enabled: bool(p.enabled, base.enabled),
        ctaText: str(p.ctaText, 60, base.ctaText),
        analysisLimit: nullableLimit(p.analysisLimit, HARD_CEILINGS.analysisLimitMax, base.analysisLimit),
        projectLimit: nullableLimit(p.projectLimit, HARD_CEILINGS.projectLimitMax, base.projectLimit),
        features: strArr(p.features, 15, 120, base.features),
        sortOrder: intIn(p.sortOrder, 1, 9, base.sortOrder),
      };
    }
    // لا يجوز إخفاء كل الخطط من صفحة الأسعار.
    const anyVisible = codes.some((c) => (out[c] as PlainObject).visible === true);
    if (!anyVisible) return { error: "all-plans-hidden" };
    return out;
  },

  assistant: (i, b) => {
    const tasksIn = isObj(i.tasks) ? i.tasks : {};
    const tasks: PlainObject = {};
    for (const key of ["improve", "criteria", "questions", "ambiguity", "risks"] as const) {
      const t = isObj(tasksIn[key]) ? (tasksIn[key] as PlainObject) : {};
      const base = b.assistant.tasks[key];
      tasks[key] = {
        enabled: bool(t.enabled, base.enabled),
        maxOutputTokens: intIn(t.maxOutputTokens, 100, HARD_CEILINGS.assistantTaskTokensMax, base.maxOutputTokens),
        requiresPaidPlan: bool(t.requiresPaidPlan, base.requiresPaidPlan),
        label: str(t.label, 60, base.label) || base.label,
        description: str(t.description, 200, base.description),
      };
    }
    return {
      enabledForFree: bool(i.enabledForFree, b.assistant.enabledForFree),
      enabledForPro: bool(i.enabledForPro, b.assistant.enabledForPro),
      enabledForEnterprise: bool(i.enabledForEnterprise, b.assistant.enabledForEnterprise),
      fullAnalysisMaxTokens: intIn(i.fullAnalysisMaxTokens, 1000, HARD_CEILINGS.fullAnalysisTokensMax, b.assistant.fullAnalysisMaxTokens),
      tasks,
    };
  },

  readiness: (i, b) => {
    const r = b.readiness;
    const APP = ["REQUIRED", "OPTIONAL", "NOT_APPLICABLE"];
    const app = (v: unknown, dflt: string) => (typeof v === "string" && APP.includes(v) ? v : dflt);
    const pol = (v: unknown, allowed: string[], dflt: string) => (typeof v === "string" && allowed.includes(v) ? v : dflt);
    const w = isObj(i.weights) ? i.weights : {};
    const weights = {
      context: intIn(w.context, 0, 100, r.weights.context),
      requirements: intIn(w.requirements, 0, 100, r.weights.requirements),
      quality: intIn(w.quality, 0, 100, r.weights.quality),
      acceptance: intIn(w.acceptance, 0, 100, r.weights.acceptance),
      questions: intIn(w.questions, 0, 100, r.weights.questions),
      status: intIn(w.status, 0, 100, r.weights.status),
      docData: intIn(w.docData, 0, 100, r.weights.docData),
    };
    // تحقق خادمي صارم: مجموع الأوزان = 100 (لا اعتماد على الواجهة).
    const sum = Object.values(weights).reduce((a, x) => a + x, 0);
    if (sum !== 100) return { error: "weights-sum-invalid" };
    const t = isObj(i.thresholds) ? i.thresholds : {};
    const readyMin = intIn(t.readyMin, 1, 100, r.thresholds.readyMin);
    const notesMin = intIn(t.notesMin, 1, 100, r.thresholds.notesMin);
    const needsWorkMin = intIn(t.needsWorkMin, 1, 100, r.thresholds.needsWorkMin);
    if (!(readyMin > notesMin && notesMin > needsWorkMin)) return { error: "thresholds-invalid" };
    const pa = isObj(i.planAccess) ? i.planAccess : {};
    return {
      enabled: bool(i.enabled, r.enabled),
      brdReadinessEnabled: bool(i.brdReadinessEnabled, r.brdReadinessEnabled),
      srsReadinessEnabled: bool(i.srsReadinessEnabled, r.srsReadinessEnabled),
      thresholds: { readyMin, notesMin, needsWorkMin },
      weights,
      missingAnalysisPolicy: pol(i.missingAnalysisPolicy, ["note", "important", "block_export", "ignore"], r.missingAnalysisPolicy),
      requireAcceptanceCriteria: bool(i.requireAcceptanceCriteria, r.requireAcceptanceCriteria),
      criticalNoCriteriaForCritical: bool(i.criticalNoCriteriaForCritical, r.criticalNoCriteriaForCritical),
      minQualityScore: intIn(i.minQualityScore, 0, 100, r.minQualityScore),
      minApprovedPercent: intIn(i.minApprovedPercent, 0, 100, r.minApprovedPercent),
      minCriteriaPerRequirement: intIn(i.minCriteriaPerRequirement, 0, 10, r.minCriteriaPerRequirement),
      exportPolicy: pol(i.exportPolicy, ["allow", "warn", "block_critical"], r.exportPolicy),
      planAccess: {
        FREE: pol(pa.FREE, ["summary", "full"], r.planAccess.FREE),
        PRO: pol(pa.PRO, ["summary", "full"], r.planAccess.PRO),
        ENTERPRISE: pol(pa.ENTERPRISE, ["summary", "full"], r.planAccess.ENTERPRISE),
      },
      freeMaxIssues: intIn(i.freeMaxIssues, 1, 50, r.freeMaxIssues),
      defaultBrdApplicability: app(i.defaultBrdApplicability, r.defaultBrdApplicability),
      defaultSrsApplicability: app(i.defaultSrsApplicability, r.defaultSrsApplicability),
    };
  },

  features: (i, b) => ({
    publicRegistrationEnabled: bool(i.publicRegistrationEnabled, b.features.publicRegistrationEnabled),
    projectCollaborationEnabled: bool(i.projectCollaborationEnabled, b.features.projectCollaborationEnabled),
    projectAuditLogEnabled: bool(i.projectAuditLogEnabled, b.features.projectAuditLogEnabled),
    optimisticConcurrencyEnabled: bool(i.optimisticConcurrencyEnabled, b.features.optimisticConcurrencyEnabled),
    commentsEnabled: bool(i.commentsEnabled, b.features.commentsEnabled),
    maintenanceMode: bool(i.maintenanceMode, b.features.maintenanceMode),
    maintenanceMessage: str(i.maintenanceMessage, 500, b.features.maintenanceMessage) || b.features.maintenanceMessage,
    demoModeEnabled: bool(i.demoModeEnabled, b.features.demoModeEnabled),
    feedbackEnabled: bool(i.feedbackEnabled, b.features.feedbackEnabled),
    samplesEnabled: bool(i.samplesEnabled, b.features.samplesEnabled),
    assistantEnabled: bool(i.assistantEnabled, b.features.assistantEnabled),
    documentExportEnabled: bool(i.documentExportEnabled, b.features.documentExportEnabled),
    billingEnabled: bool(i.billingEnabled, b.features.billingEnabled),
    billingEmailsEnabled: bool(i.billingEmailsEnabled, b.features.billingEmailsEnabled),
  }),
};

/* ---------------- diff آمن للتدقيق ---------------- */

const clip = (v: unknown): string => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return (s ?? "").slice(0, 120);
};
function flatDiff(oldV: PlainObject, newV: PlainObject, prefix = ""): Record<string, { old: string; new: string }> {
  const d: Record<string, { old: string; new: string }> = {};
  for (const k of new Set([...Object.keys(oldV), ...Object.keys(newV)])) {
    const o = oldV[k], n = newV[k];
    if (isObj(o) && isObj(n)) Object.assign(d, flatDiff(o, n, `${prefix}${k}.`));
    else if (JSON.stringify(o) !== JSON.stringify(n)) d[`${prefix}${k}`] = { old: clip(o), new: clip(n) };
  }
  return d;
}

/* ---------------- التحديث (يُستدعى من API محمي SUPER_ADMIN فقط) ---------------- */

const SECTION_ACTION: Record<SettingsSection, string> = {
  general: "GENERAL_SETTINGS_UPDATED",
  contact: "CONTACT_SETTINGS_UPDATED",
  notifications: "NOTIFICATION_SETTINGS_UPDATED",
  documents: "DOCUMENT_SETTINGS_UPDATED",
  plans: "PLAN_SETTINGS_UPDATED",
  assistant: "ASSISTANT_SETTINGS_UPDATED",
  features: "FEATURE_SETTINGS_UPDATED",
  readiness: "READINESS_SETTINGS_UPDATED",
};

export async function updateSystemSettings(input: {
  section: SettingsSection;
  values: unknown;
  adminId: string;
  reason?: string | null;
  /** true = استعادة القسم إلى الافتراضي (تجاهل values). */
  resetToDefault?: boolean;
}): Promise<{ ok: true; settings: SystemSettingsShape } | { ok: false; error: string }> {
  const { section, adminId } = input;
  if (!SETTINGS_SECTIONS.includes(section)) return { ok: false, error: "bad-section" };

  const current = await getSystemSettings();
  let normalized: PlainObject;
  if (input.resetToDefault) {
    normalized = SETTINGS_DEFAULTS[section] as unknown as PlainObject;
  } else {
    if (!isObj(input.values)) return { ok: false, error: "bad-request" };
    const res = normalizers[section](input.values, current);
    if ("error" in res && typeof res.error === "string" && Object.keys(res).length === 1) {
      return { ok: false, error: res.error };
    }
    normalized = res as PlainObject;
  }

  const diff = flatDiff(current[section] as unknown as PlainObject, normalized);
  const changedKeys = Object.keys(diff);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.systemSettings.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", schemaVersion: SETTINGS_SCHEMA_VERSION, [section]: normalized as Prisma.InputJsonValue, updatedByAdminId: adminId },
        update: { [section]: normalized as Prisma.InputJsonValue, updatedByAdminId: adminId },
      });
      await tx.settingsAuditLog.create({
        data: {
          adminId,
          section: section.toUpperCase(),
          action: input.resetToDefault ? "SETTINGS_RESET_TO_DEFAULT" : SECTION_ACTION[section],
          changedKeys: changedKeys as Prisma.InputJsonValue,
          diff: diff as unknown as Prisma.InputJsonValue,
          reason: input.reason?.slice(0, 300) ?? null,
        },
      });
    });
  } catch (err) {
    console.error("[settings] update failed:", err instanceof Error ? err.message : "error");
    return { ok: false, error: "transaction-failed" };
  }

  invalidateSettingsCache();
  const settings = await getSystemSettings();
  return { ok: true, settings };
}

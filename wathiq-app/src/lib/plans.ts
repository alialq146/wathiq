/**
 * Subscription plans for Wathiq. Manual upgrades for now (no payment gateway).
 * Limits are enforced server-side; the UI reads these to render pricing,
 * usage, and upgrade prompts.
 */

export type PlanId = "FREE" | "PRO" | "ENTERPRISE";

export interface Plan {
  id: PlanId;
  name: string; // Arabic label
  tag: string; // English tag
  price: string; // display price
  priceNote: string;
  recommended?: boolean;
  /** Max AI analyses; null = custom/unlimited. */
  analysisLimit: number | null;
  /** Max projects; null = unlimited. */
  projectLimit: number | null;
  features: string[];
  limits?: string[];
  cta: "signup" | "whatsapp";
}

export const PLANS: Record<PlanId, Plan> = {
  FREE: {
    id: "FREE",
    name: "مجاني",
    tag: "Free",
    price: "0",
    priceNote: "ريال · للتجربة",
    analysisLimit: 3,
    projectLimit: 1,
    features: [
      "مشروع واحد",
      "٣ تحليلات بالذكاء الاصطناعي",
      "رفع ملفات محدود",
      "عرض نتائج التحليل",
      "لوحة تحكم أساسية",
    ],
    limits: ["لا تصدير PDF احترافي", "لا مشاركة فريق", "لا سجل تحليلات متقدم"],
    cta: "signup",
  },
  PRO: {
    id: "PRO",
    name: "احترافي",
    tag: "Professional",
    price: "149",
    priceNote: "ريال / شهريًا",
    recommended: true,
    analysisLimit: 50,
    projectLimit: null,
    features: [
      "حتى ٥٠ تحليل AI شهريًا",
      "مشاريع متعددة",
      "رفع ملفات أكبر",
      "تحليل متقدم للمتطلبات",
      "اكتشاف النواقص والمخاطر",
      "اقتراح تحسينات",
      "تصدير تقارير PDF",
      "سجل التحليلات",
      "دعم أفضل",
    ],
    cta: "whatsapp",
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "الأعمال",
    tag: "Business / Enterprise",
    price: "تواصل معنا",
    priceNote: "للفرق والمؤسسات",
    analysisLimit: null,
    projectLimit: null,
    features: [
      "مستخدمون متعددون",
      "مساحة عمل للفريق",
      "صلاحيات المستخدمين",
      "سجل تدقيق Audit Log",
      "تقارير تنفيذية",
      "دعم مخصص",
      "API / SSO مستقبلًا",
    ],
    cta: "whatsapp",
  },
};

export const PLAN_ORDER: PlanId[] = ["FREE", "PRO", "ENTERPRISE"];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? "FREE"] ?? PLANS.FREE;
}

/** The analysis quota for a plan (falls back to the plan default). */
export function analysisLimitFor(plan: string | null | undefined): number | null {
  return getPlan(plan).analysisLimit;
}

/** The project quota for a plan. */
export function projectLimitFor(plan: string | null | undefined): number | null {
  return getPlan(plan).projectLimit;
}

/** WhatsApp contact link with a plan-aware message. */
export function whatsappUpgradeLink(reason = "الترقية"): string {
  return (
    "https://wa.me/966531800106?text=" +
    encodeURIComponent(`مرحبًا، أرغب في ${reason} في منصة وثّق.`)
  );
}

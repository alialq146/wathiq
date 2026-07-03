/**
 * Subscription plans for Wathiq. Manual upgrades for now (no payment gateway).
 * Limits are enforced server-side; the UI reads these to render pricing,
 * usage, and upgrade prompts.
 */

export type PlanId = "FREE" | "PRO" | "ENTERPRISE";

export interface Plan {
  id: PlanId;
  name: string; // short Arabic label (dashboard, admin, logs)
  title: string; // display title on the pricing page
  desc: string; // one-line description on the pricing page
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
    title: "الخطة المجانية",
    desc: "مناسبة لتجربة وثّق على مشروع واحد قبل الترقية.",
    tag: "Free",
    price: "0",
    priceNote: "ريال",
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
    limits: ["لا تشمل المشاريع المتعددة أو حدود التحليل الأعلى."],
    cta: "signup",
  },
  PRO: {
    id: "PRO",
    name: "احترافي",
    title: "الخطة الاحترافية",
    desc: "للمحللين ومدراء المشاريع الذين يحتاجون إلى تحليل متطلبات أكثر احترافية.",
    tag: "Professional",
    price: "149",
    priceNote: "ريال / شهريًا",
    recommended: true,
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
    cta: "whatsapp",
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "الأعمال",
    title: "خطة الأعمال",
    desc: "للشركات والجهات التي تحتاج إلى حدود مخصصة ودعم أعلى.",
    tag: "Business / Enterprise",
    price: "تواصل معنا",
    priceNote: "للفرق والمؤسسات",
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

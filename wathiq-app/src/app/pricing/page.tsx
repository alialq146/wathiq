import Image from "next/image";
import { Icon } from "@/components/ds";
import { PLANS, PLAN_ORDER, whatsappUpgradeLink, type Plan } from "@/lib/plans";
import { getSystemSettings } from "@/lib/settings";
import { TrackedUpgradeLink } from "./TrackedUpgradeLink";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الباقات والأسعار · وثّق",
  description: "باقات منصة وثّق لتحليل المتطلبات بالذكاء الاصطناعي: مجاني، احترافي، والأعمال.",
};

const PRICING_FAQS = [
  { q: "هل أحتاج بطاقة ائتمانية للتجربة؟", a: "لا، يمكنك إنشاء حساب وتجربة الخطة المجانية دون بطاقة ائتمانية." },
  { q: "ماذا يحدث عند انتهاء التحليلات المجانية؟", a: "سيتم إيقاف التحليل مؤقتًا، ويمكنك الترقية إلى الخطة الاحترافية لمتابعة تحليل مشاريعك." },
  { q: "هل يمكنني استخدام وثّق لأكثر من مشروع؟", a: "نعم، المشاريع المتعددة متاحة في الخطة الاحترافية وخطة الأعمال." },
  { q: "هل خطة الأعمال مناسبة للجهات الحكومية؟", a: "نعم، خطة الأعمال مناسبة للجهات الحكومية والشركات التي تحتاج إلى حدود مخصصة ودعم أعلى." },
  { q: "هل يتم الدفع داخل المنصة؟", a: "حاليًا تتم الترقية بالتواصل المباشر مع فريق وثّق، وسيتم دعم الدفع الإلكتروني لاحقًا." },
];

export default async function PricingPage() {
  // v2.2: صفحة الأسعار تقرأ إعدادات النظام مرة واحدة (cache مشتركة للطلب):
  // عرض الخطط وحدودها من planSettings، ونصوص التواصل من contactSettings.
  const settings = await getSystemSettings();
  const contact = settings.contact;
  const visiblePlans = PLAN_ORDER.filter((id) => settings.plans[id].visible)
    .sort((a, b) => settings.plans[a].sortOrder - settings.plans[b].sortOrder);
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <header
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 24px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--surface-card)",
        }}
      >
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image src="/assets/wathiq-mark.png" alt="Wathiq" width={30} height={30} style={{ borderRadius: 7 }} />
          <span style={{ font: "var(--weight-bold) 16px/1 var(--font-sans)", color: "var(--navy-900)" }}>وثّق</span>
        </a>
        <a
          href="/"
          style={{
            marginInlineStart: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            textDecoration: "none",
            color: "var(--text-muted)",
            font: "14px var(--font-sans)",
          }}
        >
          <Icon name="chevron-right" size={16} /> العودة للرئيسية
        </a>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "56px 24px 72px" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <span style={{ display: "inline-block", font: "var(--weight-bold) 12.5px/1 var(--font-sans)", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--teal-600)", marginBottom: 12 }}>
            الباقات
          </span>
          <h1 style={{ font: "var(--weight-bold) 34px/1.3 var(--font-sans)", color: "var(--navy-950)", margin: "0 0 10px" }}>
            باقات واضحة تبدأ بالتجربة وتنمو مع احتياجك
          </h1>
          <p style={{ font: "16px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
            ابدأ مجانًا لاختبار تحليل المتطلبات، ثم انتقل إلى الخطة الاحترافية عندما تحتاج إلى مشاريع أكثر وتحليلات أعمق.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 20, alignItems: "stretch" }}>
          {visiblePlans.map((id) => (
            <PlanCard
              key={id}
              plan={PLANS[id]}
              ps={settings.plans[id]}
              contact={{ whatsappNumber: contact.whatsappNumber, upgradeMessageText: contact.upgradeMessageText, activationTimeText: contact.activationTimeText, enterpriseCtaText: contact.enterpriseCtaText }}
            />
          ))}
        </div>

        <p style={{ textAlign: "center", marginTop: 34, font: "13.5px/1.8 var(--font-sans)", color: "var(--text-muted)" }}>
          يمكنك البدء بالخطة المجانية دون بطاقة ائتمانية. {contact.activationTimeText}
          <br />
          <span style={{ color: "var(--text-subtle)", fontSize: 12.5 }}>جميع الباقات تشمل واجهة عربية كاملة (RTL) وعزلًا آمنًا لبياناتك.</span>
        </p>

        {/* ---- الفرق بين الباقات ---- */}
        <section style={{ maxWidth: 760, margin: "48px auto 0", textAlign: "center" }}>
          <h2 style={{ font: "var(--weight-bold) 22px/1.4 var(--font-sans)", color: "var(--navy-950)", margin: "0 0 10px" }}>
            ما الفرق بين الباقات؟
          </h2>
          <p style={{ font: "15px/1.9 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
            الخطة المجانية تمنحك تجربة أولية، بينما تمنحك الخطة الاحترافية مساحة أكبر لتحليل مشاريع متعددة،
            أما خطة الأعمال فهي مخصصة للجهات التي تحتاج إلى حدود ودعم مخصص.
          </p>
        </section>

        {/* ---- أسئلة شائعة عن الأسعار ---- */}
        <section style={{ maxWidth: 760, margin: "44px auto 0" }}>
          <h2 style={{ font: "var(--weight-bold) 22px/1.4 var(--font-sans)", color: "var(--navy-950)", margin: "0 0 18px", textAlign: "center" }}>
            أسئلة شائعة عن الأسعار
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PRICING_FAQS.map((f) => (
              <div
                key={f.q}
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                  padding: "16px 20px",
                }}
              >
                <h3 style={{ font: "var(--weight-semibold) 15px/1.5 var(--font-sans)", color: "var(--text-strong)", margin: "0 0 6px" }}>
                  {f.q}
                </h3>
                <p style={{ font: "14px/1.8 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

import type { PlanDisplaySettings } from "@/lib/settings/types";

interface CardContact { whatsappNumber: string; upgradeMessageText: string; activationTimeText: string; enterpriseCtaText: string }

function PlanCard({ plan, ps, contact }: { plan: Plan; ps: PlanDisplaySettings; contact: CardContact }) {
  const recommended = ps.recommended;
  const dark = recommended;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: 28,
        borderRadius: "var(--radius-xl)",
        background: dark ? "linear-gradient(160deg, #071B3D, #0C2566)" : "var(--surface-card)",
        color: dark ? "#fff" : "var(--text-body)",
        border: dark ? "none" : "1px solid var(--border-default)",
        boxShadow: dark ? "var(--shadow-xl)" : "none",
      }}
    >
      {recommended && (
        <span style={{ position: "absolute", insetInlineStart: 24, top: -12, background: "var(--teal-500)", color: "#fff", font: "var(--weight-semibold) 11px/1 var(--font-sans)", padding: "6px 12px", borderRadius: "var(--radius-pill)" }}>
          الأكثر مناسبة
        </span>
      )}
      <div style={{ marginBottom: 6 }}>
        <span style={{ font: "var(--weight-semibold) 18px/1 var(--font-sans)", color: dark ? "#fff" : "var(--text-strong)" }}>{ps.title}</span>
        <span style={{ font: "11px var(--font-mono)", color: dark ? "rgba(255,255,255,.6)" : "var(--text-subtle)", marginInlineStart: 8 }}>{plan.tag}</span>
      </div>
      <p style={{ font: "13px/1.7 var(--font-sans)", color: dark ? "rgba(255,255,255,.75)" : "var(--text-muted)", margin: "0 0 4px" }}>
        {ps.desc}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "6px 0 2px" }}>
        <span style={{ font: `var(--weight-bold) ${ps.price.length > 4 ? "22px" : "34px"}/1.1 var(--font-sans)`, color: dark ? "#fff" : "var(--navy-950)" }}>
          {ps.price}
        </span>
        <span style={{ font: "13px var(--font-sans)", color: dark ? "rgba(255,255,255,.75)" : "var(--text-muted)" }}>{ps.priceNote}</span>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
        {ps.features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, font: "14px/1.5 var(--font-sans)", color: dark ? "rgba(255,255,255,.92)" : "var(--text-body)" }}>
            <Icon name="check" size={16} color={dark ? "var(--teal-300)" : "var(--green-500)"} strokeWidth={2.5} />
            <span>{f}</span>
          </li>
        ))}
        {plan.limits?.map((l) => (
          <li key={l} style={{ display: "flex", alignItems: "flex-start", gap: 9, font: "13.5px/1.5 var(--font-sans)", color: dark ? "rgba(255,255,255,.55)" : "var(--text-subtle)" }}>
            <Icon name="x" size={15} color={dark ? "rgba(255,255,255,.4)" : "var(--text-subtle)"} />
            <span>{l}</span>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 22 }}>
        {plan.cta === "signup" ? (
          <a href="/signup" style={btn(false)}>ابدأ مجانًا</a>
        ) : (
          <>
            <TrackedUpgradeLink href={whatsappUpgradeLink(ps.title, { number: contact.whatsappNumber, template: contact.upgradeMessageText })} plan={plan.id} style={btn(true)}>
              <Icon name="message-circle" size={17} color="#06231A" />
              {ps.ctaText || (plan.id === "PRO" ? "طلب الترقية عبر واتساب" : contact.enterpriseCtaText)}
            </TrackedUpgradeLink>
            <div style={{ marginTop: 9, font: "11.5px/1.6 var(--font-sans)", color: dark ? "rgba(255,255,255,.55)" : "var(--text-subtle)", textAlign: "center" }}>
              {contact.activationTimeText}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function btn(whatsapp: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    height: 44,
    borderRadius: "var(--radius-pill)",
    textDecoration: "none",
    font: "var(--weight-bold) 15px var(--font-sans)",
    ...(whatsapp
      ? { background: "#25D366", color: "#06231A" }
      : { background: "var(--primary)", color: "#fff" }),
  };
}

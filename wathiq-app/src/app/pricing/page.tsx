import Image from "next/image";
import { Icon } from "@/components/ds";
import { PLANS, PLAN_ORDER, whatsappUpgradeLink, type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الباقات والأسعار · وثّق",
  description: "باقات منصة وثّق لتحليل المتطلبات بالذكاء الاصطناعي: مجاني، احترافي، والأعمال.",
};

export default function PricingPage() {
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
            اختر الباقة المناسبة لك
          </h1>
          <p style={{ font: "16px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
            ابدأ مجانًا، وارتقِ عند الحاجة. الترقية حاليًا تتم يدويًّا عبر التواصل المباشر — والدفع الإلكتروني قريبًا.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 20, alignItems: "stretch" }}>
          {PLAN_ORDER.map((id) => (
            <PlanCard key={id} plan={PLANS[id]} />
          ))}
        </div>

        <p style={{ textAlign: "center", marginTop: 34, font: "13px var(--font-sans)", color: "var(--text-subtle)" }}>
          جميع الباقات تشمل واجهة عربية كاملة (RTL) وعزلًا آمنًا لبياناتك.
        </p>
      </main>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const recommended = plan.recommended;
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
          الأكثر قيمة
        </span>
      )}
      <div style={{ marginBottom: 6 }}>
        <span style={{ font: "var(--weight-semibold) 18px/1 var(--font-sans)", color: dark ? "#fff" : "var(--text-strong)" }}>{plan.name}</span>
        <span style={{ font: "11px var(--font-mono)", color: dark ? "rgba(255,255,255,.6)" : "var(--text-subtle)", marginInlineStart: 8 }}>{plan.tag}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "6px 0 2px" }}>
        <span style={{ font: `var(--weight-bold) ${plan.price.length > 4 ? "22px" : "34px"}/1.1 var(--font-sans)`, color: dark ? "#fff" : "var(--navy-950)" }}>
          {plan.price}
        </span>
        <span style={{ font: "13px var(--font-sans)", color: dark ? "rgba(255,255,255,.75)" : "var(--text-muted)" }}>{plan.priceNote}</span>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
        {plan.features.map((f) => (
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
          <a href="/signup" style={btn(false)}>ابدأ الآن مجانًا</a>
        ) : (
          <a href={whatsappUpgradeLink(`الترقية إلى باقة ${plan.name}`)} target="_blank" rel="noopener noreferrer" style={btn(true)}>
            <Icon name="message-circle" size={17} color="#06231A" /> تواصل عبر واتساب
          </a>
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

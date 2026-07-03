import Image from "next/image";
import { Icon } from "@/components/ds";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الاشتراك · وثّق",
  description: "خطط اشتراك منصة وثّق لتحليل المتطلبات بالذكاء الاصطناعي.",
};

const WHATSAPP =
  "https://wa.me/966531800106?text=" +
  encodeURIComponent("مرحبًا، أرغب في ترقية اشتراكي في منصة وثّق للحصول على تحليلات إضافية.");

const FREE = ["تحليل واحد مجاني بالذكاء الاصطناعي", "استخراج المتطلبات والمعايير والأسئلة", "تصدير PDF · Word · Excel", "مساحة عمل خاصة وآمنة"];
const PRO = ["تحليلات غير محدودة", "أولوية في المعالجة", "دعم مباشر عبر واتساب", "كل مميزات الخطة المجانية"];

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", display: "flex", flexDirection: "column" }}>
      {/* header */}
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

      <main style={{ flex: 1, padding: "56px 24px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span
            style={{
              display: "inline-block",
              font: "var(--weight-bold) 12.5px/1 var(--font-sans)",
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "var(--teal-600)",
              marginBottom: 12,
            }}
          >
            الاشتراك
          </span>
          <h1 style={{ font: "var(--weight-bold) 34px/1.3 var(--font-sans)", color: "var(--navy-950)", margin: "0 0 10px" }}>
            ابدأ مجانًا، وارتقِ عند الحاجة
          </h1>
          <p style={{ font: "16px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
            جرّب وثّق بتحليل مجاني، وعند الحاجة لمزيد تواصل معنا مباشرة عبر واتساب — ووسيلة الدفع الإلكتروني قريبًا.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, alignItems: "start" }}>
          {/* Free */}
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
              padding: 28,
            }}
          >
            <h2 style={{ font: "var(--weight-semibold) 18px/1 var(--font-sans)", color: "var(--text-strong)", margin: "0 0 8px" }}>مجاني</h2>
            <div style={{ font: "var(--weight-bold) 34px/1 var(--font-sans)", color: "var(--navy-950)", margin: "0 0 4px" }}>
              0<span style={{ font: "14px var(--font-sans)", color: "var(--text-muted)" }}> ريال</span>
            </div>
            <p style={{ font: "13px var(--font-sans)", color: "var(--text-muted)", margin: "0 0 20px" }}>للتجربة والاستخدام الفردي</p>
            <Plan items={FREE} />
            <a
              href="/signup"
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 22,
                height: 44,
                alignItems: "center",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-card)",
                color: "var(--navy-900)",
                font: "var(--weight-semibold) 15px var(--font-sans)",
                textDecoration: "none",
              }}
            >
              ابدأ الآن مجانًا
            </a>
          </div>

          {/* Pro */}
          <div
            style={{
              position: "relative",
              background: "linear-gradient(150deg, #071B3D, #0C2566)",
              borderRadius: "var(--radius-xl)",
              padding: 28,
              color: "#fff",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <span
              style={{
                position: "absolute",
                insetInlineStart: 20,
                top: -12,
                background: "var(--teal-500)",
                color: "#fff",
                font: "var(--weight-semibold) 11px/1 var(--font-sans)",
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
              }}
            >
              الأكثر قيمة
            </span>
            <h2 style={{ font: "var(--weight-semibold) 18px/1 var(--font-sans)", margin: "0 0 8px" }}>احترافي</h2>
            <div style={{ font: "var(--weight-bold) 26px/1.2 var(--font-sans)", margin: "0 0 4px" }}>تواصل معنا</div>
            <p style={{ font: "13px var(--font-sans)", color: "rgba(255,255,255,.7)", margin: "0 0 20px" }}>للفرق والاستخدام المكثّف</p>
            <Plan items={PRO} dark />
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                marginTop: 22,
                height: 44,
                borderRadius: "var(--radius-pill)",
                background: "#25D366",
                color: "#06231A",
                font: "var(--weight-bold) 15px var(--font-sans)",
                textDecoration: "none",
              }}
            >
              <Icon name="message-circle" size={18} color="#06231A" /> تواصل عبر واتساب
            </a>
            <a
              href="mailto:wathiq.ai.app@gmail.com"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
                height: 40,
                color: "rgba(255,255,255,.85)",
                font: "14px var(--font-sans)",
                textDecoration: "none",
              }}
            >
              <Icon name="mail" size={15} color="rgba(255,255,255,.85)" /> wathiq.ai.app@gmail.com
            </a>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 32, font: "13px var(--font-sans)", color: "var(--text-subtle)" }}>
          وسيلة دفع إلكترونية ستُضاف قريبًا. حاليًا تتم الترقية يدويًّا عبر التواصل المباشر.
        </p>
      </main>
    </div>
  );
}

function Plan({ items, dark = false }: { items: string[]; dark?: boolean }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((t) => (
        <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: 9, font: "14px/1.5 var(--font-sans)", color: dark ? "rgba(255,255,255,.9)" : "var(--text-body)" }}>
          <Icon name="check" size={16} color={dark ? "var(--teal-300)" : "var(--green-500)"} strokeWidth={2.5} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

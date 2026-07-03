import Image from "next/image";
import { Icon } from "@/components/ds";

export interface LegalSection {
  h: string;
  p: string[];
}

/** Shared layout for the privacy / terms pages. */
export function LegalShell({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
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

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 72px" }}>
        <h1 style={{ font: "var(--weight-bold) 32px/1.3 var(--font-sans)", color: "var(--navy-950)", margin: "0 0 8px" }}>{title}</h1>
        <p style={{ font: "13px var(--font-sans)", color: "var(--text-subtle)", margin: "0 0 22px" }}>آخر تحديث: {updated}</p>
        <p style={{ font: "16px/1.9 var(--font-sans)", color: "var(--text-body)", margin: "0 0 28px" }}>{intro}</p>

        {sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 26 }}>
            <h2 style={{ font: "var(--weight-semibold) 19px/1.4 var(--font-sans)", color: "var(--text-strong)", margin: "0 0 10px" }}>
              {i + 1}. {s.h}
            </h2>
            {s.p.map((para, j) => (
              <p key={j} style={{ font: "15px/1.9 var(--font-sans)", color: "var(--text-body)", margin: "0 0 10px" }}>
                {para}
              </p>
            ))}
          </section>
        ))}

        <div
          style={{
            marginTop: 34,
            padding: "16px 18px",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-card)",
            border: "1px solid var(--border-default)",
            font: "14px/1.8 var(--font-sans)",
            color: "var(--text-muted)",
          }}
        >
          للاستفسار عن هذه السياسة، تواصل معنا على{" "}
          <a href="mailto:wathiq.ai.app@gmail.com" style={{ color: "var(--text-link)", textDecoration: "none" }}>
            wathiq.ai.app@gmail.com
          </a>{" "}
          أو عبر واتساب على ‎+966&nbsp;53&nbsp;180&nbsp;0106.
        </div>
      </main>
    </div>
  );
}

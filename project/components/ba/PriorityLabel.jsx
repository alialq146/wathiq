import React from "react";

const LEVELS = {
  critical: { c: "var(--priority-critical)", ar: "حرجة", en: "Critical", bars: 4 },
  high: { c: "var(--priority-high)", ar: "عالية", en: "High", bars: 3 },
  medium: { c: "var(--priority-medium)", ar: "متوسطة", en: "Medium", bars: 2 },
  low: { c: "var(--priority-low)", ar: "منخفضة", en: "Low", bars: 1 },
};

/** Priority label with a signal-bar glyph. Use on requirements and tasks. */
export function PriorityLabel({ level = "medium", lang = "ar", showLabel = true, style, ...rest }) {
  const l = LEVELS[level] || LEVELS.medium;
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 7, font: "var(--weight-medium) var(--text-sm)/1 var(--font-sans)", color: "var(--text-body)", ...style }}
      title={l[lang === "en" ? "en" : "ar"]}
      {...rest}
    >
      <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 1.5, height: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            style={{
              width: 3,
              height: 3 + i * 2.5,
              borderRadius: 1,
              background: i <= l.bars ? l.c : "var(--slate-200)",
            }}
          />
        ))}
      </span>
      {showLabel && (lang === "en" ? l.en : l.ar)}
    </span>
  );
}

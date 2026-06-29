import React from "react";

/**
 * Requirement lifecycle status badge. Encodes the BA workflow states with
 * a consistent dot + bilingual-friendly label.
 */
const STATUS = {
  draft: { fg: "var(--status-neutral-fg)", bg: "var(--status-neutral-bg)", dot: "var(--slate-500)", ar: "مسودة", en: "Draft" },
  analyzing: { fg: "var(--status-info-fg)", bg: "var(--status-info-bg)", dot: "var(--blue-600)", ar: "قيد التحليل", en: "Analyzing" },
  review: { fg: "var(--status-warning-fg)", bg: "var(--status-warning-bg)", dot: "var(--amber-500)", ar: "قيد المراجعة", en: "In Review" },
  needs_info: { fg: "var(--status-ai-fg)", bg: "var(--status-ai-bg)", dot: "var(--teal-500)", ar: "بحاجة لمعلومات", en: "Needs Info" },
  approved: { fg: "var(--status-success-fg)", bg: "var(--status-success-bg)", dot: "var(--green-500)", ar: "معتمد", en: "Approved" },
  blocked: { fg: "var(--status-danger-fg)", bg: "var(--status-danger-bg)", dot: "var(--red-500)", ar: "محظور", en: "Blocked" },
};

export function StatusBadge({ status = "draft", lang = "ar", children, style, ...rest }) {
  const s = STATUS[status] || STATUS.draft;
  const label = children || (lang === "en" ? s.en : s.ar);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: "var(--radius-pill)",
        font: "var(--weight-medium) var(--text-xs)/1 var(--font-sans)",
        color: s.fg,
        background: s.bg,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {label}
    </span>
  );
}

StatusBadge.STATUSES = Object.keys(STATUS);

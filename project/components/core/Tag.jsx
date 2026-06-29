import React from "react";

/** Outlined keyword tag — taxonomy, modules, removable filters. */
export function Tag({ children, onRemove, color = "slate", style, ...rest }) {
  const colors = {
    slate: { fg: "var(--slate-600)", bd: "var(--border-default)", bg: "var(--surface-card)" },
    blue: { fg: "var(--blue-700)", bd: "var(--blue-200)", bg: "var(--blue-50)" },
    teal: { fg: "var(--teal-700)", bd: "var(--teal-200)", bg: "var(--teal-50)" },
  };
  const c = colors[color] || colors.slate;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px 3px 10px",
        borderRadius: "var(--radius-sm)",
        font: "var(--weight-medium) var(--text-xs)/1.4 var(--font-sans)",
        color: c.fg,
        background: c.bg,
        border: `1px solid ${c.bd}`,
        ...style,
      }}
      {...rest}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="إزالة"
          style={{
            display: "inline-flex",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--text-subtle)",
            padding: 0,
            lineHeight: 0,
            fontSize: 14,
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}

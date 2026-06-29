import React from "react";

/** Native select styled to match Wathiq inputs. */
export function Select({ label, hint, options = [], size = "md", id, style, containerStyle, ...rest }) {
  const autoId = React.useId();
  const selId = id || autoId;
  const sizes = { sm: 32, md: 38, lg: 44 };
  const h = sizes[size] || sizes.md;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...containerStyle }}>
      {label && (
        <label htmlFor={selId} style={{ font: "var(--weight-medium) var(--text-sm)/1 var(--font-sans)", color: "var(--text-strong)" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select
          id={selId}
          style={{
            width: "100%",
            height: h,
            padding: "0 12px",
            paddingInlineEnd: 34,
            font: "var(--weight-regular) var(--text-base)/1 var(--font-sans)",
            color: "var(--text-strong)",
            background: "var(--surface-card)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-md)",
            appearance: "none",
            cursor: "pointer",
            outline: "none",
            ...style,
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "0 0 0 3px var(--focus-ring)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border-strong)"; e.target.style.boxShadow = "none"; }}
          {...rest}
        >
          {options.map((o) => {
            const val = typeof o === "string" ? o : o.value;
            const lab = typeof o === "string" ? o : o.label;
            return <option key={val} value={val}>{lab}</option>;
          })}
        </select>
        <span style={{ position: "absolute", insetInlineEnd: 12, pointerEvents: "none", color: "var(--text-subtle)", fontSize: 12 }}>▾</span>
      </div>
      {hint && <span style={{ font: "var(--weight-regular) var(--text-xs)/1.4 var(--font-sans)", color: "var(--text-muted)" }}>{hint}</span>}
    </div>
  );
}

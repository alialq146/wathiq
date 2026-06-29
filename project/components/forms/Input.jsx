import React from "react";

/** Text input with optional label, leading icon, and helper/error text. */
export function Input({
  label,
  hint,
  error,
  iconStart,
  size = "md",
  id,
  style,
  containerStyle,
  ...rest
}) {
  const autoId = React.useId();
  const inputId = id || autoId;
  const sizes = { sm: { h: 32, f: "13px" }, md: { h: 38, f: "14px" }, lg: { h: 44, f: "15px" } };
  const s = sizes[size] || sizes.md;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...containerStyle }}>
      {label && (
        <label htmlFor={inputId} style={{ font: "var(--weight-medium) var(--text-sm)/1 var(--font-sans)", color: "var(--text-strong)" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {iconStart && (
          <span style={{ position: "absolute", insetInlineStart: 11, display: "inline-flex", color: "var(--text-subtle)", pointerEvents: "none" }}>
            {iconStart}
          </span>
        )}
        <input
          id={inputId}
          style={{
            width: "100%",
            height: s.h,
            padding: iconStart ? "0 12px 0 36px" : "0 12px",
            paddingInlineStart: iconStart ? 36 : 12,
            font: `var(--weight-regular) ${s.f}/1 var(--font-sans)`,
            color: "var(--text-strong)",
            background: "var(--surface-card)",
            border: `1px solid ${error ? "var(--red-500)" : "var(--border-strong)"}`,
            borderRadius: "var(--radius-md)",
            outline: "none",
            transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
            ...style,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? "var(--red-500)" : "var(--border-focus)";
            e.target.style.boxShadow = `0 0 0 3px ${error ? "rgba(217,45,69,0.18)" : "var(--focus-ring)"}`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? "var(--red-500)" : "var(--border-strong)";
            e.target.style.boxShadow = "none";
          }}
          aria-invalid={!!error}
          {...rest}
        />
      </div>
      {(hint || error) && (
        <span style={{ font: "var(--weight-regular) var(--text-xs)/1.4 var(--font-sans)", color: error ? "var(--red-600)" : "var(--text-muted)" }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}

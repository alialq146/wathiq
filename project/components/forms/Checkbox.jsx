import React from "react";

/** Checkbox with label. Use for acceptance-criteria checklists and filters. */
export function Checkbox({ label, checked, defaultChecked, onChange, disabled = false, id, style, ...rest }) {
  const autoId = React.useId();
  const cbId = id || autoId;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const on = checked !== undefined ? checked : internal;
  const toggle = (e) => {
    if (disabled) return;
    if (checked === undefined) setInternal(e.target.checked);
    onChange && onChange(e);
  };
  return (
    <label
      htmlFor={cbId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        font: "var(--weight-regular) var(--text-base)/1.4 var(--font-sans)",
        color: "var(--text-body)",
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          width: 18,
          height: 18,
          flex: "0 0 18px",
          borderRadius: "var(--radius-xs)",
          border: `1.5px solid ${on ? "var(--primary)" : "var(--border-strong)"}`,
          background: on ? "var(--primary)" : "var(--surface-card)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background var(--dur-fast), border-color var(--dur-fast)",
        }}
      >
        {on && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input id={cbId} type="checkbox" checked={on} onChange={toggle} disabled={disabled} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      {label}
    </label>
  );
}

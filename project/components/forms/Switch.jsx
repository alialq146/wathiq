import React from "react";

/** Toggle switch for binary settings. */
export function Switch({ checked, defaultChecked, onChange, label, disabled = false, id, style, ...rest }) {
  const autoId = React.useId();
  const swId = id || autoId;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const on = checked !== undefined ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    const next = !on;
    if (checked === undefined) setInternal(next);
    onChange && onChange(next);
  };
  return (
    <label
      htmlFor={swId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        font: "var(--weight-regular) var(--text-base)/1 var(--font-sans)",
        color: "var(--text-body)",
        ...style,
      }}
      {...rest}
    >
      <button
        id={swId}
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        disabled={disabled}
        style={{
          width: 36,
          height: 20,
          flex: "0 0 36px",
          borderRadius: 999,
          border: "none",
          padding: 2,
          background: on ? "var(--primary)" : "var(--slate-300)",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background var(--dur-base) var(--ease-out)",
          display: "flex",
          justifyContent: on ? "flex-end" : "flex-start",
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "var(--shadow-xs)",
            transition: "all var(--dur-base) var(--ease-out)",
          }}
        />
      </button>
      {label}
    </label>
  );
}

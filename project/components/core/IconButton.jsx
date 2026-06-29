import React from "react";

/** Square icon-only button. Pass a Lucide <i data-lucide> or an SVG as children. */
export function IconButton({
  children,
  variant = "ghost",
  size = "md",
  label,
  disabled = false,
  style,
  ...rest
}) {
  const dims = { sm: 28, md: 34, lg: 40 };
  const d = dims[size] || dims.md;
  const variants = {
    ghost: { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" },
    soft: { background: "var(--slate-100)", color: "var(--text-body)", border: "1px solid transparent" },
    outline: { background: "var(--surface-card)", color: "var(--text-body)", border: "1px solid var(--border-default)" },
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      style={{
        width: d,
        height: d,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast)",
        ...(variants[variant] || variants.ghost),
        ...style,
      }}
      onMouseEnter={(e) => { if (variant === "ghost") e.currentTarget.style.background = "var(--slate-100)"; }}
      onMouseLeave={(e) => { if (variant === "ghost") e.currentTarget.style.background = "transparent"; }}
      {...rest}
    >
      {children}
    </button>
  );
}

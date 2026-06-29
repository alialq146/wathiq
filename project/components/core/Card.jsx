import React from "react";

/** Surface container. The 12px-radius card is the signature Wathiq surface. */
export function Card({ children, padding = "lg", interactive = false, elevation = "sm", style, ...rest }) {
  const pads = { none: 0, sm: "14px", md: "var(--pad-card)", lg: "var(--pad-card-lg)" };
  const shadows = { none: "none", sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)" };
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: pads[padding] ?? pads.lg,
        boxShadow: shadows[elevation] ?? shadows.sm,
        transition: "box-shadow var(--dur-base) var(--ease-out), border-color var(--dur-base)",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (interactive) {
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
          e.currentTarget.style.borderColor = "var(--border-strong)";
        }
      }}
      onMouseLeave={(e) => {
        if (interactive) {
          e.currentTarget.style.boxShadow = shadows[elevation] ?? shadows.sm;
          e.currentTarget.style.borderColor = "var(--border-default)";
        }
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

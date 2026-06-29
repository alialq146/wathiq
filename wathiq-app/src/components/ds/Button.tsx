"use client";

import React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "brand" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
}

/**
 * Wathiq primary action button. Calm, enterprise styling — no gradients,
 * subtle shadow on solid variants, 8px radius.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  iconStart,
  iconEnd,
  fullWidth = false,
  disabled = false,
  type = "button",
  style,
  ...rest
}: ButtonProps) {
  const sizes: Record<ButtonSize, React.CSSProperties & { gap: number; radius: string }> = {
    sm: { padding: "6px 12px", fontSize: "13px", height: 30, gap: 6, radius: "var(--radius-sm)" },
    md: { padding: "8px 16px", fontSize: "14px", height: 36, gap: 7, radius: "var(--radius-md)" },
    lg: { padding: "11px 20px", fontSize: "15px", height: 44, gap: 8, radius: "var(--radius-md)" },
  };
  const s = sizes[size] || sizes.md;

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: "var(--primary)",
      color: "#fff",
      border: "1px solid var(--primary)",
      boxShadow: "var(--shadow-xs)",
    },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--text-strong)",
      border: "1px solid var(--border-strong)",
      boxShadow: "var(--shadow-xs)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-body)",
      border: "1px solid transparent",
    },
    brand: {
      background: "var(--brand)",
      color: "#fff",
      border: "1px solid var(--brand)",
      boxShadow: "var(--shadow-xs)",
    },
    danger: {
      background: "var(--red-500)",
      color: "#fff",
      border: "1px solid var(--red-500)",
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        font: `var(--weight-medium) ${s.fontSize}/1 var(--font-sans)`,
        borderRadius: s.radius,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? "100%" : undefined,
        transition:
          "background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast), transform var(--dur-fast)",
        whiteSpace: "nowrap",
        ...(variants[variant] || variants.primary),
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "translateY(0.5px)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
      {...rest}
    >
      {iconStart}
      {children}
      {iconEnd}
    </button>
  );
}

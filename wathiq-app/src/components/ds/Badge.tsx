"use client";

import React from "react";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "ai";
export type BadgeVariant = "soft" | "solid";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  dot?: boolean;
}

/** Small status/label pill. Tones map to the semantic status palette. */
export function Badge({
  children,
  tone = "neutral",
  variant = "soft",
  dot = false,
  style,
  ...rest
}: BadgeProps) {
  const tones: Record<BadgeTone, { fg: string; bg: string; dot: string }> = {
    neutral: { fg: "var(--status-neutral-fg)", bg: "var(--status-neutral-bg)", dot: "var(--slate-500)" },
    info: { fg: "var(--status-info-fg)", bg: "var(--status-info-bg)", dot: "var(--blue-600)" },
    success: { fg: "var(--status-success-fg)", bg: "var(--status-success-bg)", dot: "var(--green-500)" },
    warning: { fg: "var(--status-warning-fg)", bg: "var(--status-warning-bg)", dot: "var(--amber-500)" },
    danger: { fg: "var(--status-danger-fg)", bg: "var(--status-danger-bg)", dot: "var(--red-500)" },
    ai: { fg: "var(--status-ai-fg)", bg: "var(--status-ai-bg)", dot: "var(--teal-500)" },
  };
  const t = tones[tone] || tones.neutral;
  const solid = variant === "solid";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: "var(--radius-pill)",
        font: "var(--weight-medium) var(--text-xs)/1 var(--font-sans)",
        color: solid ? "#fff" : t.fg,
        background: solid ? t.dot : t.bg,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span
          style={{ width: 6, height: 6, borderRadius: "50%", background: solid ? "#fff" : t.dot }}
        />
      )}
      {children}
    </span>
  );
}

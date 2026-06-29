"use client";

import React from "react";

export type ConfidenceVariant = "bar" | "pill";

export interface ConfidenceMeterProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  variant?: ConfidenceVariant;
  label?: string;
  showValue?: boolean;
}

/**
 * AI confidence indicator. Communicates how sure the model is about an
 * extraction or recommendation — central to Wathiq's "no black box" stance.
 * Renders as a labeled track (default) or a compact inline pill.
 */
export function ConfidenceMeter({
  value = 0,
  variant = "bar",
  label = "ثقة الذكاء الاصطناعي",
  showValue = true,
  style,
  ...rest
}: ConfidenceMeterProps) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const color =
    v >= 75 ? "var(--confidence-high)" : v >= 50 ? "var(--confidence-med)" : "var(--confidence-low)";
  const tier = v >= 75 ? "عالية" : v >= 50 ? "متوسطة" : "منخفضة";

  if (variant === "pill") {
    const bg = v >= 75 ? "var(--teal-50)" : v >= 50 ? "var(--amber-50)" : "var(--red-50)";
    const fg = v >= 75 ? "var(--teal-700)" : v >= 50 ? "var(--amber-600)" : "var(--red-600)";
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 9px",
          borderRadius: "var(--radius-pill)",
          background: bg,
          color: fg,
          font: "var(--weight-medium) var(--text-xs)/1 var(--font-sans)",
          ...style,
        }}
        {...(rest as React.HTMLAttributes<HTMLSpanElement>)}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1.2 7.5 4.3 10.9 4.8 8.4 7.2 9 10.6 6 9 3 10.6 3.6 7.2 1.1 4.8 4.5 4.3Z" fill={color} />
        </svg>
        {v}% · {tier}
      </span>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }} {...rest}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ font: "var(--weight-medium) var(--text-xs)/1 var(--font-sans)", color: "var(--text-muted)" }}>
          {label}
        </span>
        {showValue && (
          <span
            style={{
              font: "var(--weight-semibold) var(--text-sm)/1 var(--font-mono)",
              color,
              direction: "ltr",
            }}
          >
            {v}%
          </span>
        )}
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--slate-150)", overflow: "hidden" }}>
        <div
          style={{
            width: `${v}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
            transition: "width var(--dur-slow) var(--ease-out)",
          }}
        />
      </div>
    </div>
  );
}

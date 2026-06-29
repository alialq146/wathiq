"use client";

import React from "react";
import { ConfidenceMeter } from "./ConfidenceMeter";

export type AIInsightState = "analyzing" | "complete";

export interface AIInsightPanelProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  state?: AIInsightState;
  confidence?: number;
  summary?: string;
  reasoning?: string[];
  recommendations?: string[];
}

/**
 * AI insight / reasoning panel — Wathiq's transparent "no black box" surface.
 * Shows what the AI is doing (reasoning steps), how sure it is (confidence),
 * and what it suggests (recommendations). Teal accent marks AI-authored content.
 */
export function AIInsightPanel({
  title = "تحليل وثّق",
  state = "complete",
  confidence,
  summary,
  reasoning = [],
  recommendations = [],
  style,
  ...rest
}: AIInsightPanelProps) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--teal-200)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
        ...style,
      }}
      {...rest}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "var(--teal-50)",
          borderBottom: "1px solid var(--teal-100)",
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "var(--radius-sm)",
            background: "var(--teal-500)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 26px",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5 9.6 5.6 13.7 6.3 10.6 9.3 11.4 13.5 8 11.4 4.6 13.5 5.4 9.3 2.3 6.3 6.4 5.6Z" fill="#fff" />
          </svg>
        </span>
        <span style={{ font: "var(--weight-semibold) var(--text-base)/1 var(--font-sans)", color: "var(--teal-700)" }}>
          {title}
        </span>
        {state === "analyzing" && (
          <span
            style={{
              marginInlineStart: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              font: "var(--weight-medium) var(--text-xs)/1 var(--font-sans)",
              color: "var(--teal-600)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--teal-500)",
                animation: "wq-pulse 1.1s var(--ease-in-out) infinite",
              }}
            />
            يحلّل الآن…
          </span>
        )}
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {confidence != null && <ConfidenceMeter value={confidence} />}

        {summary && (
          <p
            style={{
              margin: 0,
              font: "var(--weight-regular) var(--text-base)/1.65 var(--font-sans)",
              color: "var(--text-body)",
            }}
          >
            {summary}
          </p>
        )}

        {reasoning.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <span
              style={{
                font: "var(--weight-semibold) var(--text-2xs)/1 var(--font-sans)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--text-subtle)",
                marginBottom: 10,
              }}
            >
              خطوات التحليل
            </span>
            {reasoning.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  paddingBottom: i === reasoning.length - 1 ? 0 : 12,
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      flex: "0 0 18px",
                      borderRadius: "50%",
                      background: "var(--teal-50)",
                      border: "1.5px solid var(--teal-400)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      font: "var(--weight-semibold) 10px/1 var(--font-mono)",
                      color: "var(--teal-700)",
                    }}
                  >
                    {i + 1}
                  </span>
                  {i !== reasoning.length - 1 && (
                    <span style={{ width: 1.5, flex: 1, background: "var(--teal-100)", marginTop: 3 }} />
                  )}
                </div>
                <span
                  style={{
                    font: "var(--weight-regular) var(--text-sm)/1.55 var(--font-sans)",
                    color: "var(--text-body)",
                    paddingTop: 1,
                  }}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        )}

        {recommendations.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                font: "var(--weight-semibold) var(--text-2xs)/1 var(--font-sans)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--text-subtle)",
              }}
            >
              توصيات
            </span>
            {recommendations.map((rec, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 9,
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  background: "var(--slate-50)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <span style={{ color: "var(--teal-600)", fontSize: 14, lineHeight: "1.4", flex: "0 0 auto" }}>→</span>
                <span
                  style={{
                    font: "var(--weight-regular) var(--text-sm)/1.55 var(--font-sans)",
                    color: "var(--text-body)",
                  }}
                >
                  {rec}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

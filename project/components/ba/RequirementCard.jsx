import React from "react";
import { StatusBadge } from "./StatusBadge.jsx";
import { PriorityLabel } from "./PriorityLabel.jsx";
import { ConfidenceMeter } from "./ConfidenceMeter.jsx";

/**
 * Requirement summary card — the core object of the Wathiq workspace.
 * Shows the requirement ID (FR-xxx), title, status, priority, AI confidence,
 * and a meta footer (criteria count, open questions, assignees).
 */
export function RequirementCard({
  id,
  title,
  description,
  status = "draft",
  priority = "medium",
  confidence,
  criteria,
  openQuestions,
  selected = false,
  onClick,
  style,
  ...rest
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface-card)",
        border: `1px solid ${selected ? "var(--primary)" : "var(--border-default)"}`,
        boxShadow: selected ? "0 0 0 3px var(--focus-ring)" : "var(--shadow-xs)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 18px",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow var(--dur-base) var(--ease-out), border-color var(--dur-base)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...style,
      }}
      onMouseEnter={(e) => { if (onClick && !selected) { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--border-strong)"; } }}
      onMouseLeave={(e) => { if (onClick && !selected) { e.currentTarget.style.boxShadow = "var(--shadow-xs)"; e.currentTarget.style.borderColor = "var(--border-default)"; } }}
      {...rest}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {id && <span style={{ font: "var(--font-mono-id)", color: "var(--blue-700)", background: "var(--blue-50)", padding: "2px 7px", borderRadius: "var(--radius-xs)", direction: "ltr" }}>{id}</span>}
            <PriorityLabel level={priority} showLabel={false} />
          </div>
          <div style={{ font: "var(--weight-semibold) var(--text-h4)/1.35 var(--font-sans)", color: "var(--text-strong)" }}>{title}</div>
        </div>
        <StatusBadge status={status} />
      </div>

      {description && (
        <p style={{ font: "var(--weight-regular) var(--text-sm)/1.6 var(--font-sans)", color: "var(--text-muted)", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {description}
        </p>
      )}

      {confidence != null && <ConfidenceMeter value={confidence} />}

      <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 4, borderTop: "1px solid var(--border-subtle)", marginTop: 2, font: "var(--weight-regular) var(--text-xs)/1 var(--font-sans)", color: "var(--text-muted)" }}>
        {criteria != null && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "var(--teal-600)" }}>✓</span> {criteria} معايير قبول
          </span>
        )}
        {openQuestions != null && openQuestions > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--amber-600)" }}>
            ● {openQuestions} أسئلة مفتوحة
          </span>
        )}
      </div>
    </div>
  );
}

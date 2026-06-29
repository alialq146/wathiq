import React from "react";
import { Avatar } from "../core/Avatar.jsx";

/** Overlapping avatar stack for stakeholders / assignees, with +N overflow. */
export function StakeholderGroup({ people = [], max = 4, size = 28, label, style, ...rest }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, ...style }} {...rest}>
      <div style={{ display: "inline-flex", flexDirection: "row-reverse", paddingInlineStart: (shown.length - 1) * (size * 0.36) }}>
        {shown.map((p, i) => (
          <span key={i} style={{ marginInlineStart: i === 0 ? 0 : -(size * 0.36), borderRadius: "50%", boxShadow: "0 0 0 2px var(--surface-card)", display: "inline-flex" }}>
            <Avatar name={typeof p === "string" ? p : p.name} src={typeof p === "object" ? p.src : undefined} size={size} />
          </span>
        ))}
        {extra > 0 && (
          <span
            style={{
              marginInlineStart: -(size * 0.36),
              width: size,
              height: size,
              borderRadius: "50%",
              background: "var(--slate-100)",
              color: "var(--text-muted)",
              font: `var(--weight-semibold) ${Math.round(size * 0.38)}px/1 var(--font-mono)`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 2px var(--surface-card)",
              direction: "ltr",
            }}
          >
            +{extra}
          </span>
        )}
      </div>
      {label && <span style={{ font: "var(--weight-regular) var(--text-sm)/1 var(--font-sans)", color: "var(--text-muted)" }}>{label}</span>}
    </div>
  );
}

"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  count?: number;
}

export interface TabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items?: TabItem[];
  value?: string;
  onChange?: (id: string) => void;
}

/** Underline tab strip. Controlled via value/onChange. */
export function Tabs({ items = [], value, onChange, style, ...rest }: TabsProps) {
  const [internal, setInternal] = React.useState<string | undefined>(items[0]?.id);
  const active = value !== undefined ? value : internal;
  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange && onChange(id);
  };
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid var(--border-default)",
        ...style,
      }}
      {...rest}
    >
      {items.map((it) => {
        const on = it.id === active;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={on}
            onClick={() => select(it.id)}
            style={{
              position: "relative",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "10px 12px",
              marginBottom: -1,
              font: `var(--weight-${on ? "semibold" : "medium"}) var(--text-base)/1 var(--font-sans)`,
              color: on ? "var(--text-strong)" : "var(--text-muted)",
              borderBottom: `2px solid ${on ? "var(--primary)" : "transparent"}`,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              transition: "color var(--dur-fast)",
            }}
          >
            {it.label}
            {it.count != null && (
              <span
                style={{
                  font: "var(--weight-medium) var(--text-2xs)/1 var(--font-mono)",
                  color: on ? "var(--primary)" : "var(--text-subtle)",
                  background: on ? "var(--blue-50)" : "var(--slate-100)",
                  borderRadius: "var(--radius-pill)",
                  padding: "2px 6px",
                }}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

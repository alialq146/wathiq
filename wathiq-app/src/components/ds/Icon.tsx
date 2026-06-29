"use client";

import React from "react";
import * as Lucide from "lucide-react";
import type { LucideProps } from "lucide-react";

export interface IconProps {
  /** Lucide icon name in kebab-case, e.g. "layout-dashboard". */
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

const toPascalCase = (name: string): string =>
  name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

/**
 * Thin wrapper over lucide-react that accepts kebab-case names (as the
 * design prototypes use) and centers the glyph in an inline-flex box.
 */
export function Icon({
  name,
  size = 18,
  color,
  strokeWidth = 1.75,
  style,
}: IconProps) {
  const Cmp = (Lucide as unknown as Record<string, React.ComponentType<LucideProps>>)[
    toPascalCase(name)
  ];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
        color,
        ...style,
      }}
    >
      {Cmp ? <Cmp size={size} strokeWidth={strokeWidth} /> : null}
    </span>
  );
}

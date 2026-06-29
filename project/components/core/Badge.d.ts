import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Semantic tone. @default "neutral" */
  tone?: "neutral" | "info" | "success" | "warning" | "danger" | "ai";
  /** @default "soft" */
  variant?: "soft" | "solid";
  /** Show a leading status dot. @default false */
  dot?: boolean;
}

/** Small status/label pill. */
export function Badge(props: BadgeProps): JSX.Element;

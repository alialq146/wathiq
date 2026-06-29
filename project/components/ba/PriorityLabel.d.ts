import * as React from "react";

export interface PriorityLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "medium" */
  level?: "critical" | "high" | "medium" | "low";
  /** @default "ar" */
  lang?: "ar" | "en";
  /** Show text label next to the signal bars. @default true */
  showLabel?: boolean;
}

/** Priority label with signal-bar glyph. */
export function PriorityLabel(props: PriorityLabelProps): JSX.Element;

import * as React from "react";

export type RequirementStatus =
  | "draft" | "analyzing" | "review" | "needs_info" | "approved" | "blocked";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Requirement lifecycle state. @default "draft" */
  status?: RequirementStatus;
  /** Label language when no children given. @default "ar" */
  lang?: "ar" | "en";
}

/**
 * Requirement lifecycle status badge.
 * @startingPoint section="Business Analysis" subtitle="Requirement lifecycle status badges" viewport="700x130"
 */
export function StatusBadge(props: StatusBadgeProps): JSX.Element;

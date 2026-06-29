import * as React from "react";
import type { RequirementStatus } from "./StatusBadge";

export interface RequirementCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Requirement identifier, e.g. "FR-014". */
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** @default "draft" */
  status?: RequirementStatus;
  /** @default "medium" */
  priority?: "critical" | "high" | "medium" | "low";
  /** AI confidence 0–100; renders a ConfidenceMeter when provided. */
  confidence?: number;
  /** Acceptance-criteria count (footer). */
  criteria?: number;
  /** Open-questions count (footer). */
  openQuestions?: number;
  /** Selected (active) state. */
  selected?: boolean;
}

/**
 * Requirement summary card — core object of the workspace.
 * @startingPoint section="Business Analysis" subtitle="Requirement card — ID, status, priority, confidence" viewport="700x260"
 */
export function RequirementCard(props: RequirementCardProps): JSX.Element;

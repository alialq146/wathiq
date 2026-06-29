import * as React from "react";

export interface AIInsightPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Panel title. @default "تحليل وثّق" */
  title?: React.ReactNode;
  /** @default "complete" */
  state?: "analyzing" | "complete";
  /** AI confidence 0–100. */
  confidence?: number;
  /** One-line plain-language summary of the analysis. */
  summary?: React.ReactNode;
  /** Ordered reasoning steps (the "why"). */
  reasoning?: React.ReactNode[];
  /** Actionable recommendations. */
  recommendations?: React.ReactNode[];
}

/**
 * Transparent AI reasoning panel — progress, confidence, steps, recommendations.
 * @startingPoint section="Business Analysis" subtitle="Transparent AI reasoning panel" viewport="700x520"
 */
export function AIInsightPanel(props: AIInsightPanelProps): JSX.Element;

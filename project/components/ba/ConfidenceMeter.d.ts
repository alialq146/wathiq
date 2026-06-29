import * as React from "react";

export interface ConfidenceMeterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Confidence 0–100. */
  value: number;
  /** @default "bar" */
  variant?: "bar" | "pill";
  /** Track label (bar variant). @default "ثقة الذكاء الاصطناعي" */
  label?: React.ReactNode;
  /** Show the % value (bar variant). @default true */
  showValue?: boolean;
}

/**
 * AI confidence indicator — high (teal) / medium (amber) / low (red).
 * @startingPoint section="Business Analysis" subtitle="AI confidence meter — bar & pill" viewport="700x130"
 */
export function ConfidenceMeter(props: ConfidenceMeterProps): JSX.Element;

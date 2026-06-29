import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Inner padding. @default "lg" */
  padding?: "none" | "sm" | "md" | "lg";
  /** Default resting elevation. @default "sm" */
  elevation?: "none" | "sm" | "md" | "lg";
  /** Lift + border emphasis on hover. @default false */
  interactive?: boolean;
}

/**
 * Signature 12px-radius surface container.
 * @startingPoint section="Core" subtitle="Card surface — 12px radius, soft shadow" viewport="700x200"
 */
export function Card(props: CardProps): JSX.Element;

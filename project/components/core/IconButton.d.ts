import * as React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label (also the tooltip title). */
  label: string;
  /** @default "ghost" */
  variant?: "ghost" | "soft" | "outline";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
}

/** Square icon-only button. */
export function IconButton(props: IconButtonProps): JSX.Element;

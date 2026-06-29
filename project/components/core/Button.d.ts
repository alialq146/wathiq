import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default "primary" */
  variant?: "primary" | "secondary" | "ghost" | "brand" | "danger";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Icon element rendered before the label (inline-start). */
  iconStart?: React.ReactNode;
  /** Icon element rendered after the label (inline-end). */
  iconEnd?: React.ReactNode;
  /** Stretch to container width. @default false */
  fullWidth?: boolean;
}

/**
 * Primary action button for Wathiq.
 * @startingPoint section="Core" subtitle="Buttons — primary, secondary, ghost, brand" viewport="700x140"
 */
export function Button(props: ButtonProps): JSX.Element;

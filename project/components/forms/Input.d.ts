import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  /** Helper text below the field. */
  hint?: React.ReactNode;
  /** Error message; overrides hint and turns the field red. */
  error?: React.ReactNode;
  /** Leading icon (inline-start). */
  iconStart?: React.ReactNode;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  containerStyle?: React.CSSProperties;
}

/** Labeled text input with hint/error and optional leading icon. */
export function Input(props: InputProps): JSX.Element;

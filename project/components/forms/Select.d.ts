import * as React from "react";

export interface SelectOption { value: string; label: string; }

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  /** Options as strings or {value,label}. */
  options: Array<string | SelectOption>;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  containerStyle?: React.CSSProperties;
}

/** Styled native select. */
export function Select(props: SelectProps): JSX.Element;

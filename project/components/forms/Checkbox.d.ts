import * as React from "react";

export interface CheckboxProps extends Omit<React.LabelHTMLAttributes<HTMLLabelElement>, "onChange"> {
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

/** Labeled checkbox for checklists and filters. */
export function Checkbox(props: CheckboxProps): JSX.Element;

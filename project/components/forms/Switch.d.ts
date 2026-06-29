import * as React from "react";

export interface SwitchProps extends Omit<React.LabelHTMLAttributes<HTMLLabelElement>, "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (next: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
}

/** Toggle switch for binary settings (e.g. auto-analyze, notifications). */
export function Switch(props: SwitchProps): JSX.Element;

import * as React from "react";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  /** Optional count pill. */
  count?: number;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: TabItem[];
  /** Controlled active id. Omit for uncontrolled. */
  value?: string;
  onChange?: (id: string) => void;
}

/** Underline tab strip with optional count pills. */
export function Tabs(props: TabsProps): JSX.Element;

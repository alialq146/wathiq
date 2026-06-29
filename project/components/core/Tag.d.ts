import * as React from "react";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "slate" */
  color?: "slate" | "blue" | "teal";
  /** When provided, renders a remove (×) affordance. */
  onRemove?: () => void;
}

/** Outlined keyword tag for taxonomy and removable filters. */
export function Tag(props: TagProps): JSX.Element;

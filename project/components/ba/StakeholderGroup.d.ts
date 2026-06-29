import * as React from "react";

export interface Person { name: string; src?: string; }

export interface StakeholderGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Names or {name,src} objects. */
  people: Array<string | Person>;
  /** Max avatars before +N overflow. @default 4 */
  max?: number;
  /** Avatar diameter px. @default 28 */
  size?: number;
  /** Optional trailing text label. */
  label?: React.ReactNode;
}

/** Overlapping stakeholder/assignee avatar stack. */
export function StakeholderGroup(props: StakeholderGroupProps): JSX.Element;

import * as React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name — drives initials and the deterministic tint. */
  name: string;
  /** Optional image URL; falls back to initials. */
  src?: string;
  /** Pixel diameter. @default 32 */
  size?: number;
}

/** Circular avatar with initials fallback. */
export function Avatar(props: AvatarProps): JSX.Element;

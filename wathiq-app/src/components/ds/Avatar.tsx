"use client";

import React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string;
  src?: string;
  size?: number;
}

/** Avatar with initials fallback and deterministic tint. */
export function Avatar({ name = "", src, size = 32, style, ...rest }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  const tints: [string, string][] = [
    ["var(--blue-100)", "var(--blue-700)"],
    ["var(--teal-100)", "var(--teal-700)"],
    ["var(--amber-100)", "var(--amber-600)"],
    ["var(--slate-200)", "var(--slate-700)"],
    ["var(--violet-50)", "var(--violet-500)"],
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % tints.length;
  const [bg, fg] = tints[h];
  return (
    <span
      title={name}
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: src ? "transparent" : bg,
        color: fg,
        font: `var(--weight-semibold) ${Math.round(size * 0.4)}px/1 var(--font-sans)`,
        overflow: "hidden",
        boxShadow: "inset 0 0 0 1px rgba(13,22,41,0.06)",
        ...style,
      }}
      {...rest}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
    </span>
  );
}

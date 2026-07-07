"use client";

/**
 * رابط ترقية مُتتبَّع في صفحة الأسعار — يسجل upgrade_clicked للمستخدم المسجل
 * فقط (الزائر بلا جلسة: الحدث يُتجاهل بصمت في الخادم). التتبع لا يعطل الانتقال.
 */

import React from "react";
import { trackClientEvent } from "@/app/actions";

export function TrackedUpgradeLink({
  href,
  plan,
  style,
  children,
}: {
  href: string;
  plan: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      onClick={() => void trackClientEvent("upgrade_clicked", { from: "pricing", plan })}
    >
      {children}
    </a>
  );
}

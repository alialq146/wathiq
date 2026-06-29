import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "وثّق · Wathiq Workspace",
  description:
    "منصة وثّق لتحليل متطلبات الأعمال — مساحة عمل احترافية لتحليل ومراجعة وتنقيح المتطلبات.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html dir="rtl" lang="ar">
      <body>{children}</body>
    </html>
  );
}

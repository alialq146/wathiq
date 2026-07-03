import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "وثّق · تحليل المتطلبات بالذكاء الاصطناعي",
  description:
    "منصة وثّق العربية لتحليل متطلبات الأعمال بالذكاء الاصطناعي: استخراج المتطلبات، اكتشاف النواقص، تقييم الجودة، وإنتاج وثيقة جاهزة للاعتماد.",
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

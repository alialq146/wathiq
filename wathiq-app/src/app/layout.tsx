import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://wathiq-ai.vercel.app"
  ),
  title: "وثّق · تحليل المتطلبات بالذكاء الاصطناعي",
  description:
    "منصة وثّق العربية لتحليل متطلبات الأعمال بالذكاء الاصطناعي: استخراج المتطلبات، اكتشاف النواقص، تقييم الجودة، وإنتاج وثيقة جاهزة للاعتماد.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Set the theme before first paint to avoid a flash of the wrong theme.
  const themeInit = `(function(){try{var t=localStorage.getItem('wathiq-theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
  return (
    <html dir="rtl" lang="ar" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

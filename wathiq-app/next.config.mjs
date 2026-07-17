/** @type {import('next').NextConfig} */

// v2.5: ترويسات أمان محافِظة تُطبَّق على كل المسارات. لا CSP صارمة هنا حتى لا
// نكسر Next inline scripts؛ اكتفينا بترويسات منخفضة المخاطر ومتوافقة مع RTL/الوضعين.
const securityHeaders = [
  // منع تخمين نوع المحتوى (MIME sniffing).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // منع تأطير الموقع داخل صفحات أخرى (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // عدم تسريب المسار الكامل في Referer لمواقع خارجية.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // تعطيل واجهات حسّاسة لا يستخدمها التطبيق.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // فرض HTTPS على المتصفح لمدة سنة (فعّال فقط عبر HTTPS في الإنتاج).
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig = {
  reactStrictMode: true,
  // Keep Prisma's engine out of the server bundle (loaded at runtime instead).
  serverExternalPackages: ["@prisma/client", "prisma"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

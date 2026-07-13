import { redirect } from "next/navigation";
import Link from "next/link";
import { hasDatabaseEnv } from "@/lib/auth";
import { getFeatureSettings } from "@/lib/settings";
import { SignupForm } from "./SignupForm";

export const metadata = {
  title: "إنشاء حساب · وثّق",
  description: "أنشئ حسابك المجاني في منصة وثّق وابدأ تحليل متطلبات مشروعك خلال دقائق.",
};

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  // Accounts need a database; without one there is nothing to sign up to.
  if (!hasDatabaseEnv()) redirect("/");

  // v2.2: التسجيل العام موقوف من إعدادات النظام → رسالة واضحة
  // (وAPI التسجيل يرفض من الخادم بشكل مستقل).
  const feats = await getFeatureSettings();
  if (!feats.publicRegistrationEnabled) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-app)", padding: 20 }}>
        <div style={{ maxWidth: 440, textAlign: "center", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: "36px 28px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h1 style={{ font: "var(--weight-bold) 18px var(--font-sans)", color: "var(--text-strong)", margin: "0 0 8px" }}>
            التسجيل موقوف مؤقتًا
          </h1>
          <p style={{ font: "14px/1.8 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 20px" }}>
            إنشاء الحسابات الجديدة غير متاح حاليًا. إذا كان لديك حساب يمكنك تسجيل الدخول، أو تواصل معنا للمساعدة.
          </p>
          <Link href="/login" style={{ font: "var(--weight-medium) 14px var(--font-sans)", color: "var(--blue-600)" }}>
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-app)",
        padding: 20,
      }}
    >
      <SignupForm />
    </div>
  );
}

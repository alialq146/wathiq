import { redirect } from "next/navigation";
import { authEnabled, hasDatabaseEnv } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "تسجيل الدخول · وثّق",
  description: "سجّل الدخول إلى حسابك في منصة وثّق لتحليل متطلبات مشاريعك.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; err?: string }>;
}) {
  // If auth isn't enabled, there's nothing to sign in to — go home.
  if (!authEnabled()) redirect("/");

  const { next, err } = await searchParams;
  // أمان (v2.5): يجب أن يكون مسارًا داخليًا نسبيًا فقط — نرفض الروابط
  // بروتوكولية-نسبية («//evil») والـ backslash («/\evil») لمنع Open Redirect.
  const isSafeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  const target = isSafeNext ? next : "/";
  // حساب معطَّل أُعيد من مساحة العمل → نعرض سبب الإعادة بوضوح.
  const initialError =
    err === "disabled" ? "تم إيقاف هذا الحساب مؤقتًا. يرجى التواصل مع فريق وثّق للمساعدة." : undefined;

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
      {/* Signup is only possible in accounts (database) mode. */}
      <LoginForm next={target} showSignup={hasDatabaseEnv()} initialError={initialError} />
    </div>
  );
}

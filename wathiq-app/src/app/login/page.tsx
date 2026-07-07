import { redirect } from "next/navigation";
import { authEnabled, hasDatabaseEnv } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; err?: string }>;
}) {
  // If auth isn't enabled, there's nothing to sign in to — go home.
  if (!authEnabled()) redirect("/");

  const { next, err } = await searchParams;
  const target = next && next.startsWith("/") ? next : "/";
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

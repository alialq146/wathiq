import { redirect } from "next/navigation";
import { authEnabled, hasDatabaseEnv } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // If auth isn't enabled, there's nothing to sign in to — go home.
  if (!authEnabled()) redirect("/");

  const { next } = await searchParams;
  const target = next && next.startsWith("/") ? next : "/";

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
      <LoginForm next={target} showSignup={hasDatabaseEnv()} />
    </div>
  );
}

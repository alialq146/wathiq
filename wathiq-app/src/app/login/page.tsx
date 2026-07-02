import { redirect } from "next/navigation";
import { authConfigured } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // If auth isn't configured, there's nothing to sign in to — go home.
  if (!authConfigured()) redirect("/");

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
      <LoginForm next={target} />
    </div>
  );
}

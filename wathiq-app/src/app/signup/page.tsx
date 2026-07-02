import { redirect } from "next/navigation";
import { hasDatabaseEnv } from "@/lib/auth";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  // Accounts need a database; without one there is nothing to sign up to.
  if (!hasDatabaseEnv()) redirect("/");

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

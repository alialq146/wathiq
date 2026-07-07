import { redirect } from "next/navigation";
import { authEnabled } from "@/lib/auth";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "استعادة كلمة المرور · وثّق",
  description: "استعادة كلمة المرور لحسابك في منصة وثّق.",
};

export default function ForgotPasswordPage() {
  if (!authEnabled()) redirect("/");
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
      <ForgotPasswordForm />
    </div>
  );
}

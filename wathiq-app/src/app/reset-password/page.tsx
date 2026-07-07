import { redirect } from "next/navigation";
import { authEnabled } from "@/lib/auth";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "تعيين كلمة مرور جديدة · وثّق",
  description: "تعيين كلمة مرور جديدة لحسابك في منصة وثّق.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  if (!authEnabled()) redirect("/");
  const { token } = await searchParams;
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
      <ResetPasswordForm token={token ?? ""} />
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { hasDatabase } from "@/lib/db";
import { authEnabled } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { requireSuperAdmin } from "@/lib/admin";
import { getAdminOverview } from "@/lib/admin-data";
import { AdminClient } from "@/components/admin/AdminClient";

// Never cached, never prerendered — admin data is always fresh and the role
// check runs on every request, server-side.
export const dynamic = "force-dynamic";

export const metadata = { title: "لوحة الأدمن · وثّق", robots: { index: false, follow: false } };

export default async function AdminPage() {
  // Admin exists only in accounts mode (database-backed users with roles).
  if (!authEnabled() || !hasDatabase()) {
    return <Notice title="لوحة الأدمن غير متاحة" body="تتطلب لوحة الأدمن تفعيل نظام الحسابات وقاعدة البيانات." />;
  }

  const session = await getSessionUser();
  if (!session) redirect("/login?next=/admin");

  const admin = await requireSuperAdmin();
  if (!admin) {
    return (
      <Notice
        title="ليس لديك صلاحية للوصول إلى لوحة الأدمن"
        body="هذه الصفحة مخصصة لمالك المنصة فقط. إذا كنت تعتقد أن هذا خطأ، تواصل مع الدعم."
      />
    );
  }

  const data = await getAdminOverview();
  return <AdminClient initial={data} adminName={admin.name} adminEmail={admin.email} />;
}

function Notice({ title, body }: { title: string; body: string }) {
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
      <div
        style={{
          maxWidth: 440,
          textAlign: "center",
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          padding: "36px 28px",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <h1 style={{ font: "var(--weight-bold) 18px var(--font-sans)", color: "var(--text-strong)", margin: "0 0 8px" }}>
          {title}
        </h1>
        <p style={{ font: "14px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 20px" }}>{body}</p>
        <Link href="/" style={{ font: "var(--weight-medium) 14px var(--font-sans)", color: "var(--blue-600)" }}>
          ← العودة إلى المنصة
        </Link>
      </div>
    </div>
  );
}

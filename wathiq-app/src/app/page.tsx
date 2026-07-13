import { redirect } from "next/navigation";
import Link from "next/link";
import { WorkspaceClient } from "@/components/workspace/WorkspaceClient";
import { LandingPage } from "@/components/landing/LandingPage";
import { getWorkspaceData } from "@/lib/workspace-data";
import { getSessionUser, getActiveProjectId } from "@/lib/session";
import { authEnabled } from "@/lib/auth";
import { isAccountActive } from "@/lib/account";
import { requireSuperAdmin } from "@/lib/admin";
import { getSystemSettings } from "@/lib/settings";

// Read fresh from the database on each request (falls back to mock data when
// no database is configured), so seeded changes show up without a rebuild.
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();
  const settings = await getSystemSettings();

  // Accounts mode + not signed in → show the public marketing landing page.
  if (authEnabled() && !user) {
    return <LandingPage publicSettings={{
      supportEmail: settings.contact.showEmail ? settings.contact.supportEmail : "",
      phone: settings.contact.phone,
      footerText: settings.general.footerText,
    }} />;
  }

  const scopeId = user && user.uid !== "owner" ? user.uid : undefined;

  // أمان: حساب معطَّل أو محذوف لا يفتح مساحة العمل — يُعاد لتسجيل الدخول
  // برسالة مفهومة (نفس الفحص المركزي المستخدم في كل Server Action).
  if (scopeId && !(await isAccountActive(scopeId))) {
    redirect("/login?err=disabled");
  }

  // وضع الصيانة (v2.2): يمنع مساحة العمل لغير SUPER_ADMIN — تسجيل الدخول
  // يبقى متاحًا، والفحص خادمي بالكامل (لا اعتماد على إخفاء الواجهة).
  if (settings.features.maintenanceMode && scopeId) {
    const admin = await requireSuperAdmin();
    if (!admin) return <MaintenanceNotice message={settings.features.maintenanceMessage} />;
  }

  const activeProjectId = scopeId ? await getActiveProjectId() : null;
  const data = await getWorkspaceData(scopeId, activeProjectId);

  return (
    <WorkspaceClient
      data={{
        requirements: data.requirements,
        acceptanceCriteria: data.acceptanceCriteria,
        businessRules: data.businessRules,
        openQuestions: data.openQuestions,
        auditEvents: data.auditEvents,
        projects: data.projects,
        activeProject: data.activeProject,
        modules: data.modules,
        usage: data.usage,
        source: data.source,
        authEnabled: authEnabled(),
        user: user ? { name: user.name, email: user.email } : null,
        publicSettings: {
          whatsappNumber: settings.contact.whatsappNumber,
          upgradeMessageText: settings.contact.upgradeMessageText,
          activationTimeText: settings.contact.activationTimeText,
          upgradeCtaText: settings.contact.upgradeCtaText,
        },
        docSettings: settings.documents,
        featureFlags: {
          feedbackEnabled: settings.features.feedbackEnabled,
          assistantEnabled: settings.features.assistantEnabled,
          documentExportEnabled: settings.features.documentExportEnabled,
        },
      }}
    />
  );
}

function MaintenanceNotice({ message }: { message: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-app)", padding: 20 }}>
      <div style={{ maxWidth: 460, textAlign: "center", background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: "38px 30px" }}>
        <div style={{ fontSize: 42, marginBottom: 14 }}>🛠️</div>
        <h1 style={{ font: "var(--weight-bold) 19px/1.4 var(--font-sans)", color: "var(--text-strong)", margin: "0 0 10px" }}>
          المنصة تحت الصيانة
        </h1>
        <p style={{ font: "14px/1.8 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 20px" }}>{message}</p>
        <Link href="/login" style={{ font: "var(--weight-medium) 13.5px var(--font-sans)", color: "var(--blue-600)" }}>
          العودة إلى تسجيل الدخول
        </Link>
      </div>
    </div>
  );
}

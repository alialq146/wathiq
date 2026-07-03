import { WorkspaceClient } from "@/components/workspace/WorkspaceClient";
import { LandingPage } from "@/components/landing/LandingPage";
import { getWorkspaceData } from "@/lib/workspace-data";
import { getSessionUser, getActiveProjectId } from "@/lib/session";
import { authEnabled } from "@/lib/auth";

// Read fresh from the database on each request (falls back to mock data when
// no database is configured), so seeded changes show up without a rebuild.
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();

  // Accounts mode + not signed in → show the public marketing landing page.
  if (authEnabled() && !user) {
    return <LandingPage />;
  }

  const scopeId = user && user.uid !== "owner" ? user.uid : undefined;
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
        usage: data.usage,
        source: data.source,
        authEnabled: authEnabled(),
        user: user ? { name: user.name, email: user.email } : null,
      }}
    />
  );
}

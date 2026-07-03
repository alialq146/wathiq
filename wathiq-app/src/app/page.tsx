import { WorkspaceClient } from "@/components/workspace/WorkspaceClient";
import { LandingPage } from "@/components/landing/LandingPage";
import { getWorkspaceData } from "@/lib/workspace-data";
import { getSessionUser } from "@/lib/session";
import { authEnabled } from "@/lib/auth";

// Read fresh from the database on each request (falls back to mock data when
// no database is configured), so seeded changes show up without a rebuild.
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();

  // Accounts mode + not signed in → show the public marketing landing page.
  // (Open mode with no auth, or a signed-in user, gets the workspace.)
  if (authEnabled() && !user) {
    return <LandingPage />;
  }

  // Real accounts are scoped to their own data; legacy "owner" mode sees all.
  const scopeId = user && user.uid !== "owner" ? user.uid : undefined;
  const {
    requirements,
    acceptanceCriteria,
    businessRules,
    openQuestions,
    auditEvents,
    source,
  } = await getWorkspaceData(scopeId);

  return (
    <WorkspaceClient
      data={{
        requirements,
        acceptanceCriteria,
        businessRules,
        openQuestions,
        auditEvents,
        source,
        authEnabled: authEnabled(),
        user: user ? { name: user.name, email: user.email } : null,
      }}
    />
  );
}

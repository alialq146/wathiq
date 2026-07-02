import { WorkspaceClient } from "@/components/workspace/WorkspaceClient";
import { getWorkspaceData } from "@/lib/workspace-data";
import { getSessionUser } from "@/lib/session";
import { authEnabled } from "@/lib/auth";

// Read fresh from the database on each request (falls back to mock data when
// no database is configured), so seeded changes show up without a rebuild.
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();
  const {
    requirements,
    acceptanceCriteria,
    businessRules,
    openQuestions,
    auditEvents,
    source,
  } = await getWorkspaceData(user?.uid);

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

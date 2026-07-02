import { WorkspaceClient } from "@/components/workspace/WorkspaceClient";
import { getWorkspaceData } from "@/lib/workspace-data";
import { authConfigured } from "@/lib/auth";

// Read fresh from the database on each request (falls back to mock data when
// no database is configured), so seeded changes show up without a rebuild.
export const dynamic = "force-dynamic";

export default async function Page() {
  const {
    requirements,
    acceptanceCriteria,
    businessRules,
    openQuestions,
    auditEvents,
    source,
  } = await getWorkspaceData();

  return (
    <WorkspaceClient
      data={{
        requirements,
        acceptanceCriteria,
        businessRules,
        openQuestions,
        auditEvents,
        source,
        authEnabled: authConfigured(),
      }}
    />
  );
}

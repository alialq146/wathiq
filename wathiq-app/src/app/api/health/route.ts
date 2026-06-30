import { NextResponse } from "next/server";
import { getWorkspaceData } from "@/lib/workspace-data";

// Lightweight verification endpoint: tells you whether the app is reading from
// the database ("source": "database") or the built-in fallback ("fallback"),
// plus how many rows it loaded. Open /api/health on any deployment to check.
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getWorkspaceData();
  return NextResponse.json({
    ok: true,
    source: data.source,
    counts: {
      requirements: data.requirements.length,
      acceptanceCriteria: data.acceptanceCriteria.length,
      businessRules: data.businessRules.length,
      openQuestions: data.openQuestions.length,
    },
  });
}

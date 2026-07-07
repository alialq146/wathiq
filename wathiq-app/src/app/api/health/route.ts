import { NextResponse } from "next/server";
import { getWorkspaceData } from "@/lib/workspace-data";
import { authEnabled } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";

// Lightweight verification endpoint: tells you whether the app is reading from
// the database ("source": "database") or the built-in fallback ("fallback").
// Open /api/health on any deployment to check.
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getWorkspaceData();
  // أمان: في وضع الحسابات لا نعرض أعدادًا إجمالية عبر كل المستأجرين لزائر
  // غير مسجَّل — تكفي حالة المصدر للمراقبة، والأعداد للمسجّلين فقط (نطاقهم).
  const showCounts = !authEnabled() || Boolean(await getSessionUser());
  return NextResponse.json({
    ok: true,
    source: data.source,
    ...(showCounts
      ? {
          counts: {
            requirements: data.requirements.length,
            acceptanceCriteria: data.acceptanceCriteria.length,
            businessRules: data.businessRules.length,
            openQuestions: data.openQuestions.length,
          },
        }
      : {}),
  });
}

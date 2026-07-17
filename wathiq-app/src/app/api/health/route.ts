import { NextResponse } from "next/server";
import { prisma, hasDatabase } from "@/lib/db";
import { getWorkspaceData } from "@/lib/workspace-data";
import { authEnabled } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { APP_VERSION } from "@/lib/version";

// نقطة فحص خفيفة للتشغيل: تُخبرك هل التطبيق يقرأ من قاعدة البيانات
// ("source": "database") أم من البيانات الاحتياطية المدمجة ("fallback").
// v2.5: صارت مسبارًا حقيقيًا — فحص اتصال DB صريح (SELECT 1) + الإصدار + طابع
// زمني، بحيث تصلح للمراقبة الخارجية (uptime). الأعداد تبقى محجوبة عن غير
// المسجَّلين، والحقول الأساسية (ok/db/version) آمنة للعرض العام دائمًا.
export const dynamic = "force-dynamic";

export async function GET() {
  // مسبار جاهزية DB مستقل عن منطق الـ fallback — أدق إشارة على صحة الاتصال.
  let db: "up" | "down" | "absent" = "absent";
  if (hasDatabase()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = "up";
    } catch {
      db = "down";
    }
  }

  // أمان: الأعداد تُحسب على نطاق المستخدم المسجَّل فقط — نمرّر uid إلى مُحمّل
  // بيانات مساحة العمل (كان بلا نطاق فيُرجع إجماليات كل المستأجرين).
  const session = authEnabled() ? await getSessionUser() : null;
  const scopeId = session && session.uid !== "owner" ? session.uid : undefined;
  const data = await getWorkspaceData(scopeId);
  const showCounts = !authEnabled() || Boolean(session);

  return NextResponse.json({
    ok: db !== "down",
    db,
    source: data.source,
    version: APP_VERSION,
    time: new Date().toISOString(),
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

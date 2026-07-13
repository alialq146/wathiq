import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, ADMIN_FORBIDDEN } from "@/lib/admin";
import { trackEvent } from "@/lib/track";
import {
  getSystemSettings, updateSystemSettings, HARD_CEILINGS,
  SETTINGS_SECTIONS, type SettingsSection,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * إعدادات النظام المركزية (v2.2) — SUPER_ADMIN فقط.
 * GET: كل الأقسام مدموجة فوق defaults + آخر تحديث + السقوف الصلبة (للعرض).
 * PUT: { section, values, reason?, resetToDefault? } — التحقق كله في
 * Settings Service (الخادم مرجع الحقيقة)، وكل تحديث يسجل SettingsAuditLog.
 * لا أسرار هنا: لا مفاتيح ولا Environment Variables تُقرأ أو تُعرض.
 */
export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  const [settings, row] = await Promise.all([
    getSystemSettings(),
    prisma.systemSettings.findUnique({
      where: { id: "singleton" },
      select: { updatedAt: true, updatedByAdminId: true },
    }).catch(() => null),
  ]);

  let updatedByName: string | null = null;
  if (row?.updatedByAdminId) {
    const u = await prisma.user.findUnique({ where: { id: row.updatedByAdminId }, select: { name: true } });
    updatedByName = u?.name ?? null;
  }

  await trackEvent({ eventName: "system_settings_viewed", userId: admin.id });
  return NextResponse.json({
    ok: true,
    settings,
    meta: {
      updatedAt: row?.updatedAt?.toISOString() ?? null,
      updatedByName,
      ceilings: HARD_CEILINGS,
    },
  });
}

export async function PUT(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  let body: { section?: unknown; values?: unknown; reason?: unknown; resetToDefault?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const section = typeof body.section === "string" ? (body.section as SettingsSection) : ("" as SettingsSection);
  if (!SETTINGS_SECTIONS.includes(section)) {
    return NextResponse.json({ ok: false, error: "bad-section" }, { status: 400 });
  }

  const result = await updateSystemSettings({
    section,
    values: body.values,
    adminId: admin.id,
    reason: typeof body.reason === "string" ? body.reason : null,
    resetToDefault: body.resetToDefault === true,
  });
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  await trackEvent({ eventName: "system_settings_updated", userId: admin.id, metadata: { section } });
  return NextResponse.json({ ok: true, settings: result.settings });
}

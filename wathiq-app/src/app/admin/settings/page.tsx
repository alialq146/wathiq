import { redirect } from "next/navigation";
import { prisma, hasDatabase } from "@/lib/db";
import { authEnabled } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { requireSuperAdmin } from "@/lib/admin";
import { getSystemSettings, HARD_CEILINGS } from "@/lib/settings";
import { SystemSettingsClient } from "./SystemSettingsClient";

// إعدادات النظام — SUPER_ADMIN فقط، دائمًا طازجة، بلا فهرسة.
export const dynamic = "force-dynamic";
export const metadata = { title: "إعدادات النظام · وثّق", robots: { index: false, follow: false } };

export default async function SystemSettingsPage() {
  if (!authEnabled() || !hasDatabase()) redirect("/admin");

  const session = await getSessionUser();
  if (!session) redirect("/login?next=/admin/settings");

  const admin = await requireSuperAdmin();
  if (!admin) redirect("/admin");

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

  return (
    <SystemSettingsClient
      initial={settings}
      meta={{ updatedAt: row?.updatedAt?.toISOString() ?? null, updatedByName, ceilings: HARD_CEILINGS }}
    />
  );
}

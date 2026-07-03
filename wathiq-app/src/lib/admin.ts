/**
 * Admin authorization — server-only. The role is read fresh from the
 * database on every request (never from the session cookie), so revoking
 * an admin takes effect immediately and clients can't forge it.
 *
 * Nobody becomes SUPER_ADMIN automatically. Assign it manually:
 *   node scripts/make-admin.mjs admin@example.com
 * (or UPDATE "User" SET role='SUPER_ADMIN' WHERE email='...').
 */

import { prisma, hasDatabase } from "./db";
import { getSessionUser } from "./session";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Resolve the current session to a SUPER_ADMIN user, or null.
 * Null means: no session, owner-mode session, no database, or a
 * non-admin role — callers must refuse in all of those cases.
 */
export async function requireSuperAdmin(): Promise<AdminUser | null> {
  if (!hasDatabase()) return null;
  const session = await getSessionUser();
  if (!session || session.uid === "owner") return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.uid },
      select: { id: true, name: true, email: true, role: true, accountStatus: true },
    });
    if (!user || user.role !== "SUPER_ADMIN" || user.accountStatus === "DISABLED") return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  } catch {
    return null;
  }
}

/** JSON body used by every admin API route when authorization fails. */
export const ADMIN_FORBIDDEN = {
  ok: false as const,
  error: "forbidden" as const,
  message: "ليس لديك صلاحية للوصول إلى لوحة الأدمن.",
};

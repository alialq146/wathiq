import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, ADMIN_FORBIDDEN } from "@/lib/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

/**
 * سجل تغييرات الإعدادات (v2.2) — SUPER_ADMIN فقط.
 * ?section=GENERAL&page=1 — الـ diff مقصوص أصلًا عند الكتابة (لا أسرار).
 */
export async function GET(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  const url = new URL(req.url);
  const section = (url.searchParams.get("section") ?? "").trim().toUpperCase();
  const page = Math.max(1, Math.trunc(Number(url.searchParams.get("page") ?? "1")) || 1);
  const where = section ? { section } : {};

  const [rows, total] = await Promise.all([
    prisma.settingsAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.settingsAuditLog.count({ where }),
  ]);

  const adminIds = [...new Set(rows.map((r) => r.adminId))];
  const admins = adminIds.length
    ? await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true, email: true } })
    : [];
  const nameOf = new Map(admins.map((a) => [a.id, a.name || a.email]));

  return NextResponse.json({
    ok: true,
    total,
    page,
    pageSize: PAGE_SIZE,
    entries: rows.map((r) => ({
      id: r.id,
      section: r.section,
      action: r.action,
      adminName: nameOf.get(r.adminId) ?? "—",
      changedKeys: r.changedKeys ?? [],
      diff: r.diff ?? {},
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, ADMIN_FORBIDDEN } from "@/lib/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const STATUSES = ["open", "in_review", "closed"] as const;

/** GET /api/admin/feedback?status=&type=&severity=&plan=&page= — ملاحظات المستخدمين للمشرف فقط. */
export async function GET(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const status = url.searchParams.get("status") ?? "";
  const type = url.searchParams.get("type") ?? "";
  const severity = url.searchParams.get("severity") ?? "";
  const plan = url.searchParams.get("plan") ?? "";

  const where = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(severity ? { severity } : {}),
    ...(plan ? { plan } : {}),
  };

  const [total, openCount, rows] = await Promise.all([
    prisma.userFeedback.count({ where }),
    prisma.userFeedback.count({ where: { status: "open" } }),
    prisma.userFeedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  // اسم/بريد المرسل — قراءة فقط للمشرف؛ لا نعرض شيئًا أبعد من ذلك.
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    ok: true,
    total,
    openCount,
    page,
    pageSize: PAGE_SIZE,
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      message: r.message,
      currentPath: r.currentPath,
      plan: r.plan,
      status: r.status,
      adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
      userName: userMap.get(r.userId)?.name ?? "مستخدم",
      userEmail: userMap.get(r.userId)?.email ?? "",
    })),
  });
}

/** PATCH /api/admin/feedback — { id, status?, adminNote? } تغيير الحالة أو ملاحظة داخلية. */
export async function PATCH(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ ok: false, error: "missing-id" }, { status: 400 });

    const data: { status?: string; adminNote?: string | null } = {};
    if (typeof body.status === "string" && (STATUSES as readonly string[]).includes(body.status)) {
      data.status = body.status;
    }
    if (typeof body.adminNote === "string") {
      data.adminNote = body.adminNote.trim().slice(0, 1000) || null;
    }
    if (!Object.keys(data).length) return NextResponse.json({ ok: false, error: "no-changes" }, { status: 400 });

    await prisma.userFeedback.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}

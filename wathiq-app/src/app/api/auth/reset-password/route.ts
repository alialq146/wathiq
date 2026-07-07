import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma, hasDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasDatabase()) return NextResponse.json({ ok: false, error: "invalid-token" });

  let body: { token?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" });
  }
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  // نفس قاعدة قوة كلمة المرور المستخدمة في التسجيل.
  if (password.length < 8) return NextResponse.json({ ok: false, error: "weak-password" });
  if (!token || token.length > 200) return NextResponse.json({ ok: false, error: "invalid-token" });

  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    // صالح فقط إذا: موجود، لم يُستخدم، ولم تنتهِ صلاحيته (٦٠ دقيقة).
    if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ ok: false, error: "invalid-token" });
    }
    const user = await prisma.user.findUnique({ where: { id: row.userId }, select: { id: true, accountStatus: true } });
    if (!user || user.accountStatus === "DISABLED") {
      return NextResponse.json({ ok: false, error: "invalid-token" });
    }

    // تحديث كلمة المرور (نفس تخزين التسجيل) ووسم الرمز مستخدمًا — معًا.
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(password) } }),
      prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err instanceof Error ? err.message : "error");
    return NextResponse.json({ ok: false, error: "server" });
  }
}

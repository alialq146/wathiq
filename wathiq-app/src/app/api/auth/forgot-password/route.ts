import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { prisma, hasDatabase } from "@/lib/db";
import { sendPasswordResetEmail, appUrl } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = 60 * 60 * 1000; // ٦٠ دقيقة
const COOLDOWN_MS = 5 * 60 * 1000; // حماية من تكرار الطلبات لنفس البريد

// أمان: الرد واحد دائمًا مهما كانت الحالة (بريد غير مسجل، تكرار طلبات،
// مزود بريد غير مهيأ) — لا نكشف وجود البريد ولا سبب عدم الإرسال.
const GENERIC = { ok: true } as const;

export async function POST(req: Request) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(GENERIC);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || !hasDatabase()) return NextResponse.json(GENERIC);

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, accountStatus: true } });
    // بريد غير مسجل أو حساب معطَّل: نفس الرد العام بلا أي إنشاء.
    if (!user || user.accountStatus === "DISABLED") return NextResponse.json(GENERIC);

    // Cooldown: طلب حديث غير مستخدم خلال ٥ دقائق → لا رمز جديد ولا بريد.
    const recent = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null, createdAt: { gt: new Date(Date.now() - COOLDOWN_MS) } },
      select: { id: true },
    });
    if (recent) return NextResponse.json(GENERIC);

    // الرمز الخام يُرسل بالبريد فقط؛ القاعدة تحفظ بصمته (SHA-256) حصرًا.
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });

    // عند غياب مزود البريد: mailer يسجل email_provider_not_configured داخليًا
    // ولا يُرسل شيء — والمستخدم يرى نفس الرسالة العامة.
    await sendPasswordResetEmail(email, `${appUrl()}/reset-password?token=${rawToken}`);
  } catch (err) {
    // لا نكشف فشلًا داخليًا للمستخدم؛ يكفي سجل الخادم (بدون الرمز الخام).
    console.error("[forgot-password]", err instanceof Error ? err.message : "error");
  }
  return NextResponse.json(GENERIC);
}

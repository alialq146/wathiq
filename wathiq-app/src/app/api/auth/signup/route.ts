import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/track";
import { prisma, hasDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  // Accounts live in the database; without one, signup is impossible.
  if (!hasDatabase()) {
    return NextResponse.json({ ok: false, error: "no-db" });
  }

  let body: { name?: unknown; email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 2) return NextResponse.json({ ok: false, error: "bad-name" });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "bad-email" });
  if (password.length < 8) return NextResponse.json({ ok: false, error: "weak-password" });

  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ ok: false, error: "email-taken" });

    const user = await prisma.user.create({
      data: { name, email, passwordHash: hashPassword(password) },
    });

    await trackEvent({ eventName: "signup_completed", userId: user.id, plan: user.plan });

    const token = await createSessionToken(
      { uid: user.id, name: user.name, email: user.email },
      Math.floor(Date.now() / 1000)
    );
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("[/api/auth/signup]", err);
    return NextResponse.json({ ok: false, error: "server" });
  }
}

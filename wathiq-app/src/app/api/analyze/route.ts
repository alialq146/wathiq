import { NextResponse } from "next/server";
import { analyzeDocument, analyzePdf, hasAnthropicKey } from "@/lib/ai";
import { hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { authEnabled } from "@/lib/auth";
import { resolveQuota, consumeQuota, logAiUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";
// مهلة أطول لاستدعاءات الذكاء الاصطناعي — Fluid Compute يدعم حتى 300 ثانية.
export const maxDuration = 300;

// Base64 cap (~4.4MB of base64 ≈ a ~3.3MB PDF) — stays under Vercel's request limit.
const MAX_PDF_BASE64 = 4_400_000;
const DEFAULT_MODEL = "claude-opus-4-8";

export async function POST(req: Request) {
  if (!hasAnthropicKey()) {
    return NextResponse.json({ ok: false, error: "no-key" });
  }

  // فحوصات مسبقة في الخادم قبل أي استدعاء لـ Claude: الجلسة، حد الخطة،
  // واختيار النموذج — تُسجَّل المحاولات المحجوبة في AiUsage ولا تُحتسب من الرصيد.
  let userId: string | null = null; // set only when the call is metered
  let model = DEFAULT_MODEL;
  if (authEnabled()) {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" });
    }
    if (user.uid !== "owner" && hasDatabase()) {
      const quota = await resolveQuota(user.uid);
      if (quota) {
        model = quota.model;
        if (quota.exceeded) {
          await logAiUsage({ userId: user.uid, modelUsed: model, status: "BLOCKED_LIMIT" });
          return NextResponse.json({ ok: false, error: "limit", limit: quota.limit });
        }
        userId = user.uid;
      }
    }
  }

  let body: { text?: unknown; pdf?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" });
  }

  const isPdf = typeof body?.pdf === "string" && (body.pdf as string).length > 0;
  if (isPdf && (body.pdf as string).length > MAX_PDF_BASE64) {
    if (userId) await logAiUsage({ userId, modelUsed: model, status: "BLOCKED_SIZE" });
    return NextResponse.json({ ok: false, error: "too-large" });
  }
  if (!isPdf) {
    const text = typeof body?.text === "string" ? body.text : "";
    if (text.trim().length < 20) {
      return NextResponse.json({ ok: false, error: "too-short" });
    }
  }

  try {
    const { result, meta } = isPdf
      ? await analyzePdf(body.pdf as string, model)
      : await analyzeDocument(body.text as string, model);

    if (userId) {
      await consumeQuota(userId);
      await logAiUsage({
        userId,
        modelUsed: meta.model,
        inputTokens: meta.inputTokens,
        outputTokens: meta.outputTokens,
        status: "SUCCESS",
      });
    }
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[/api/analyze]", err);
    if (userId) {
      await logAiUsage({ userId, modelUsed: model, status: "FAILED", errorMessage: String(err).slice(0, 300) });
    }
    return NextResponse.json({ ok: false, error: "failed" });
  }
}

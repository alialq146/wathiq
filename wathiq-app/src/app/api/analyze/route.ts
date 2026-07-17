import { NextResponse } from "next/server";
import { analyzeDocument, analyzePdf, hasAnthropicKey } from "@/lib/ai";
import { hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { authEnabled } from "@/lib/auth";
import { reserveQuota, releaseQuota, logAiUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";
// مهلة أطول لاستدعاءات الذكاء الاصطناعي — Fluid Compute يدعم حتى 300 ثانية.
export const maxDuration = 300;

// Base64 cap (~4.4MB of base64 ≈ a ~3.3MB PDF) — stays under Vercel's request limit.
const MAX_PDF_BASE64 = 4_400_000;
// v2.5: سقف أعلى للنص المُلصق — يمنع طلبات ضخمة تُنهك النموذج/الذاكرة (≈ 200 ألف حرف).
const MAX_TEXT_LEN = 200_000;
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
      // حجز ذري قبل أي استدعاء للنموذج — طلبات متوازية لا تتجاوز الحد.
      const r = await reserveQuota(user.uid);
      if (!r.ok && r.reason === "unauthorized") {
        // جلسة لمستخدم غير موجود أو معطَّل تُرفض — لا تحليل بلا قياس.
        return NextResponse.json({ ok: false, error: "unauthorized" });
      }
      model = r.model;
      if (!r.ok) {
        await logAiUsage({ userId: user.uid, modelUsed: model, status: "BLOCKED_LIMIT" });
        return NextResponse.json({ ok: false, error: "limit", limit: r.limit });
      }
      userId = user.uid;
    }
  }
  // من هنا فصاعدًا: أي خروج قبل نجاح النموذج يعيد الحجز (الفشل لا يُحاسَب).
  const bail = async (payload: Record<string, unknown>) => {
    if (userId) await releaseQuota(userId);
    return NextResponse.json(payload);
  };

  let body: { text?: unknown; pdf?: unknown };
  try {
    body = await req.json();
  } catch {
    return bail({ ok: false, error: "bad-request" });
  }

  const isPdf = typeof body?.pdf === "string" && (body.pdf as string).length > 0;
  if (isPdf && (body.pdf as string).length > MAX_PDF_BASE64) {
    if (userId) await logAiUsage({ userId, modelUsed: model, status: "BLOCKED_SIZE" });
    return bail({ ok: false, error: "too-large" });
  }
  if (!isPdf) {
    const text = typeof body?.text === "string" ? body.text : "";
    if (text.trim().length < 20) {
      return bail({ ok: false, error: "too-short" });
    }
    if (text.length > MAX_TEXT_LEN) {
      return bail({ ok: false, error: "too-large" });
    }
  }

  try {
    const { result, meta } = isPdf
      ? await analyzePdf(body.pdf as string, model)
      : await analyzeDocument(body.text as string, model);

    // الحصة محجوزة مسبقًا (حجز ذري) — يكفي تسجيل النجاح.
    if (userId) {
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
      await releaseQuota(userId); // الفشل لا يستهلك الحصة
      await logAiUsage({ userId, modelUsed: model, status: "FAILED", errorMessage: String(err).slice(0, 300) });
    }
    return NextResponse.json({ ok: false, error: "failed" });
  }
}

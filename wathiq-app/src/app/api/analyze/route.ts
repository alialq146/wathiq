import { NextResponse } from "next/server";
import { analyzeDocument, analyzePdf, hasAnthropicKey } from "@/lib/ai";
import { hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { authEnabled } from "@/lib/auth";
import { runAiOperation } from "@/lib/ai-operation";
import type { AiLevelKey, AiPersonaKey } from "@/lib/settings";

export const dynamic = "force-dynamic";
// مهلة أطول لاستدعاءات الذكاء الاصطناعي — Fluid Compute يدعم حتى 300 ثانية.
export const maxDuration = 300;

// Base64 cap (~4.4MB of base64 ≈ a ~3.3MB PDF) — stays under Vercel's request limit.
const MAX_PDF_BASE64 = 4_400_000;
// v2.5: سقف أعلى للنص المُلصق — يمنع طلبات ضخمة تُنهك النموذج/الذاكرة.
const MAX_TEXT_LEN = 200_000;

const LEVELS: AiLevelKey[] = ["quick", "standard", "expert"];
const PERSONAS: AiPersonaKey[] = ["default", "ba", "consultant", "qa", "po", "tech"];

export async function POST(req: Request) {
  if (!hasAnthropicKey()) return NextResponse.json({ ok: false, error: "no-key" });

  // من هو الفاعل وهل يُحاسَب؟ (المالك/الوضع المفتوح لا يُحاسَبان.)
  let uid = "owner";
  let metered = false;
  if (authEnabled()) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" });
    uid = user.uid;
    metered = user.uid !== "owner" && hasDatabase();
  }

  let body: { text?: unknown; pdf?: unknown; idempotencyKey?: unknown; level?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" });
  }

  // مفتاح Idempotency من العميل — إلزامي للمحاسبة (يمنع الخصم المزدوج).
  const idem = typeof body.idempotencyKey === "string" && body.idempotencyKey.trim() ? body.idempotencyKey.trim().slice(0, 80) : "";
  if (metered && !idem) return NextResponse.json({ ok: false, error: "missing-idempotency-key" });
  const level: AiLevelKey = LEVELS.includes(body.level as AiLevelKey) ? (body.level as AiLevelKey) : "standard";

  // تحقق المدخلات قبل أي حجز أو استدعاء (لا خصم على مدخل غير صالح).
  const isPdf = typeof body?.pdf === "string" && (body.pdf as string).length > 0;
  if (isPdf && (body.pdf as string).length > MAX_PDF_BASE64) return NextResponse.json({ ok: false, error: "too-large" });
  if (!isPdf) {
    const text = typeof body?.text === "string" ? body.text : "";
    if (text.trim().length < 20) return NextResponse.json({ ok: false, error: "too-short" });
    if (text.length > MAX_TEXT_LEN) return NextResponse.json({ ok: false, error: "too-large" });
  }

  const outcome = await runAiOperation({
    uid,
    metered,
    taskKey: "extract",
    level,
    persona: "default" as AiPersonaKey,
    idempotencyKey: idem || `open-${Date.now()}`,
    execute: async (ctx) => {
      const { result, meta } = isPdf
        ? await analyzePdf(body.pdf as string, ctx.model, ctx.maxOutputTokens)
        : await analyzeDocument(body.text as string, ctx.model, ctx.maxOutputTokens);
      return { result, promptTokens: meta.inputTokens, completionTokens: meta.outputTokens, model: meta.model };
    },
  });

  if (!outcome.ok) return NextResponse.json({ ok: false, error: outcome.error });
  return NextResponse.json({ ok: true, result: outcome.result, credits: outcome.credits, balance: outcome.balance });
}

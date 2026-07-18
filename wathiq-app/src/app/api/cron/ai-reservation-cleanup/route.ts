import { NextResponse } from "next/server";
import { reapOrphanedReservations } from "@/lib/ai-reaper";

export const dynamic = "force-dynamic";

/**
 * نقطة Cron لتنظيف الحجوزات اليتيمة (عمليات RESERVED عالقة تخصم رصيدًا بلا
 * نتيجة). تسترجع النقاط بأمان (idempotent، آمن للتزامن — انظر `ai-reaper.ts`).
 *
 * أمان: بدون CRON_SECRET في البيئة تُرفض كل الطلبات (403) — لا تشغيل عام قبل
 * تهيئة السر. عند التفعيل: أضف CRON_SECRET في Vercel؛ جدولة Vercel Cron ترسل
 * تلقائيًا ترويسة `Authorization: Bearer <CRON_SECRET>`. المطابقة بمقارنة زمن
 * ثابت لمنع تسريب عبر التوقيت. لا تُعيد الاستجابة أي أسرار — أعدادًا فقط.
 *
 * إعداد Vercel: أضف إلى `vercel.json`:
 *   { "crons": [{ "path": "/api/cron/ai-reservation-cleanup", "schedule": "0 * * * *" }] }
 * (كل ساعة). المهلة/حجم الدفعة قابلان للتعديل من إعدادات «محاسبة الذكاء».
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron-disabled" }, { status: 403 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const result = await reapOrphanedReservations();
  return NextResponse.json({ ok: true, ...result });
}

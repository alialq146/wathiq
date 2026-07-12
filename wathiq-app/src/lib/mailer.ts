/**
 * Email adapter — provider-agnostic and safe-by-default.
 *
 * التفعيل لاحقًا عبر متغيرات البيئة فقط (لا أسرار في الكود):
 *   RESEND_API_KEY  مفتاح مزود البريد (Resend) — بدونه لا يُرسل شيء ولا ينكسر.
 *   EMAIL_FROM      عنوان المرسل، مثال: "وثّق <no-reply@wathiq.example>".
 *   APP_URL         الأصل العام للمنصة لبناء روابط الاستعادة.
 *
 * أمان: لا يُطبع الرمز الخام أو رابط الاستعادة في السجلات أبدًا —
 * عند غياب المزود نسجل سببًا داخليًا فقط: email_provider_not_configured.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function emailConfigured(): boolean {
  return Boolean(env("RESEND_API_KEY") && env("EMAIL_FROM"));
}

/** الأصل العام للروابط البريدية: APP_URL أولًا ثم Vercel URL كاحتياط. */
export function appUrl(): string {
  const explicit = env("APP_URL");
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = env("VERCEL_PROJECT_PRODUCTION_URL") || env("VERCEL_URL");
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export interface SendResult {
  sent: boolean;
  reason?: "email_provider_not_configured" | "provider_error";
}

/** إرسال بريد عام عبر Resend (fetch مباشر — بلا مكتبات إضافية). */
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  if (!emailConfigured()) {
    console.warn("[mailer] email_provider_not_configured — الرسالة لم تُرسل (السلوك المتوقع قبل تهيئة البريد).");
    return { sent: false, reason: "email_provider_not_configured" };
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env("EMAIL_FROM"), to: [to], subject, html, text }),
    });
    if (!res.ok) {
      // لا نطبع جسم الرد كاملًا (قد يحوي تفاصيل حساسة) — الحالة تكفي للتشخيص.
      console.error(`[mailer] provider_error status=${res.status}`);
      return { sent: false, reason: "provider_error" };
    }
    return { sent: true };
  } catch {
    console.error("[mailer] provider_error network");
    return { sent: false, reason: "provider_error" };
  }
}

/** رسالة استعادة كلمة المرور — لا تتضمن كلمة مرور، والرابط صالح ٦٠ دقيقة. */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<SendResult> {
  const subject = "استعادة كلمة المرور - وثّق";
  const bodyText =
    "وصلنا طلبًا لاستعادة كلمة المرور لحسابك في وثّق. يمكنك تعيين كلمة مرور جديدة من الرابط التالي. " +
    "ينتهي الرابط خلال 60 دقيقة. إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.";
  const html = `<!doctype html><html lang="ar" dir="rtl"><body style="font-family:Tahoma,Arial,sans-serif;background:#f5f7fa;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e3e8ef;border-radius:12px;padding:28px">
    <h2 style="margin:0 0 12px;color:#0f213f;font-size:18px">استعادة كلمة المرور</h2>
    <p style="margin:0 0 18px;color:#3d4b5f;font-size:14px;line-height:1.9">${bodyText}</p>
    <p style="text-align:center;margin:0 0 18px">
      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px">تعيين كلمة مرور جديدة</a>
    </p>
    <p style="margin:0;color:#8493a8;font-size:12px;line-height:1.8">إذا لم يعمل الزر، انسخ الرابط التالي في المتصفح:<br><span dir="ltr" style="word-break:break-all">${resetUrl}</span></p>
  </div>
  <p style="text-align:center;color:#8493a8;font-size:11px;margin-top:14px">وثّق — منصة تحليل المتطلبات</p>
</body></html>`;
  return sendEmail(to, subject, html, `${bodyText}\n\n${resetUrl}`);
}

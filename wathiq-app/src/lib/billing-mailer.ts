/**
 * بريد الفوترة (v2.0) — قوالب جاهزة تُرسَل عبر نفس مهايئ البريد الحالي
 * (لا مزود جديد). مُعطَّل افتراضيًا: يتطلب BILLING_EMAIL_ENABLED=true
 * إضافة إلى تهيئة المزود نفسها.
 *
 * قاعدة صارمة: فشل البريد أو غيابه لا يكسر أي عملية فوترة أبدًا —
 * نسجل billing_email_not_configured/billing_email_failed ونُكمل.
 */

import { emailConfigured, sendEmail, appUrl } from "./mailer";
import { trackEvent } from "./track";
import { prisma } from "./db";

export function billingEmailEnabled(): boolean {
  return process.env.BILLING_EMAIL_ENABLED?.trim() === "true" && emailConfigured();
}

type BillingTemplate =
  | { kind: "invoice_issued"; invoiceNumber: string; total: string; currency: string }
  | { kind: "payment_received"; amount: string; currency: string }
  | { kind: "expiry_7_days"; endDate: string }
  | { kind: "expired"; endDate: string }
  | { kind: "renewed"; plan: string; endDate: string };

function render(t: BillingTemplate): { subject: string; html: string; text: string } {
  const url = `${appUrl()}/account/billing`;
  const wrap = (title: string, body: string) => ({
    html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px"><h2 style="color:#0f2233">${title}</h2><p style="font-size:14px;line-height:1.9;color:#333">${body}</p><p style="margin-top:20px"><a href="${url}" style="background:#0f4c81;color:#fff;padding:10px 22px;border-radius:24px;text-decoration:none;font-size:14px">فتح الحساب والاشتراك</a></p><p style="font-size:11px;color:#888;margin-top:26px">هذه الرسالة صادرة من نظام وثّق بناءً على بيانات الاشتراك المسجلة.</p></div>`,
    text: `${title}\n\n${body.replace(/<[^>]+>/g, "")}\n\n${url}`,
  });

  switch (t.kind) {
    case "invoice_issued": {
      const w = wrap("صدرت فاتورتك من وثّق", `تم إصدار الفاتورة <b dir="ltr">${t.invoiceNumber}</b> بمبلغ ${t.total} ${t.currency === "SAR" ? "ريال" : t.currency}. يمكنك الاطلاع عليها وطباعتها من صفحة الحساب والاشتراك.`);
      return { subject: `فاتورتك من وثّق — ${t.invoiceNumber}`, ...w };
    }
    case "payment_received": {
      const w = wrap("تم استلام دفعتك", `نؤكد استلام دفعتك بمبلغ ${t.amount} ${t.currency === "SAR" ? "ريال" : t.currency}. شكرًا لثقتك بوثّق.`);
      return { subject: "تم استلام دفعتك — وثّق", ...w };
    }
    case "expiry_7_days": {
      const w = wrap("تذكير بقرب انتهاء اشتراكك", `ينتهي اشتراكك في وثّق بتاريخ ${t.endDate}. يمكنك التواصل معنا للتجديد دون انقطاع.`);
      return { subject: "تذكير بقرب انتهاء اشتراكك في وثّق", ...w };
    }
    case "expired": {
      const w = wrap("انتهى اشتراكك في وثّق", `انتهى اشتراكك بتاريخ ${t.endDate}. بياناتك محفوظة كما هي — تواصل معنا لتجديد الخطة ومتابعة العمل.`);
      return { subject: "انتهى اشتراكك في وثّق", ...w };
    }
    case "renewed": {
      const w = wrap("تم تجديد اشتراكك", `تم تجديد اشتراكك في وثّق (الخطة: ${t.plan}) حتى ${t.endDate}. شكرًا لاستمرارك معنا.`);
      return { subject: "تم تجديد اشتراكك في وثّق", ...w };
    }
  }
}

/**
 * إرسال قالب فوترة — آمن الفشل بالكامل:
 * غير مفعّل → تسجيل داخلي فقط؛ فشل المزود → billing_email_failed؛
 * النجاح → سجل تدقيق BILLING_EMAIL_SENT. لا يرمي أخطاء أبدًا.
 */
export async function sendBillingEmail(userId: string, to: string, template: BillingTemplate): Promise<void> {
  try {
    if (!billingEmailEnabled()) {
      console.warn("[billing-mailer] billing_email_not_configured — لم يُرسل شيء (متوقع قبل التفعيل).");
      return;
    }
    const { subject, html, text } = render(template);
    const res = await sendEmail(to, subject, html, text);
    if (res.sent) {
      await prisma.billingAuditLog.create({
        data: { userId, entityType: "EMAIL", action: "BILLING_EMAIL_SENT", metadata: { kind: template.kind } },
      }).catch(() => {});
      await trackEvent({ eventName: "billing_email_sent", userId, metadata: { kind: template.kind } });
    } else {
      await trackEvent({ eventName: "billing_email_failed", userId, metadata: { kind: template.kind, reason: res.reason ?? null } });
    }
  } catch (err) {
    console.error("[billing-mailer]", err instanceof Error ? err.message : "error");
  }
}

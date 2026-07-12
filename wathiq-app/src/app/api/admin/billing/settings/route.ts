import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, ADMIN_FORBIDDEN } from "@/lib/admin";
import { getBillingSettings } from "@/lib/billing";
import { billingEmailEnabled } from "@/lib/billing-mailer";
import { emailConfigured } from "@/lib/mailer";
import { trackEvent } from "@/lib/track";

export const dynamic = "force-dynamic";

/**
 * إعدادات الفوترة المركزية (v2.1) — بيانات المُصدِر، الفاتورة، العملة/الضريبة،
 * تعليمات الدفع. SUPER_ADMIN فقط. لا أسرار في القاعدة إطلاقًا: مفاتيح البريد/
 * الـ Cron/البوابات تبقى في متغيرات البيئة — هنا نعرض حالتها فقط دون كشفها.
 */

/** حالة البريد للعرض فقط — لا يُرجع أي مفتاح أو سر. */
function emailStatus() {
  return {
    providerConfigured: emailConfigured(), // RESEND_API_KEY + EMAIL_FROM موجودان
    billingEmailEnabled: billingEmailEnabled(), // BILLING_EMAIL_ENABLED=true + المزود مهيأ
  };
}

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  const settings = await getBillingSettings();
  await trackEvent({ eventName: "billing_settings_viewed", userId: admin.id });
  return NextResponse.json({ ok: true, settings, email: emailStatus() });
}

/* ---------------- التحقق ---------------- */

const CURRENCIES = ["SAR", "USD", "AED", "EGP", "KWD", "BHD", "QAR", "OMR"];
const trim = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const orNull = (v: unknown, max: number) => {
  const s = trim(v, max);
  return s === "" ? null : s;
};
const bool = (v: unknown, dflt: boolean) => (typeof v === "boolean" ? v : dflt);

/** بادئة الفاتورة: حروف/أرقام لاتينية وشرطة فقط، 2–10، تُحوَّل لأحرف كبيرة. */
function normalizePrefix(v: unknown): string | null {
  const raw = typeof v === "string" ? v.trim().toUpperCase() : "";
  if (!/^[A-Z0-9-]{2,10}$/.test(raw)) return null;
  return raw;
}

export async function PUT(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json(ADMIN_FORBIDDEN, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const issuerName = trim(body.issuerName, 120);
  if (!issuerName) return NextResponse.json({ ok: false, error: "issuer-name-required" }, { status: 400 });

  const prefix = normalizePrefix(body.invoicePrefix);
  if (prefix === null) return NextResponse.json({ ok: false, error: "invalid-prefix" }, { status: 400 });

  const currency = trim(body.defaultCurrency, 8) || "SAR";
  if (!CURRENCIES.includes(currency)) return NextResponse.json({ ok: false, error: "invalid-currency" }, { status: 400 });

  const taxEnabled = bool(body.taxEnabled, false);
  let taxRate = Number(body.defaultTaxRate);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) taxRate = 0;
  // تُخزَّن بمنزلتين عشريتين لتطابق Decimal(5,2).
  taxRate = Math.round(taxRate * 100) / 100;

  let dueDays = Math.trunc(Number(body.defaultDueDays));
  if (!Number.isFinite(dueDays) || dueDays < 0 || dueDays > 365) dueDays = 0;

  const data = {
    issuerName,
    issuerLegalName: orNull(body.issuerLegalName, 160),
    issuerEmail: orNull(body.issuerEmail, 160),
    issuerPhone: orNull(body.issuerPhone, 40),
    issuerAddress: orNull(body.issuerAddress, 240),
    issuerCity: orNull(body.issuerCity, 80),
    issuerCountry: orNull(body.issuerCountry, 80),
    issuerTaxNumber: orNull(body.issuerTaxNumber, 40),
    issuerCommercialRegistration: orNull(body.issuerCommercialRegistration, 40),
    logoUrl: orNull(body.logoUrl, 400),
    defaultCurrency: currency,
    taxEnabled,
    defaultTaxRate: taxRate,
    taxLabel: trim(body.taxLabel, 80) || "ضريبة القيمة المضافة",
    invoicePrefix: prefix,
    invoiceFooterText: trim(body.invoiceFooterText, 240) || "شكرًا لاستخدامك وثّق.",
    invoiceNotes: orNull(body.invoiceNotes, 500),
    defaultDueDays: dueDays,
    paymentInstructions: orNull(body.paymentInstructions, 800),
    showPaymentMethod: bool(body.showPaymentMethod, true),
    showReferenceNumber: bool(body.showReferenceNumber, true),
    supportEmail: orNull(body.supportEmail, 160),
    supportPhone: orNull(body.supportPhone, 40),
    updatedByAdminId: admin.id,
  };

  await prisma.$transaction(async (tx) => {
    await tx.billingSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...data },
      update: data,
    });
    await tx.billingAuditLog.create({
      data: {
        actorId: admin.id,
        userId: admin.id, // إعداد عام لا يخص عميلًا؛ المنفّذ هو الأدمن نفسه.
        entityType: "BILLING_SETTINGS",
        entityId: "singleton",
        action: "BILLING_SETTINGS_UPDATED",
        metadata: { taxEnabled, defaultTaxRate: taxRate, invoicePrefix: prefix, defaultCurrency: currency },
      },
    });
  });

  await trackEvent({
    eventName: "billing_settings_updated",
    userId: admin.id,
    metadata: { taxEnabled, invoicePrefix: prefix, defaultCurrency: currency },
  });

  const settings = await getBillingSettings();
  return NextResponse.json({ ok: true, settings, email: emailStatus() });
}

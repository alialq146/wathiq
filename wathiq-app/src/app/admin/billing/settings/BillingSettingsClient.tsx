"use client";

/**
 * إعدادات الفوترة المركزية (v2.1) — بيانات المُصدِر، إعدادات الفاتورة،
 * العملة/الضريبة، تعليمات الدفع، وحالة البريد (بلا أسرار). كل حفظ يمر عبر
 * PUT /api/admin/billing/settings المحمي بـ SUPER_ADMIN مع تحقق خادمي كامل.
 * تنويه الضريبة صريح: إعداد حسابي فقط لا يمثل اعتمادًا ضريبيًا رسميًا.
 */

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ds";
import type { ResolvedBillingSettings } from "@/lib/billing";

interface EmailStatus { providerConfigured: boolean; billingEmailEnabled: boolean }

type FormState = {
  issuerName: string; issuerLegalName: string; issuerEmail: string; issuerPhone: string;
  issuerAddress: string; issuerCity: string; issuerCountry: string; issuerTaxNumber: string;
  issuerCommercialRegistration: string; logoUrl: string; defaultCurrency: string;
  taxEnabled: boolean; defaultTaxRate: string; taxLabel: string; invoicePrefix: string;
  invoiceFooterText: string; invoiceNotes: string; defaultDueDays: string; paymentInstructions: string;
  showPaymentMethod: boolean; showReferenceNumber: boolean; supportEmail: string; supportPhone: string;
};

const CURRENCIES = ["SAR", "USD", "AED", "EGP", "KWD", "BHD", "QAR", "OMR"];
const CURRENCY_AR: Record<string, string> = {
  SAR: "ريال سعودي (SAR)", USD: "دولار أمريكي (USD)", AED: "درهم إماراتي (AED)",
  EGP: "جنيه مصري (EGP)", KWD: "دينار كويتي (KWD)", BHD: "دينار بحريني (BHD)",
  QAR: "ريال قطري (QAR)", OMR: "ريال عماني (OMR)",
};

const toForm = (s: ResolvedBillingSettings): FormState => ({
  issuerName: s.issuerName ?? "",
  issuerLegalName: s.issuerLegalName ?? "",
  issuerEmail: s.issuerEmail ?? "",
  issuerPhone: s.issuerPhone ?? "",
  issuerAddress: s.issuerAddress ?? "",
  issuerCity: s.issuerCity ?? "",
  issuerCountry: s.issuerCountry ?? "",
  issuerTaxNumber: s.issuerTaxNumber ?? "",
  issuerCommercialRegistration: s.issuerCommercialRegistration ?? "",
  logoUrl: s.logoUrl ?? "",
  defaultCurrency: s.defaultCurrency ?? "SAR",
  taxEnabled: s.taxEnabled ?? false,
  defaultTaxRate: String(s.defaultTaxRate ?? 0),
  taxLabel: s.taxLabel ?? "ضريبة القيمة المضافة",
  invoicePrefix: s.invoicePrefix ?? "INV",
  invoiceFooterText: s.invoiceFooterText ?? "",
  invoiceNotes: s.invoiceNotes ?? "",
  defaultDueDays: String(s.defaultDueDays ?? 0),
  paymentInstructions: s.paymentInstructions ?? "",
  showPaymentMethod: s.showPaymentMethod ?? true,
  showReferenceNumber: s.showReferenceNumber ?? true,
  supportEmail: s.supportEmail ?? "",
  supportPhone: s.supportPhone ?? "",
});

const cardStyle: React.CSSProperties = {
  background: "var(--surface-card)", border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-xl)", padding: "22px 24px", marginBottom: 16,
};

export function BillingSettingsClient({ initial, email }: { initial: ResolvedBillingSettings; email: EmailStatus }) {
  const [form, setForm] = React.useState<FormState>(toForm(initial));
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const errorMsg = (code: string) =>
    code === "issuer-name-required" ? "اسم المُصدِر مطلوب."
    : code === "invalid-prefix" ? "بادئة الفاتورة يجب أن تكون حروفًا/أرقامًا لاتينية وشرطة فقط (2–10)."
    : code === "invalid-currency" ? "العملة غير مدعومة."
    : "تعذر الحفظ. راجع البيانات وحاول مجددًا.";

  const save = async () => {
    if (saving) return;
    // تحقق مبكر ودود على العميل (الخادم يبقى مرجع الحقيقة).
    if (!form.issuerName.trim()) return showToast(false, "اسم المُصدِر مطلوب.");
    if (!/^[A-Za-z0-9-]{2,10}$/.test(form.invoicePrefix.trim())) return showToast(false, "بادئة الفاتورة: حروف/أرقام لاتينية وشرطة فقط (2–10).");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/billing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          defaultTaxRate: Number(form.defaultTaxRate) || 0,
          defaultDueDays: Number(form.defaultDueDays) || 0,
        }),
      });
      const j = await res.json();
      if (!j.ok) return showToast(false, errorMsg(j.error));
      setForm(toForm(j.settings as ResolvedBillingSettings));
      showToast(true, "تم حفظ إعدادات الفوترة بنجاح.");
    } catch {
      showToast(false, "تعذر الاتصال بالخادم. حاول مجددًا.");
    } finally {
      setSaving(false);
    }
  };

  const secTitle = (icon: string, title: string, sub?: string) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Icon name={icon} size={17} color="var(--teal-600)" />
        <h2 style={{ font: "var(--weight-bold) 16px/1.3 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>{title}</h2>
      </div>
      {sub && <p style={{ font: "12.5px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "6px 0 0" }}>{sub}</p>}
    </div>
  );

  const field = (key: keyof FormState, label: string, placeholder = "", dir?: "ltr", type: "text" | "number" = "text") => (
    <div>
      <label htmlFor={`bs-${key}`} style={{ display: "block", font: "var(--weight-semibold) 12.5px/1 var(--font-sans)", color: "var(--text-strong)", marginBottom: 7 }}>{label}</label>
      <input
        id={`bs-${key}`}
        type={type}
        value={String(form[key] ?? "")}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value as FormState[typeof key])}
        style={{
          width: "100%", height: 38, padding: "0 12px", borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)", background: "var(--surface-card)",
          font: "13.5px var(--font-sans)", color: "var(--text-strong)", outline: "none",
          direction: dir, textAlign: dir === "ltr" ? "left" : undefined,
        }}
      />
    </div>
  );

  const area = (key: keyof FormState, label: string, placeholder = "", rows = 3) => (
    <div>
      <label htmlFor={`bs-${key}`} style={{ display: "block", font: "var(--weight-semibold) 12.5px/1 var(--font-sans)", color: "var(--text-strong)", marginBottom: 7 }}>{label}</label>
      <textarea
        id={`bs-${key}`}
        rows={rows}
        value={String(form[key] ?? "")}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value as FormState[typeof key])}
        style={{
          width: "100%", padding: "9px 12px", borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)", background: "var(--surface-card)",
          font: "13.5px/1.7 var(--font-sans)", color: "var(--text-strong)", outline: "none", resize: "vertical",
        }}
      />
    </div>
  );

  const toggle = (key: "taxEnabled" | "showPaymentMethod" | "showReferenceNumber", label: string, hint?: string) => (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
      <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} style={{ marginTop: 3 }} />
      <span>
        <span style={{ font: "var(--weight-semibold) 13px var(--font-sans)", color: "var(--text-strong)" }}>{label}</span>
        {hint && <span style={{ display: "block", font: "12px/1.6 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>{hint}</span>}
      </span>
    </label>
  );

  const taxRateN = Number(form.defaultTaxRate) || 0;
  const previewSubtotal = 149;
  const previewTax = form.taxEnabled ? Math.round(previewSubtotal * taxRateN) / 100 : 0;
  const previewTotal = previewSubtotal + previewTax;
  const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <style>{`
        .bs-wrap { max-width: 900px; margin: 0 auto; padding: 28px 20px 100px; }
        .bs-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 700px) { .bs-grid2 { grid-template-columns: 1fr; } }
        .bs-bar { position: sticky; bottom: 0; z-index: 10; }
      `}</style>

      <div className="bs-wrap">
        <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-medium) 13px var(--font-sans)", color: "var(--blue-600)", textDecoration: "none" }}>
          <Icon name="arrow-right" size={15} /> العودة إلى لوحة الأدمن
        </Link>
        <h1 style={{ font: "var(--weight-bold) 24px/1.3 var(--font-sans)", color: "var(--text-strong)", margin: "12px 0 6px" }}>إعدادات الفوترة</h1>
        <p style={{ font: "14px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 24px", maxWidth: 620 }}>
          تُطبَّق هذه الإعدادات على الفواتير الجديدة فقط. الفواتير الصادرة سابقًا تحتفظ ببياناتها كما أُصدرت ولا تتغير.
        </p>

        {/* ===== بيانات المُصدِر ===== */}
        <div style={cardStyle}>
          {secTitle("building-2", "بيانات المُصدِر", "الاسم والبيانات التي تظهر أعلى الفاتورة كجهة إصدار.")}
          <div className="bs-grid2">
            {field("issuerName", "اسم المُصدِر *", "وثّق")}
            {field("issuerLegalName", "الاسم القانوني (اختياري)", "شركة وثّق للحلول الرقمية")}
            {field("issuerEmail", "البريد الإلكتروني", "billing@example.com", "ltr")}
            {field("issuerPhone", "الهاتف", "9665xxxxxxx", "ltr")}
            {field("issuerCity", "المدينة", "الرياض")}
            {field("issuerCountry", "الدولة", "المملكة العربية السعودية")}
            {field("issuerTaxNumber", "الرقم الضريبي (اختياري)", "3xxxxxxxxxxxxxx", "ltr")}
            {field("issuerCommercialRegistration", "السجل التجاري (اختياري)", "1010xxxxxx", "ltr")}
          </div>
          <div style={{ marginTop: 14 }}>{field("issuerAddress", "العنوان", "حي العليا، طريق الملك فهد")}</div>
          <div style={{ marginTop: 14 }}>{field("logoUrl", "رابط الشعار (اختياري)", "https://…/logo.png", "ltr")}</div>
        </div>

        {/* ===== إعدادات الفاتورة ===== */}
        <div style={cardStyle}>
          {secTitle("receipt", "إعدادات الفاتورة", "بادئة الترقيم ونصوص الفاتورة والاستحقاق.")}
          <div className="bs-grid2">
            {field("invoicePrefix", "بادئة رقم الفاتورة", "INV", "ltr")}
            {field("defaultDueDays", "أيام الاستحقاق الافتراضية", "0", "ltr", "number")}
          </div>
          <div style={{ marginTop: 14 }}>{field("invoiceFooterText", "نص تذييل الفاتورة", "شكرًا لاستخدامك وثّق.")}</div>
          <div style={{ marginTop: 14 }}>{area("invoiceNotes", "ملاحظات تظهر على الفاتورة (اختياري)", "أي ملاحظة عامة تظهر لجميع العملاء في الفاتورة.", 2)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16, padding: "14px 16px", background: "var(--slate-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            {toggle("showPaymentMethod", "إظهار طريقة الدفع في الفاتورة")}
            {toggle("showReferenceNumber", "إظهار الرقم المرجعي في الفاتورة")}
          </div>
          <p style={{ font: "12px/1.7 var(--font-sans)", color: "var(--text-subtle)", margin: "12px 0 0" }}>
            الرقم التالي سيكون بالشكل: <span style={{ direction: "ltr", display: "inline-block", font: "12.5px var(--font-mono)", color: "var(--text-strong)" }}>{(form.invoicePrefix || "INV").toUpperCase()}-{new Date().getFullYear()}-000001</span> — الترقيم تسلسلي وذرّي ولا يتأثر بتغيير البادئة على الفواتير السابقة.
          </p>
        </div>

        {/* ===== العملة والضريبة ===== */}
        <div style={cardStyle}>
          {secTitle("percent", "العملة والضريبة")}
          <div className="bs-grid2">
            <div>
              <label htmlFor="bs-currency" style={{ display: "block", font: "var(--weight-semibold) 12.5px/1 var(--font-sans)", color: "var(--text-strong)", marginBottom: 7 }}>العملة الافتراضية</label>
              <select id="bs-currency" value={form.defaultCurrency} onChange={(e) => set("defaultCurrency", e.target.value)} style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--surface-card)", font: "13.5px var(--font-sans)", color: "var(--text-strong)" }}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_AR[c] ?? c}</option>)}
              </select>
            </div>
            {field("defaultTaxRate", "نسبة الضريبة (%)", "15", "ltr", "number")}
          </div>
          <div style={{ marginTop: 14 }}>{field("taxLabel", "مسمى الضريبة على الفاتورة", "ضريبة القيمة المضافة")}</div>
          <div style={{ marginTop: 16, padding: "14px 16px", background: "var(--slate-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            {toggle("taxEnabled", "تفعيل الضريبة على الفواتير الجديدة", "عند التفعيل تُضاف نسبة الضريبة أعلاه إلى الفواتير الجديدة فقط.")}
          </div>
          <div role="note" style={{ marginTop: 14, padding: "12px 15px", borderRadius: "var(--radius-md)", background: "var(--amber-50)", border: "1px solid var(--amber-100)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Icon name="info" size={16} color="var(--amber-600)" style={{ marginTop: 1 }} />
            <span style={{ font: "12.5px/1.7 var(--font-sans)", color: "var(--text-strong)" }}>
              تفعيل الضريبة هنا إعداد حسابي فقط، ولا يمثل تكاملًا أو اعتمادًا ضريبيًا رسميًا.
            </span>
          </div>
        </div>

        {/* ===== تعليمات الدفع والدعم ===== */}
        <div style={cardStyle}>
          {secTitle("wallet", "تعليمات الدفع والدعم")}
          {area("paymentInstructions", "تعليمات الدفع (تظهر للعميل)", "مثال: التحويل إلى حساب … / رقم الآيبان … / تواصل مع الدعم لإتمام الدفع.", 3)}
          <div className="bs-grid2" style={{ marginTop: 14 }}>
            {field("supportEmail", "بريد الدعم", "support@example.com", "ltr")}
            {field("supportPhone", "هاتف الدعم", "9665xxxxxxx", "ltr")}
          </div>
        </div>

        {/* ===== حالة البريد ===== */}
        <div style={cardStyle}>
          {secTitle("mail", "حالة بريد الفوترة", "للاطلاع فقط — تُدار من متغيرات البيئة ولا تُعرض أي مفاتيح أو أسرار هنا.")}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["مزوّد البريد مُهيأ", email.providerConfigured],
              ["إرسال بريد الفوترة مفعّل", email.billingEmailEnabled],
            ].map(([label, ok]) => (
              <div key={String(label)} style={{ display: "flex", alignItems: "center", gap: 9, font: "13px var(--font-sans)", color: "var(--text-strong)" }}>
                <Icon name={ok ? "check-circle" : "circle-slash"} size={16} color={ok ? "var(--green-500)" : "var(--text-subtle)"} />
                {label}: <b style={{ color: ok ? "var(--green-600)" : "var(--text-muted)" }}>{ok ? "نعم" : "لا"}</b>
              </div>
            ))}
          </div>
          {!email.billingEmailEnabled && (
            <p style={{ font: "12px/1.7 var(--font-sans)", color: "var(--text-subtle)", margin: "12px 0 0" }}>
              لتفعيل بريد الفوترة اضبط <span style={{ direction: "ltr", display: "inline-block", font: "var(--font-mono)" }}>BILLING_EMAIL_ENABLED=true</span> مع تهيئة مزوّد البريد في متغيرات البيئة.
            </p>
          )}
        </div>

        {/* ===== معاينة الفاتورة ===== */}
        <div style={cardStyle}>
          {secTitle("eye", "معاينة مبسّطة للفاتورة")}
          <div style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "18px 20px", background: "var(--surface-card)" }}>
            <div style={{ font: "var(--weight-bold) 16px var(--font-sans)", color: "var(--text-strong)" }}>{form.issuerName || "وثّق"}</div>
            {form.issuerLegalName && <div style={{ font: "12px var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>{form.issuerLegalName}</div>}
            {form.issuerTaxNumber && <div style={{ font: "12px var(--font-sans)", color: "var(--text-muted)", marginTop: 2, direction: "ltr", textAlign: "end" }}>الرقم الضريبي: {form.issuerTaxNumber}</div>}
            <div style={{ margin: "14px 0", height: 1, background: "var(--border-subtle)" }} />
            <div style={{ font: "12.5px var(--font-mono)", color: "var(--text-muted)", direction: "ltr", textAlign: "end" }}>{(form.invoicePrefix || "INV").toUpperCase()}-{new Date().getFullYear()}-000001</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", font: "13px var(--font-sans)", color: "var(--text-strong)" }}>
                <span>الخطة الاحترافية — اشتراك شهري</span><span>{money(previewSubtotal)} {form.defaultCurrency}</span>
              </div>
              {form.taxEnabled && (
                <div style={{ display: "flex", justifyContent: "space-between", font: "13px var(--font-sans)", color: "var(--text-muted)" }}>
                  <span>{form.taxLabel || "ضريبة"} ({taxRateN}%)</span><span>{money(previewTax)} {form.defaultCurrency}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", font: "var(--weight-bold) 14px var(--font-sans)", color: "var(--text-strong)", borderTop: "1px solid var(--border-subtle)", paddingTop: 8, marginTop: 4 }}>
                <span>الإجمالي</span><span>{money(previewTotal)} {form.defaultCurrency}</span>
              </div>
            </div>
            {form.paymentInstructions && (
              <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--slate-50)", borderRadius: "var(--radius-sm)", font: "12px/1.7 var(--font-sans)", color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>{form.paymentInstructions}</div>
            )}
            <div style={{ marginTop: 14, font: "12px var(--font-sans)", color: "var(--text-subtle)", textAlign: "center" }}>{form.invoiceFooterText || "شكرًا لاستخدامك وثّق."}</div>
          </div>
          <p style={{ font: "11.5px/1.6 var(--font-sans)", color: "var(--text-subtle)", margin: "10px 0 0" }}>
            المعاينة توضيحية بقيم مثال (149) لبيان أثر الإعدادات — الأرقام الفعلية تُحسب عند إصدار كل فاتورة.
          </p>
        </div>

        {/* شريط الحفظ */}
        <div className="bs-bar" style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 0" }}>
          <button
            onClick={save}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 26px", borderRadius: "var(--radius-pill)", border: "none", background: "var(--primary)", color: "#fff", font: "var(--weight-semibold) 14px var(--font-sans)", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "var(--shadow-md)" }}
          >
            <Icon name="save" size={16} color="#fff" /> {saving ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
          </button>
        </div>
      </div>

      {toast && (
        <div role="status" style={{ position: "fixed", bottom: 22, insetInlineStart: "50%", transform: "translateX(50%)", zIndex: 70, display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: "var(--radius-pill)", background: "var(--navy-900)", color: "#fff", font: "var(--weight-medium) 13px/1 var(--font-sans)", boxShadow: "var(--shadow-lg)", maxWidth: "calc(100vw - 40px)" }}>
          <Icon name={toast.ok ? "check-circle" : "alert-circle"} size={15} color={toast.ok ? "var(--green-500)" : "var(--red-500)"} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

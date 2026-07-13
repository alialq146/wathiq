"use client";

/**
 * واجهة «إعدادات النظام» (v2.2) — SUPER_ADMIN فقط.
 * فئات جانبية (تتحول Select على الجوال)، حفظ لكل قسم، استعادة الافتراضي
 * بتأكيد، تحذيرات للإعدادات الحساسة، شارة تغييرات غير محفوظة، وسجل تغييرات.
 * كل التحقق الفعلي في الخادم — هذه الواجهة تحقق مبكر ودود فقط.
 * لا تُعرض هنا أي Secrets أو Environment Variables.
 */

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ds";
import type { SystemSettingsShape, SettingsSection } from "@/lib/settings/types";

type Ceilings = { analysisLimitMax: number; projectLimitMax: number; assistantTaskTokensMax: number; fullAnalysisTokensMax: number };
interface Meta { updatedAt: string | null; updatedByName: string | null; ceilings: Ceilings }

const CATEGORIES: Array<{ key: string; icon: string; label: string; desc: string }> = [
  { key: "general", icon: "settings", label: "المنصة", desc: "الاسم، الهوية، الفوتر، اللغة والمنطقة الزمنية." },
  { key: "contact", icon: "message-circle", label: "التواصل والمبيعات", desc: "واتساب، البريد، نصوص الترقية والتجديد." },
  { key: "billing", icon: "receipt", label: "الفوترة", desc: "بيانات المُصدِر والضريبة وترقيم الفواتير." },
  { key: "notifications", icon: "bell", label: "التذكيرات والإشعارات", desc: "أيام تذكير الاشتراك وقنواته ونصوصه." },
  { key: "documents", icon: "file-text", label: "الوثائق والتقارير", desc: "هوية المستند، أقسام BRD/SRS، النصوص والطباعة." },
  { key: "plans", icon: "gem", label: "الخطط والباقات", desc: "أسماء وأسعار وحدود الخطط (بسقوف صلبة)." },
  { key: "assistant", icon: "sparkles", label: "مساعد وثّق", desc: "تفعيل المهام وحدودها — للأدمن فقط." },
  { key: "features", icon: "toggle-right", label: "خصائص النظام", desc: "التسجيل، الصيانة، Demo، وتفعيل الوحدات." },
  { key: "audit", icon: "history", label: "سجل التغييرات", desc: "من عدّل ماذا ومتى." },
];

/* ---------------- عناصر نموذج مشتركة ---------------- */

const lbl: React.CSSProperties = { display: "block", font: "var(--weight-semibold) 12.5px/1 var(--font-sans)", color: "var(--text-strong)", marginBottom: 7 };
const inputStyle: React.CSSProperties = { width: "100%", height: 38, padding: "0 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--surface-card)", font: "13.5px var(--font-sans)", color: "var(--text-strong)", outline: "none" };
const cardStyle: React.CSSProperties = { background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "20px 22px", marginBottom: 14 };

function Txt({ label, value, onChange, placeholder = "", dir, help }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; dir?: "ltr"; help?: string }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, direction: dir, textAlign: dir === "ltr" ? "left" : undefined }} />
      {help && <div style={{ font: "11.5px/1.6 var(--font-sans)", color: "var(--text-subtle)", marginTop: 5 }}>{help}</div>}
    </div>
  );
}
function Area({ label, value, onChange, rows = 3, help, placeholder = "" }: { label: string; value: string; onChange: (v: string) => void; rows?: number; help?: string; placeholder?: string }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <textarea value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, height: "auto", padding: "9px 12px", lineHeight: 1.7, resize: "vertical" }} />
      {help && <div style={{ font: "11.5px/1.6 var(--font-sans)", color: "var(--text-subtle)", marginTop: 5 }}>{help}</div>}
    </div>
  );
}
function Bool({ label, value, onChange, help }: { label: string; value: boolean; onChange: (v: boolean) => void; help?: string }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3 }} />
      <span>
        <span style={{ font: "var(--weight-semibold) 13px var(--font-sans)", color: "var(--text-strong)" }}>{label}</span>
        {help && <span style={{ display: "block", font: "11.5px/1.6 var(--font-sans)", color: "var(--text-subtle)", marginTop: 2 }}>{help}</span>}
      </span>
    </label>
  );
}
function Num({ label, value, onChange, help, min = 0, max }: { label: string; value: number; onChange: (v: number) => void; help?: string; min?: number; max?: number }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input type="number" value={value} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} style={{ ...inputStyle, direction: "ltr", textAlign: "left" }} />
      {help && <div style={{ font: "11.5px/1.6 var(--font-sans)", color: "var(--text-subtle)", marginTop: 5 }}>{help}</div>}
    </div>
  );
}
/** حد قابل للتعطيل: null = غير محدود/مخصص. */
function LimitField({ label, value, onChange, max, help }: { label: string; value: number | null; onChange: (v: number | null) => void; max: number; help?: string }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="number" min={0} max={max} disabled={value === null}
          value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))}
          style={{ ...inputStyle, direction: "ltr", textAlign: "left", opacity: value === null ? 0.5 : 1, flex: 1 }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, font: "12px var(--font-sans)", color: "var(--text-muted)", whiteSpace: "nowrap", cursor: "pointer" }}>
          <input type="checkbox" checked={value === null} onChange={(e) => onChange(e.target.checked ? null : 0)} />
          غير محدود / مخصص
        </label>
      </div>
      {help && <div style={{ font: "11.5px/1.6 var(--font-sans)", color: "var(--text-subtle)", marginTop: 5 }}>{help}</div>}
    </div>
  );
}
const Warn = ({ children }: { children: React.ReactNode }) => (
  <div role="note" style={{ padding: "11px 14px", borderRadius: "var(--radius-md)", background: "var(--amber-50)", border: "1px solid var(--amber-100)", display: "flex", gap: 9, alignItems: "flex-start", font: "12.5px/1.7 var(--font-sans)", color: "var(--text-strong)" }}>
    <Icon name="info" size={15} color="var(--amber-600)" style={{ marginTop: 2 }} />
    <span>{children}</span>
  </div>
);
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };

/* ---------------- المكوّن الرئيسي ---------------- */

export function SystemSettingsClient({ initial, meta }: { initial: SystemSettingsShape; meta: Meta }) {
  const [settings, setSettings] = React.useState<SystemSettingsShape>(initial);
  const [saved, setSaved] = React.useState<SystemSettingsShape>(initial);
  const [active, setActive] = React.useState<string>("general");
  const [busy, setBusy] = React.useState(false);
  const [lastMeta, setLastMeta] = React.useState(meta);
  const [toast, setToast] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const isDirty = (sec: SettingsSection) => JSON.stringify(settings[sec]) !== JSON.stringify(saved[sec]);
  const patch = <K extends SettingsSection>(sec: K, partial: Partial<SystemSettingsShape[K]>) =>
    setSettings((s) => ({ ...s, [sec]: { ...s[sec], ...partial } }));

  const errMsg = (code: string) =>
    code === "invalid-whatsapp" ? "رقم الواتساب يجب أن يكون أرقامًا بصيغة دولية."
    : code === "all-plans-hidden" ? "لا يمكن إخفاء كل الخطط من صفحة الأسعار."
    : "تعذر الحفظ. راجع القيم وحاول مجددًا.";

  const save = async (sec: SettingsSection, opts?: { reset?: boolean; confirmText?: string }) => {
    if (busy) return;
    if (opts?.confirmText && !confirm(opts.confirmText)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: sec, values: settings[sec], resetToDefault: opts?.reset === true }),
      });
      const j = await res.json();
      if (!j.ok) return showToast(false, errMsg(j.error));
      setSettings(j.settings);
      setSaved(j.settings);
      setLastMeta((m) => ({ ...m, updatedAt: new Date().toISOString(), updatedByName: null }));
      showToast(true, opts?.reset ? "تمت استعادة الافتراضي لهذا القسم." : "تم حفظ الإعدادات بنجاح.");
    } catch {
      showToast(false, "تعذر الاتصال بالخادم.");
    } finally {
      setBusy(false);
    }
  };

  const SaveBar = ({ sec, sensitive }: { sec: SettingsSection; sensitive?: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
      <button
        onClick={() => void save(sec, sensitive ? { confirmText: sensitive } : undefined)}
        disabled={busy || !isDirty(sec)}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 20px", borderRadius: "var(--radius-pill)", border: "none", background: "var(--primary)", color: "#fff", font: "var(--weight-semibold) 13px var(--font-sans)", cursor: busy || !isDirty(sec) ? "default" : "pointer", opacity: busy || !isDirty(sec) ? 0.55 : 1 }}
      >
        <Icon name="save" size={14} color="#fff" /> {busy ? "جارٍ الحفظ…" : "حفظ القسم"}
      </button>
      <button
        onClick={() => void save(sec, { reset: true, confirmText: "استعادة القيم الافتراضية لهذا القسم؟ ستفقد التخصيصات الحالية فيه." })}
        disabled={busy}
        style={{ height: 38, padding: "0 16px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-strong)", font: "var(--weight-medium) 12.5px var(--font-sans)", cursor: "pointer" }}
      >
        استعادة الافتراضي
      </button>
      {isDirty(sec) && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: "var(--amber-50)", color: "var(--amber-600)", font: "var(--weight-semibold) 11.5px var(--font-sans)" }}>
          <Icon name="alert-circle" size={12} color="var(--amber-600)" /> توجد تغييرات غير محفوظة
        </span>
      )}
    </div>
  );

  const secHeader = (title: string, desc: string) => (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ font: "var(--weight-bold) 17px/1.3 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>{title}</h2>
      <p style={{ font: "12.5px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "5px 0 0" }}>{desc}</p>
    </div>
  );

  /* ---------------- أقسام ---------------- */

  const g = settings.general, c = settings.contact, n = settings.notifications,
        d = settings.documents, p = settings.plans, a = settings.assistant, f = settings.features;

  const renderGeneral = () => (
    <div style={cardStyle}>
      {secHeader("إعدادات المنصة", "الهوية العامة للمنصة — تُستخدم في الواجهات والوثائق.")}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={grid2} className="ss-grid2">
          <Txt label="اسم المنصة *" value={g.platformName} onChange={(v) => patch("general", { platformName: v })} />
          <Txt label="الاسم الإنجليزي" value={g.platformNameLatin} onChange={(v) => patch("general", { platformNameLatin: v })} dir="ltr" />
          <Txt label="الوصف المختصر" value={g.tagline} onChange={(v) => patch("general", { tagline: v })} />
          <Txt label="تنسيق التاريخ" value={g.dateFormat} onChange={(v) => patch("general", { dateFormat: v })} dir="ltr" />
          <Txt label="شعار المنصة (URL اختياري)" value={g.logoUrl} onChange={(v) => patch("general", { logoUrl: v })} dir="ltr" help="روابط https فقط." />
          <Txt label="Favicon (URL اختياري)" value={g.faviconUrl} onChange={(v) => patch("general", { faviconUrl: v })} dir="ltr" />
          <Txt label="اللغة الافتراضية" value={g.locale} onChange={(v) => patch("general", { locale: v })} dir="ltr" />
          <Txt label="المنطقة الزمنية" value={g.timezone} onChange={(v) => patch("general", { timezone: v })} dir="ltr" />
          <Txt label="رابط الصفحة الرئيسية" value={g.homepageUrl} onChange={(v) => patch("general", { homepageUrl: v })} dir="ltr" />
          <Txt label="رابط LinkedIn" value={g.linkedinUrl} onChange={(v) => patch("general", { linkedinUrl: v })} dir="ltr" />
          <Txt label="رابط X" value={g.xUrl} onChange={(v) => patch("general", { xUrl: v })} dir="ltr" />
        </div>
        <Txt label="نص الفوتر" value={g.footerText} onChange={(v) => patch("general", { footerText: v })} />
        <Bool label="إظهار رقم الإصدار" value={g.showVersion} onChange={(v) => patch("general", { showVersion: v })} />
        <SaveBar sec="general" />
      </div>
    </div>
  );

  const renderContact = () => (
    <div style={cardStyle}>
      {secHeader("التواصل والمبيعات", "تُستخدم في صفحة الأسعار ورسائل الوصول للحد وطلبات الترقية/التجديد والفوتر.")}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={grid2} className="ss-grid2">
          <Txt label="رقم واتساب" value={c.whatsappNumber} onChange={(v) => patch("contact", { whatsappNumber: v })} dir="ltr" placeholder="9665xxxxxxxx" help="أرقام فقط بصيغة دولية بلا +." />
          <Txt label="رقم الهاتف" value={c.phone} onChange={(v) => patch("contact", { phone: v })} dir="ltr" />
          <Txt label="بريد الدعم" value={c.supportEmail} onChange={(v) => patch("contact", { supportEmail: v })} dir="ltr" />
          <Txt label="بريد المبيعات" value={c.salesEmail} onChange={(v) => patch("contact", { salesEmail: v })} dir="ltr" />
          <Txt label="ساعات العمل" value={c.businessHours} onChange={(v) => patch("contact", { businessHours: v })} />
          <Txt label="رابط التواصل" value={c.contactUrl} onChange={(v) => patch("contact", { contactUrl: v })} dir="ltr" />
          <Txt label="نص CTA الترقية" value={c.upgradeCtaText} onChange={(v) => patch("contact", { upgradeCtaText: v })} />
          <Txt label="نص CTA التجديد" value={c.renewalCtaText} onChange={(v) => patch("contact", { renewalCtaText: v })} />
          <Txt label="نص CTA الخطة المؤسسية" value={c.enterpriseCtaText} onChange={(v) => patch("contact", { enterpriseCtaText: v })} />
        </div>
        <Area label="نص رسالة الترقية (واتساب)" value={c.upgradeMessageText} onChange={(v) => patch("contact", { upgradeMessageText: v })} help="المتغير {plan} يُستبدل باسم الخطة تلقائيًا." />
        <Area label="نص رسالة التجديد (واتساب)" value={c.renewalMessageText} onChange={(v) => patch("contact", { renewalMessageText: v })} help="المتغيرات: {plan} و{email} و{endDate}." />
        <Txt label="نص مدة التفعيل" value={c.activationTimeText} onChange={(v) => patch("contact", { activationTimeText: v })} help="يظهر في صفحة الأسعار ونوافذ الترقية." />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px", background: "var(--slate-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
          <Bool label="إظهار واتساب" value={c.showWhatsapp} onChange={(v) => patch("contact", { showWhatsapp: v })} />
          <Bool label="إظهار البريد" value={c.showEmail} onChange={(v) => patch("contact", { showEmail: v })} />
          <Bool label="إظهار ساعات العمل" value={c.showBusinessHours} onChange={(v) => patch("contact", { showBusinessHours: v })} />
        </div>
        <SaveBar sec="contact" />
      </div>
    </div>
  );

  const renderBilling = () => (
    <div style={cardStyle}>
      {secHeader("إعدادات الفوترة", "بيانات المُصدِر، الضريبة، ترقيم الفواتير، وتعليمات الدفع — تُدار من صفحتها المتخصصة (لا تكرار للإعداد نفسه في مكانين).")}
      <Link href="/admin/billing/settings" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 18px", borderRadius: "var(--radius-pill)", background: "var(--primary)", color: "#fff", font: "var(--weight-semibold) 13px var(--font-sans)", textDecoration: "none" }}>
        <Icon name="receipt" size={15} color="#fff" /> فتح إعدادات الفوترة
      </Link>
      <p style={{ font: "12px/1.7 var(--font-sans)", color: "var(--text-subtle)", margin: "12px 0 0" }}>
        الفواتير الصادرة سابقًا تحتفظ ببياناتها (Snapshot) ولا تتأثر بأي تغيير هنا.
      </p>
    </div>
  );

  const renderNotifications = () => (
    <div style={cardStyle}>
      {secHeader("التذكيرات والإشعارات", "أيام تذكير انتهاء الاشتراك وقنواته — منع التكرار مضمون دائمًا في النواة.")}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, padding: "12px 14px", background: "var(--slate-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
          <Bool label="تذكير 30 يومًا" value={n.remind30Enabled} onChange={(v) => patch("notifications", { remind30Enabled: v })} />
          <Bool label="تذكير 14 يومًا" value={n.remind14Enabled} onChange={(v) => patch("notifications", { remind14Enabled: v })} />
          <Bool label="تذكير 7 أيام" value={n.remind7Enabled} onChange={(v) => patch("notifications", { remind7Enabled: v })} />
          <Bool label="تذكير 3 أيام" value={n.remind3Enabled} onChange={(v) => patch("notifications", { remind3Enabled: v })} />
          <Bool label="تذكير يوم واحد" value={n.remind1Enabled} onChange={(v) => patch("notifications", { remind1Enabled: v })} />
          <Bool label="تذكير يوم الانتهاء" value={n.remindExpiryDayEnabled} onChange={(v) => patch("notifications", { remindExpiryDayEnabled: v })} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Bool label="تذكير داخل النظام" value={n.inAppRemindersEnabled} onChange={(v) => patch("notifications", { inAppRemindersEnabled: v })} />
          <Bool label="تذكير بالبريد" value={n.emailRemindersEnabled} onChange={(v) => patch("notifications", { emailRemindersEnabled: v })} help="يعمل فقط مع تهيئة مزوّد البريد في متغيرات البيئة — البوابة الرئيسية تبقى هناك." />
          <Bool label="تنبيهات الأدمن" value={n.adminAlertsEnabled} onChange={(v) => patch("notifications", { adminAlertsEnabled: v })} />
          <Bool label="عدم التذكير عند وجود تجديد مجدول" value={n.suppressWhenScheduled} onChange={(v) => patch("notifications", { suppressWhenScheduled: v })} />
        </div>
        <Area label="نص تذكير العميل (اختياري)" value={n.customerReminderText} onChange={(v) => patch("notifications", { customerReminderText: v })} rows={2} help="فارغ = النص الافتراضي." />
        <Area label="نص انتهاء الاشتراك (اختياري)" value={n.expiryText} onChange={(v) => patch("notifications", { expiryText: v })} rows={2} />
        <Area label="نص تجديد الاشتراك (اختياري)" value={n.renewalText} onChange={(v) => patch("notifications", { renewalText: v })} rows={2} />
        <SaveBar sec="notifications" />
      </div>
    </div>
  );

  const renderDocuments = () => (
    <>
      <div style={cardStyle}>
        {secHeader("هوية المستند", "تظهر في ترويسة وتذييل BRD/SRS/التقرير — الوثائق السابقة المطبوعة لا تتأثر.")}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={grid2} className="ss-grid2">
            <Txt label="اسم الجهة في الوثيقة" value={d.issuerName} onChange={(v) => patch("documents", { issuerName: v })} placeholder="فارغ = اسم المنصة" />
            <Txt label="شعار المستند (URL)" value={d.docLogoUrl} onChange={(v) => patch("documents", { docLogoUrl: v })} dir="ltr" />
            <Txt label="سطر التواصل" value={d.contactLine} onChange={(v) => patch("documents", { contactLine: v })} />
            <Txt label="تصنيف الوثيقة" value={d.classification} onChange={(v) => patch("documents", { classification: v })} />
            <Txt label="رقم الإصدار الافتراضي" value={d.defaultDocVersion} onChange={(v) => patch("documents", { defaultDocVersion: v })} dir="ltr" />
          </div>
          <Area label="نص السرية (اختياري)" value={d.confidentialityText} onChange={(v) => patch("documents", { confidentialityText: v })} rows={2} help="يظهر أعلى الوثيقة عند تعبئته." />
          <Area label="نص التذييل (يستبدل خاتمة النوع)" value={d.footerTextOverride} onChange={(v) => patch("documents", { footerTextOverride: v })} rows={2} help="فارغ = الخاتمة الافتراضية لكل نوع وثيقة." />
        </div>
      </div>
      <div style={cardStyle}>
        {secHeader("عبارات النقص", "تُستخدم عندما لا تتوفر بيانات — يجب ألا توحي بوجود بيانات غير موجودة.")}
        <Warn>هذه العبارات جزء من ضمان «عدم اختراع البيانات» — غيّر الصياغة فقط، ولا تجعلها توحي بوجود معلومات لم تُدخل.</Warn>
        <div style={{ ...grid2, marginTop: 14 }} className="ss-grid2">
          <Txt label="عبارة «يحتاج استكمال»" value={d.needsInputText} onChange={(v) => patch("documents", { needsInputText: v })} />
          <Txt label="عبارة «غير متوفر»" value={d.notAvailableText} onChange={(v) => patch("documents", { notAvailableText: v })} />
          <Txt label="عبارة «لم يُحدد»" value={d.notDefinedText} onChange={(v) => patch("documents", { notDefinedText: v })} />
          <Txt label="عبارة الذكاء الاصطناعي" value={d.aiDisclosureText} onChange={(v) => patch("documents", { aiDisclosureText: v })} help="لا تُذكر أسماء نماذج أو مزودين." />
        </div>
      </div>
      <div style={cardStyle}>
        {secHeader("أقسام BRD", "إخفاء قسم جوهري قد يجعل الوثيقة ناقصة — استخدم بحذر.")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Bool label="الملخص التنفيذي" value={d.brd.executiveSummary} onChange={(v) => patch("documents", { brd: { ...d.brd, executiveSummary: v } })} />
          <Bool label="الأهداف" value={d.brd.goals} onChange={(v) => patch("documents", { brd: { ...d.brd, goals: v } })} />
          <Bool label="النطاق" value={d.brd.scope} onChange={(v) => patch("documents", { brd: { ...d.brd, scope: v } })} />
          <Bool label="خارج النطاق" value={d.brd.outOfScope} onChange={(v) => patch("documents", { brd: { ...d.brd, outOfScope: v } })} />
          <Bool label="أصحاب المصلحة" value={d.brd.stakeholders} onChange={(v) => patch("documents", { brd: { ...d.brd, stakeholders: v } })} />
          <Bool label="الافتراضات" value={d.brd.assumptions} onChange={(v) => patch("documents", { brd: { ...d.brd, assumptions: v } })} />
          <Bool label="المخاطر" value={d.brd.risks} onChange={(v) => patch("documents", { brd: { ...d.brd, risks: v } })} />
          <Bool label="جدول الموافقات" value={d.brd.approvalTable} onChange={(v) => patch("documents", { brd: { ...d.brd, approvalTable: v } })} />
          <Bool label="ضبط التغييرات" value={d.brd.changeLog} onChange={(v) => patch("documents", { brd: { ...d.brd, changeLog: v } })} />
        </div>
      </div>
      <div style={cardStyle}>
        {secHeader("أقسام SRS", "")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Bool label="النظرة العامة" value={d.srs.overview} onChange={(v) => patch("documents", { srs: { ...d.srs, overview: v } })} />
          <Bool label="البيئة" value={d.srs.environment} onChange={(v) => patch("documents", { srs: { ...d.srs, environment: v } })} />
          <Bool label="القيود" value={d.srs.constraints} onChange={(v) => patch("documents", { srs: { ...d.srs, constraints: v } })} />
          <Bool label="المتطلبات الوظيفية" value={d.srs.functional} onChange={(v) => patch("documents", { srs: { ...d.srs, functional: v } })} />
          <Bool label="غير الوظيفية" value={d.srs.nonFunctional} onChange={(v) => patch("documents", { srs: { ...d.srs, nonFunctional: v } })} />
          <Bool label="قواعد العمل" value={d.srs.businessRules} onChange={(v) => patch("documents", { srs: { ...d.srs, businessRules: v } })} />
          <Bool label="مصفوفة التتبع RTM" value={d.srs.rtm} onChange={(v) => patch("documents", { srs: { ...d.srs, rtm: v } })} />
          <Bool label="جدول الموافقات" value={d.srs.approvalTable} onChange={(v) => patch("documents", { srs: { ...d.srs, approvalTable: v } })} />
        </div>
      </div>
      <div style={cardStyle}>
        {secHeader("الطباعة", "")}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Bool label="إظهار الشعار" value={d.print.showLogo} onChange={(v) => patch("documents", { print: { ...d.print, showLogo: v } })} />
          <Bool label="إظهار التذييل" value={d.print.showFooter} onChange={(v) => patch("documents", { print: { ...d.print, showFooter: v } })} />
          <div style={{ font: "12px var(--font-sans)", color: "var(--text-subtle)" }}>حجم الصفحة: A4 (ثابت).</div>
        </div>
        <div style={{ marginTop: 16 }}><SaveBar sec="documents" /></div>
      </div>
    </>
  );

  const renderPlans = () => (
    <>
      <Warn>
        رموز الخطط (FREE / PRO / ENTERPRISE) ثابتة ولا تتغير. الحدود تخضع لسقوف صلبة في الكود:
        تحليلات ≤ {meta.ceilings.analysisLimitMax} · مشاريع ≤ {meta.ceilings.projectLimitMax}. limitOverride اليدوي للمستخدم يتقدم دائمًا.
      </Warn>
      {(["FREE", "PRO", "ENTERPRISE"] as const).map((code) => {
        const pl = p[code];
        const set = (partial: Partial<typeof pl>) => patch("plans", { [code]: { ...pl, ...partial } } as never);
        return (
          <div key={code} style={{ ...cardStyle, marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ font: "var(--weight-bold) 15px var(--font-sans)", color: "var(--text-strong)" }}>{pl.displayName}</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: "var(--slate-100)", color: "var(--text-muted)", font: "var(--weight-semibold) 11px var(--font-mono)", direction: "ltr" }}>{code}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={grid2} className="ss-grid2">
                <Txt label="الاسم المعروض" value={pl.displayName} onChange={(v) => set({ displayName: v })} />
                <Txt label="العنوان في صفحة الأسعار" value={pl.title} onChange={(v) => set({ title: v })} />
                <Txt label="السعر المعروض" value={pl.price} onChange={(v) => set({ price: v })} />
                <Txt label="ملاحظة السعر" value={pl.priceNote} onChange={(v) => set({ priceNote: v })} />
                <Txt label="السعر السنوي (اختياري)" value={pl.yearlyPrice} onChange={(v) => set({ yearlyPrice: v })} />
                <Txt label="نص CTA (اختياري)" value={pl.ctaText} onChange={(v) => set({ ctaText: v })} />
                <LimitField label="حد التحليلات الشهري" value={pl.analysisLimit} onChange={(v) => set({ analysisLimit: v })} max={meta.ceilings.analysisLimitMax} />
                <LimitField label="حد المشاريع" value={pl.projectLimit} onChange={(v) => set({ projectLimit: v })} max={meta.ceilings.projectLimitMax} />
              </div>
              <Area label="الوصف" value={pl.desc} onChange={(v) => set({ desc: v })} rows={2} />
              <Area label="المزايا (سطر لكل ميزة)" value={pl.features.join("\n")} onChange={(v) => set({ features: v.split("\n").map((x) => x.trim()).filter(Boolean) })} rows={5} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, padding: "12px 14px", background: "var(--slate-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <Bool label="ظاهرة في الأسعار" value={pl.visible} onChange={(v) => set({ visible: v })} />
                <Bool label="متاحة للترقية" value={pl.enabled} onChange={(v) => set({ enabled: v })} />
                <Bool label="الباقة الموصى بها" value={pl.recommended} onChange={(v) => set({ recommended: v })} />
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ ...cardStyle, marginTop: 14 }}>
        <SaveBar sec="plans" sensitive="تغيير إعدادات الخطط يؤثر على صفحة الأسعار وحدود الاستخدام للمشتركين الجدد والتجديدات. متابعة الحفظ؟" />
      </div>
    </>
  );

  const renderAssistant = () => (
    <>
      <Warn>
        هذه الإعدادات للأدمن فقط ولا تظهر للعملاء. حدود الرموز تخضع لسقف صلب في الكود
        ({meta.ceilings.assistantTaskTokensMax} للمهمة و{meta.ceilings.fullAnalysisTokensMax} للتحليل الكامل) — يمكن التخفيض، لا التجاوز.
        لا تُعرض أسماء مزودين أو نماذج في أي واجهة عامة.
      </Warn>
      <div style={{ ...cardStyle, marginTop: 14 }}>
        {secHeader("التفعيل حسب الخطة", "الحصة الذرية الشهرية تبقى كما هي — هذه بوابة إضافية فقط.")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          <Bool label="متاح للخطة المجانية" value={a.enabledForFree} onChange={(v) => patch("assistant", { enabledForFree: v })} />
          <Bool label="متاح للاحترافية" value={a.enabledForPro} onChange={(v) => patch("assistant", { enabledForPro: v })} />
          <Bool label="متاح للأعمال" value={a.enabledForEnterprise} onChange={(v) => patch("assistant", { enabledForEnterprise: v })} />
        </div>
        <div style={{ marginTop: 14, maxWidth: 320 }}>
          <Num label="حد رموز التحليل الكامل" value={a.fullAnalysisMaxTokens} onChange={(v) => patch("assistant", { fullAnalysisMaxTokens: v })} min={1000} max={meta.ceilings.fullAnalysisTokensMax} />
        </div>
      </div>
      {(Object.keys(a.tasks) as Array<keyof typeof a.tasks>).map((key) => {
        const t = a.tasks[key];
        const set = (partial: Partial<typeof t>) => patch("assistant", { tasks: { ...a.tasks, [key]: { ...t, ...partial } } });
        return (
          <div key={key} style={{ ...cardStyle, marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ font: "var(--weight-bold) 14px var(--font-sans)", color: "var(--text-strong)" }}>{t.label}</span>
              <span style={{ font: "11px var(--font-mono)", color: "var(--text-subtle)", direction: "ltr" }}>{key}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={grid2} className="ss-grid2">
                <Txt label="الاسم المعروض" value={t.label} onChange={(v) => set({ label: v })} />
                <Num label="حد رموز المخرجات" value={t.maxOutputTokens} onChange={(v) => set({ maxOutputTokens: v })} min={100} max={meta.ceilings.assistantTaskTokensMax} />
              </div>
              <Txt label="الوصف المعروض" value={t.description} onChange={(v) => set({ description: v })} />
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <Bool label="مفعلة" value={t.enabled} onChange={(v) => set({ enabled: v })} />
                <Bool label="تتطلب خطة مدفوعة" value={t.requiresPaidPlan} onChange={(v) => set({ requiresPaidPlan: v })} />
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ ...cardStyle, marginTop: 14 }}>
        <SaveBar sec="assistant" sensitive="تغيير إعدادات مساعد وثّق يؤثر على المهام المتاحة للعملاء. متابعة الحفظ؟" />
      </div>
    </>
  );

  const renderFeatures = () => (
    <div style={cardStyle}>
      {secHeader("خصائص النظام", "بوابات تشغيلية آمنة — الحمايات الأمنية والملكية والحصة الذرية غير قابلة للإيقاف من هنا.")}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Bool label="السماح بالتسجيل العام" value={f.publicRegistrationEnabled} onChange={(v) => patch("features", { publicRegistrationEnabled: v })} help="عند الإيقاف: صفحة التسجيل تعرض رسالة، وAPI التسجيل يرفض من الخادم." />
        <Bool label="وضع الصيانة" value={f.maintenanceMode} onChange={(v) => patch("features", { maintenanceMode: v })} help="يمنع الوصول لمساحة العمل لغير SUPER_ADMIN — تسجيل الدخول يبقى متاحًا." />
        <Area label="رسالة وضع الصيانة" value={f.maintenanceMessage} onChange={(v) => patch("features", { maintenanceMessage: v })} rows={2} />
        <Bool label="تفعيل Demo Mode" value={f.demoModeEnabled} onChange={(v) => patch("features", { demoModeEnabled: v })} />
        <Bool label="نظام الملاحظات" value={f.feedbackEnabled} onChange={(v) => patch("features", { feedbackEnabled: v })} />
        <Bool label="صفحات النماذج (Samples)" value={f.samplesEnabled} onChange={(v) => patch("features", { samplesEnabled: v })} />
        <Bool label="مساعد وثّق" value={f.assistantEnabled} onChange={(v) => patch("features", { assistantEnabled: v })} help="إيقافه يرفض مهام المساعد من الخادم — البيانات الحالية لا تتأثر." />
        <Bool label="تصدير الوثائق" value={f.documentExportEnabled} onChange={(v) => patch("features", { documentExportEnabled: v })} />
        <Bool label="نظام الفوترة" value={f.billingEnabled} onChange={(v) => patch("features", { billingEnabled: v })} />
        <Bool label="بريد الفوترة" value={f.billingEmailsEnabled} onChange={(v) => patch("features", { billingEmailsEnabled: v })} help="يعمل فقط مع BILLING_EMAIL_ENABLED ومزوّد بريد مهيأ في متغيرات البيئة." />
        <SaveBar sec="features" sensitive="تغيير خصائص النظام قد يؤثر على وصول العملاء لوظائف المنصة. متابعة الحفظ؟" />
      </div>
    </div>
  );

  /* سجل التغييرات */
  const [audit, setAudit] = React.useState<{ entries: Array<{ id: string; section: string; action: string; adminName: string; changedKeys: string[]; reason: string | null; createdAt: string }>; total: number } | null>(null);
  const [auditFilter, setAuditFilter] = React.useState("");
  React.useEffect(() => {
    if (active !== "audit") return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/settings/audit?section=${encodeURIComponent(auditFilter)}`);
        const j = await res.json();
        if (alive && j.ok) setAudit({ entries: j.entries, total: j.total });
      } catch { /* تجاهل */ }
    })();
    return () => { alive = false; };
  }, [active, auditFilter]);

  const SECTION_AR: Record<string, string> = {
    GENERAL: "المنصة", CONTACT: "التواصل", NOTIFICATIONS: "التذكيرات", DOCUMENTS: "الوثائق",
    PLANS: "الخطط", ASSISTANT: "المساعد", FEATURES: "الخصائص",
  };

  const renderAudit = () => (
    <div style={cardStyle}>
      {secHeader("سجل تغييرات الإعدادات", "كل تحديث: من عدّل، أي قسم، وأي حقول — القيم مقصوصة بأمان.")}
      <select value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)} style={{ ...inputStyle, width: 220, marginBottom: 14 }}>
        <option value="">كل الأقسام</option>
        {Object.entries(SECTION_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {!audit ? (
        <div style={{ padding: 20, textAlign: "center", color: "var(--text-subtle)", font: "13px var(--font-sans)" }}>جارٍ التحميل…</div>
      ) : audit.entries.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "var(--text-subtle)", font: "13px var(--font-sans)" }}>لا تغييرات مسجلة بعد.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {audit.entries.map((e) => (
            <div key={e.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "11px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ padding: "3px 10px", borderRadius: 999, background: "var(--teal-50)", color: "var(--teal-600)", font: "var(--weight-semibold) 11px var(--font-sans)" }}>{SECTION_AR[e.section] ?? e.section}</span>
                <span style={{ font: "var(--weight-semibold) 12.5px var(--font-sans)", color: "var(--text-strong)" }}>{e.adminName}</span>
                {e.action === "SETTINGS_RESET_TO_DEFAULT" && <span style={{ font: "11.5px var(--font-sans)", color: "var(--amber-600)" }}>استعادة الافتراضي</span>}
                <span style={{ marginInlineStart: "auto", font: "11.5px var(--font-sans)", color: "var(--text-subtle)" }}>{new Date(e.createdAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })}</span>
              </div>
              {e.changedKeys.length > 0 && (
                <div style={{ marginTop: 7, font: "11.5px/1.7 var(--font-mono)", color: "var(--text-muted)", direction: "ltr", textAlign: "end" }}>
                  {e.changedKeys.slice(0, 12).join(" · ")}{e.changedKeys.length > 12 ? ` … (+${e.changedKeys.length - 12})` : ""}
                </div>
              )}
              {e.reason && <div style={{ marginTop: 6, font: "12px/1.6 var(--font-sans)", color: "var(--text-muted)" }}>السبب: {e.reason}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const CONTENT: Record<string, () => React.ReactNode> = {
    general: renderGeneral, contact: renderContact, billing: renderBilling,
    notifications: renderNotifications, documents: renderDocuments, plans: renderPlans,
    assistant: renderAssistant, features: renderFeatures, audit: renderAudit,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <style>{`
        .ss-wrap { max-width: 1080px; margin: 0 auto; padding: 26px 20px 90px; }
        .ss-layout { display: grid; grid-template-columns: 250px 1fr; gap: 20px; align-items: start; }
        .ss-nav { position: sticky; top: 20px; display: flex; flex-direction: column; gap: 4px; }
        .ss-nav-select { display: none; }
        .ss-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 820px) {
          .ss-layout { grid-template-columns: 1fr; }
          .ss-nav { display: none; }
          .ss-nav-select { display: block; margin-bottom: 14px; }
          .ss-grid2 { grid-template-columns: 1fr; }
        }
      `}</style>
      <div className="ss-wrap">
        <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-medium) 13px var(--font-sans)", color: "var(--blue-600)", textDecoration: "none" }}>
          <Icon name="arrow-right" size={15} /> العودة إلى لوحة الأدمن
        </Link>
        <h1 style={{ font: "var(--weight-bold) 24px/1.3 var(--font-sans)", color: "var(--text-strong)", margin: "12px 0 6px" }}>إعدادات النظام</h1>
        <p style={{ font: "14px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 8px", maxWidth: 640 }}>
          إدارة القيم التشغيلية والتجارية للمنصة دون الحاجة إلى تعديل الكود.
        </p>
        <p style={{ font: "12px/1.6 var(--font-sans)", color: "var(--text-subtle)", margin: "0 0 22px" }}>
          {lastMeta.updatedAt
            ? <>آخر تحديث: {new Date(lastMeta.updatedAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })}{lastMeta.updatedByName ? ` · بواسطة ${lastMeta.updatedByName}` : ""}</>
            : "لم تُخصص إعدادات بعد — المنصة تعمل بالقيم الافتراضية الآمنة."}
          {" "}· الأسرار والمفاتيح تبقى في متغيرات البيئة ولا تُعرض هنا.
        </p>

        {/* اختيار الفئة على الجوال */}
        <select className="ss-nav-select" value={active} onChange={(e) => setActive(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
          {CATEGORIES.map((cat) => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
        </select>

        <div className="ss-layout">
          <nav className="ss-nav" aria-label="فئات الإعدادات">
            {CATEGORIES.map((cat) => {
              const activeCat = active === cat.key;
              const dirty = cat.key !== "billing" && cat.key !== "audit" && isDirty(cat.key as SettingsSection);
              return (
                <button
                  key={cat.key}
                  onClick={() => setActive(cat.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, textAlign: "start",
                    padding: "10px 13px", borderRadius: "var(--radius-md)", cursor: "pointer",
                    border: "1px solid " + (activeCat ? "var(--teal-300)" : "transparent"),
                    background: activeCat ? "var(--teal-50)" : "transparent",
                    font: `var(--weight-${activeCat ? "bold" : "medium"}) 13px var(--font-sans)`,
                    color: activeCat ? "var(--teal-700)" : "var(--text-strong)",
                  }}
                >
                  <Icon name={cat.icon} size={15} color={activeCat ? "var(--teal-600)" : "var(--text-subtle)"} />
                  <span style={{ flex: 1 }}>{cat.label}</span>
                  {dirty && <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--amber-500)" }} />}
                </button>
              );
            })}
          </nav>
          <main>{CONTENT[active]?.()}</main>
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

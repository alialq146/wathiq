"use client";

/**
 * واجهة «الحساب والاشتراك» (v2.0) — منطقة Billing احترافية بمستوى منصات
 * SaaS الحديثة: بطاقة اشتراك رئيسية، شريط مدة، استخدام، فواتير، وبيانات
 * فوترة اختيارية. RTL كامل، متجاوبة حتى 390px (الجدول يتحول لبطاقات).
 */

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ds";
import { saveBillingProfile, trackClientEvent, type BillingProfileInput } from "@/app/actions";
import { SUB_STATUS_AR, CYCLE_AR, INVOICE_STATUS_AR, PLAN_AR } from "@/lib/billing";

/* ---------------- types ---------------- */

interface SubscriptionView {
  plan: string; status: string; billingCycle: string;
  startDate: string; endDate: string; price: string; currency: string; autoRenew: boolean;
}
interface UsageView {
  analysisCount: number; analysisLimit: number | null; resetDate: string | null;
  projectCount: number; projectLimit: number | null;
}
interface InvoiceRow {
  id: string; invoiceNumber: string; status: string; issueDate: string;
  total: string; currency: string; periodStart: string | null; periodEnd: string | null;
}
interface ScheduledView { plan: string; startDate: string; endDate: string; billingCycle: string }
interface HistoryRow {
  id: string; plan: string; status: string; billingCycle: string;
  startDate: string; endDate: string; price: string; currency: string; isCurrent: boolean;
  invoiceId: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }) : "—";

const STATUS_UI: Record<string, { bg: string; fg: string }> = {
  ACTIVE: { bg: "var(--green-50)", fg: "var(--green-600)" },
  TRIAL: { bg: "var(--blue-50)", fg: "var(--blue-600)" },
  SCHEDULED: { bg: "var(--teal-50)", fg: "var(--teal-600)" },
  EXPIRED: { bg: "var(--red-50)", fg: "var(--red-600)" },
  CANCELED: { bg: "var(--slate-100)", fg: "var(--text-muted)" },
  SUSPENDED: { bg: "var(--amber-50)", fg: "var(--amber-600)" },
  SUPERSEDED: { bg: "var(--slate-100)", fg: "var(--text-muted)" },
};
const INV_UI: Record<string, { bg: string; fg: string }> = {
  PAID: { bg: "var(--green-50)", fg: "var(--green-600)" },
  PENDING: { bg: "var(--amber-50)", fg: "var(--amber-600)" },
  OVERDUE: { bg: "var(--red-50)", fg: "var(--red-600)" },
  DRAFT: { bg: "var(--slate-100)", fg: "var(--text-muted)" },
  CANCELED: { bg: "var(--slate-100)", fg: "var(--text-muted)" },
  REFUNDED: { bg: "var(--violet-50)", fg: "var(--violet-500)" },
};

const badge = (label: string, ui: { bg: string; fg: string }) => (
  <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: "var(--radius-pill)", background: ui.bg, color: ui.fg, font: "var(--weight-semibold) 12.5px/1 var(--font-sans)" }}>
    {label}
  </span>
);

const cardStyle: React.CSSProperties = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-xl)",
  padding: "22px 24px",
};

const secTitle = (icon: string, title: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
    <Icon name={icon} size={17} color="var(--teal-600)" />
    <h2 style={{ font: "var(--weight-bold) 16px/1.3 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>{title}</h2>
  </div>
);

/* ---------------- component ---------------- */

export function BillingClient({
  user,
  subscription,
  scheduled,
  history,
  usage,
  invoices,
  profile,
}: {
  user: { name: string; email: string; plan: string; planName: string };
  subscription: SubscriptionView | null;
  scheduled: ScheduledView | null;
  history: HistoryRow[];
  usage: UsageView;
  invoices: InvoiceRow[];
  profile: Record<keyof BillingProfileInput, string>;
}) {
  const [form, setForm] = React.useState(profile);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const now = Date.now();
  const end = subscription ? new Date(subscription.endDate).getTime() : null;
  const start = subscription ? new Date(subscription.startDate).getTime() : null;
  const remaining = end != null ? Math.ceil((end - now) / DAY_MS) : null;
  const active = subscription?.status === "ACTIVE";
  const expired = subscription?.status === "EXPIRED" || (active && remaining != null && remaining <= 0);
  const pct = start != null && end != null && end > start ? Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100))) : 0;

  // نبرة التنبيه حسب المتبقي: عادي > 7 أيام، أصفر ≤ 7، أوضح ≤ 3، أحمر عند الانتهاء.
  const tone = expired
    ? { bg: "var(--red-50)", border: "var(--red-100)", fg: "var(--red-600)", bar: "var(--red-500)" }
    : remaining != null && remaining <= 3
      ? { bg: "var(--amber-50)", border: "var(--amber-100)", fg: "var(--amber-600)", bar: "var(--amber-500)" }
      : remaining != null && remaining <= 7
        ? { bg: "var(--amber-50)", border: "var(--border-subtle)", fg: "var(--amber-600)", bar: "var(--amber-500)" }
        : { bg: "transparent", border: "var(--border-subtle)", fg: "var(--text-muted)", bar: "var(--teal-500)" };

  const renewMsg = [
    "مرحبًا، أرغب في تجديد اشتراكي في منصة وثّق.",
    `الخطة الحالية: ${PLAN_AR[user.plan] ?? user.plan}`,
    `البريد المسجل: ${user.email}`,
    subscription ? `تاريخ انتهاء الاشتراك: ${fmtDate(subscription.endDate)}` : "",
    "ملاحظات: ",
  ].filter(Boolean).join("\n");
  const renewHref = "https://wa.me/966531800106?text=" + encodeURIComponent(renewMsg);

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    const res = await saveBillingProfile(form);
    setSaving(false);
    showToast(res.ok ? "تم حفظ بيانات الفوترة بنجاح." : "تعذر الحفظ الآن. حاول مرة أخرى.");
  };

  const usagePct = usage.analysisLimit ? Math.min(100, Math.round((usage.analysisCount / usage.analysisLimit) * 100)) : 0;
  const usageTone = usagePct >= 100 ? "var(--red-500)" : usagePct >= 80 ? "var(--amber-500)" : "var(--teal-500)";

  const input = (key: keyof BillingProfileInput, label: string, placeholder: string, dir?: "ltr") => (
    <div key={key}>
      <label htmlFor={`bp-${key}`} style={{ display: "block", font: "var(--weight-semibold) 12.5px/1 var(--font-sans)", color: "var(--text-strong)", marginBottom: 7 }}>
        {label}
      </label>
      <input
        id={`bp-${key}`}
        value={form[key] ?? ""}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        style={{
          width: "100%", height: 38, padding: "0 12px", borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)", background: "var(--surface-card)",
          font: "13.5px var(--font-sans)", color: "var(--text-strong)", outline: "none",
          direction: dir, textAlign: dir === "ltr" ? "left" : undefined,
        }}
      />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <style>{`
        .bl-wrap { max-width: 980px; margin: 0 auto; padding: 28px 20px 80px; }
        .bl-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .bl-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; }
        .bl-profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .bl-inv-table { width: 100%; border-collapse: collapse; }
        .bl-inv-table th { text-align: start; font: var(--weight-semibold) 12px/1 var(--font-sans); color: var(--text-subtle); padding: 10px 12px; border-bottom: 1px solid var(--border-default); white-space: nowrap; }
        .bl-inv-table td { font: 13px/1.5 var(--font-sans); color: var(--text-strong); padding: 12px; border-bottom: 1px solid var(--border-subtle); }
        .bl-inv-cards { display: none; }
        a.bl-btn:focus-visible, button.bl-btn:focus-visible { outline: 2px solid var(--blue-500); outline-offset: 2px; }
        @media (max-width: 700px) {
          .bl-grid2, .bl-profile-grid { grid-template-columns: 1fr; }
          .bl-inv-table { display: none; }
          .bl-inv-cards { display: flex; flex-direction: column; gap: 12px; }
        }
      `}</style>

      <div className="bl-wrap">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-medium) 13px var(--font-sans)", color: "var(--blue-600)", textDecoration: "none" }}>
            <Icon name="arrow-right" size={15} /> العودة إلى مساحة العمل
          </Link>
        </div>
        <h1 style={{ font: "var(--weight-bold) 24px/1.3 var(--font-sans)", color: "var(--text-strong)", margin: "10px 0 6px" }}>
          الحساب والاشتراك
        </h1>
        <p style={{ font: "14px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 26px", maxWidth: 560 }}>
          إدارة خطتك الحالية، متابعة الاستخدام، والاطلاع على الفواتير وسجل المدفوعات.
        </p>

        {/* ===== بطاقة الاشتراك ===== */}
        <div style={{ ...cardStyle, marginBottom: 16, background: "linear-gradient(165deg, var(--surface-card), var(--teal-50))" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
            <span style={{ width: 46, height: 46, borderRadius: "var(--radius-lg)", background: "var(--teal-100)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 46px" }}>
              <Icon name="gem" size={22} color="var(--teal-600)" />
            </span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ font: "var(--weight-bold) 19px/1.2 var(--font-sans)", color: "var(--text-strong)" }}>
                  الخطة {PLAN_AR[user.plan] ?? user.planName}
                </span>
                {subscription
                  ? badge(SUB_STATUS_AR[subscription.status] ?? subscription.status, STATUS_UI[subscription.status] ?? STATUS_UI.ACTIVE)
                  : badge("بدون اشتراك مسجل", { bg: "var(--slate-100)", fg: "var(--text-muted)" })}
              </div>
              <div style={{ font: "12.5px/1.6 var(--font-sans)", color: "var(--text-muted)", marginTop: 5 }}>
                التجديد التلقائي: غير مفعل حاليًا — التجديد يتم بالتواصل المباشر.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                className="bl-btn"
                href={renewHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void trackClientEvent("renewal_clicked", { from: "billing_page" })}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 18px", borderRadius: "var(--radius-pill)", background: "var(--primary)", color: "#fff", font: "var(--weight-semibold) 13.5px var(--font-sans)", textDecoration: "none" }}
              >
                <Icon name="rotate-cw" size={15} color="#fff" /> طلب التجديد
              </a>
              <a
                className="bl-btn"
                href="/pricing"
                onClick={() => void trackClientEvent("upgrade_clicked", { from: "billing_page" })}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 18px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-strong)", font: "var(--weight-semibold) 13.5px var(--font-sans)", textDecoration: "none" }}
              >
                عرض الباقات
              </a>
            </div>
          </div>

          {subscription && (
            <>
              <div className="bl-facts" style={{ marginTop: 20 }}>
                {[
                  ["تاريخ البداية", fmtDate(subscription.startDate)],
                  ["تاريخ الانتهاء", fmtDate(subscription.endDate)],
                  ["الأيام المتبقية", expired ? "انتهى" : `${Math.max(0, remaining ?? 0)} يومًا`],
                  ["دورة الفوترة", CYCLE_AR[subscription.billingCycle] ?? subscription.billingCycle],
                  ["قيمة الاشتراك", `${subscription.price} ${subscription.currency === "SAR" ? "ريال" : subscription.currency}`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ font: "var(--weight-medium) 11.5px/1 var(--font-sans)", color: "var(--text-subtle)", marginBottom: 6 }}>{k}</div>
                    <div style={{ font: "var(--weight-semibold) 14px/1.3 var(--font-sans)", color: "var(--text-strong)" }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* شريط المدة */}
              <div style={{ marginTop: 18 }}>
                <div style={{ height: 8, borderRadius: 999, background: "var(--slate-100)", overflow: "hidden" }}>
                  <div style={{ width: `${expired ? 100 : pct}%`, height: "100%", borderRadius: 999, background: tone.bar, transition: "width var(--dur-base)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", font: "11px var(--font-sans)", color: "var(--text-subtle)", marginTop: 6 }}>
                  <span>{fmtDate(subscription.startDate)}</span>
                  <span>{fmtDate(subscription.endDate)}</span>
                </div>
              </div>

              {/* تجديد مجدول — يحل محل تحذير الانتهاء (UX: العميل جدّد أصلًا) */}
              {scheduled ? (
                <div role="status" style={{ marginTop: 14, padding: "12px 15px", borderRadius: "var(--radius-md)", background: "var(--teal-50)", border: "1px solid var(--teal-100)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Icon name="calendar-check" size={16} color="var(--teal-600)" style={{ marginTop: 1 }} />
                  <span style={{ font: "13px/1.7 var(--font-sans)", color: "var(--text-strong)" }}>
                    تم تسجيل تجديدك (الخطة {PLAN_AR[scheduled.plan] ?? scheduled.plan}) وسيبدأ تلقائيًا بعد انتهاء الفترة الحالية بتاريخ {fmtDate(scheduled.startDate)}.
                  </span>
                </div>
              ) : (
                (expired || (active && remaining != null && remaining <= 7)) && (
                  <div role="status" style={{ marginTop: 14, padding: "12px 15px", borderRadius: "var(--radius-md)", background: tone.bg, border: `1px solid ${tone.border}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Icon name={expired ? "alert-circle" : "clock"} size={16} color={tone.fg} style={{ marginTop: 1 }} />
                    <span style={{ font: "13px/1.7 var(--font-sans)", color: "var(--text-strong)" }}>
                      {expired
                        ? `انتهى اشتراكك بتاريخ ${fmtDate(subscription.endDate)}. تواصل معنا لتجديد الخطة — بياناتك محفوظة كما هي.`
                        : remaining === 1
                          ? "ينتهي اشتراكك غدًا. يمكنك التواصل معنا للتجديد دون انقطاع."
                          : remaining != null && remaining <= 3
                            ? `تبقى ${remaining} أيام على انتهاء اشتراكك. يمكنك التواصل معنا للتجديد دون انقطاع.`
                            : `ينتهي اشتراكك بتاريخ ${fmtDate(subscription.endDate)}. يمكنك التواصل معنا للتجديد قبل توقف مزايا الخطة.`}
                    </span>
                  </div>
                )
              )}
            </>
          )}

          {!subscription && (
            <p style={{ font: "13px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "16px 0 0" }}>
              أنت على الخطة {PLAN_AR[user.plan] ?? user.planName} حاليًا. عند الاشتراك في خطة مدفوعة ستظهر تفاصيل الاشتراك
              والفواتير هنا.
            </p>
          )}
        </div>

        {/* ===== الاستخدام ===== */}
        <div className="bl-grid2" style={{ marginBottom: 16 }}>
          <div style={cardStyle}>
            {secTitle("gauge", "تحليلات هذا الشهر")}
            <div style={{ font: "var(--weight-bold) 26px/1 var(--font-sans)", color: "var(--text-strong)" }}>
              {usage.analysisCount}
              <span style={{ font: "var(--weight-medium) 14px var(--font-sans)", color: "var(--text-subtle)" }}>
                {" "}من {usage.analysisLimit ?? "غير محدود"}
              </span>
            </div>
            {usage.analysisLimit != null && (
              <div style={{ height: 8, borderRadius: 999, background: "var(--slate-100)", overflow: "hidden", marginTop: 12 }}>
                <div style={{ width: `${usagePct}%`, height: "100%", borderRadius: 999, background: usageTone }} />
              </div>
            )}
            <div style={{ font: "12px/1.6 var(--font-sans)", color: "var(--text-subtle)", marginTop: 10 }}>
              {usagePct >= 100
                ? "وصلت إلى حد التحليلات في خطتك الحالية."
                : usage.resetDate
                  ? `يُعاد تعيين العدّاد بتاريخ ${fmtDate(usage.resetDate)}.`
                  : "يُعاد تعيين العدّاد شهريًا."}
            </div>
          </div>
          <div style={cardStyle}>
            {secTitle("folder", "المشاريع")}
            <div style={{ font: "var(--weight-bold) 26px/1 var(--font-sans)", color: "var(--text-strong)" }}>
              {usage.projectCount}
              <span style={{ font: "var(--weight-medium) 14px var(--font-sans)", color: "var(--text-subtle)" }}>
                {" "}من {usage.projectLimit ?? "غير محدود"}
              </span>
            </div>
            <div style={{ font: "12px/1.6 var(--font-sans)", color: "var(--text-subtle)", marginTop: 10 }}>
              {usage.projectLimit != null && usage.projectCount >= usage.projectLimit
                ? "وصلت إلى حد المشاريع — الترقية تتيح مشاريع متعددة."
                : "مساحة عملك تتسع لمشاريعك الحالية."}
            </div>
          </div>
        </div>

        {/* ===== سجل الاشتراكات ===== */}
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          {secTitle("history", "سجل الاشتراكات")}
          {history.length <= 1 ? (
            <p style={{ font: "13px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
              سيظهر هنا سجل الفترات السابقة عند التجديد أو تغيير الخطة.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {history.map((h) => (
                <div
                  key={h.id}
                  style={{
                    border: h.isCurrent ? "1.5px solid var(--teal-300)" : "1px solid var(--border-subtle)",
                    background: h.isCurrent ? "var(--teal-50)" : "var(--surface-card)",
                    borderRadius: "var(--radius-lg)",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      <span style={{ font: "var(--weight-bold) 14.5px/1.2 var(--font-sans)", color: "var(--text-strong)" }}>
                        الخطة {PLAN_AR[h.plan] ?? h.plan}
                      </span>
                      {badge(SUB_STATUS_AR[h.status] ?? h.status, STATUS_UI[h.status] ?? STATUS_UI.CANCELED)}
                      {h.isCurrent && badge("الحالية", { bg: "var(--teal-100)", fg: "var(--teal-700)" })}
                    </div>
                    <span style={{ font: "var(--weight-semibold) 13.5px var(--font-sans)", color: "var(--text-strong)", whiteSpace: "nowrap" }}>
                      {h.price} {h.currency === "SAR" ? "ريال" : h.currency}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", marginTop: 9, font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
                    <span>من {fmtDate(h.startDate)} إلى {fmtDate(h.endDate)}</span>
                    <span>دورة الفوترة: {CYCLE_AR[h.billingCycle] ?? h.billingCycle}</span>
                    {h.invoiceId && (
                      <Link href={`/account/billing/invoices/${h.invoiceId}`} style={{ font: "var(--weight-semibold) 12px var(--font-sans)", color: "var(--blue-600)", textDecoration: "none" }}>
                        عرض الفاتورة
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== الفواتير ===== */}
        <div style={{ ...cardStyle, marginBottom: 16, padding: 0 }}>
          <div style={{ padding: "20px 24px 0" }}>{secTitle("receipt", "الفواتير")}</div>
          {invoices.length === 0 ? (
            <div style={{ padding: "16px 24px 40px", textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>🧾</div>
              <div style={{ font: "var(--weight-bold) 15px/1.4 var(--font-sans)", color: "var(--text-strong)", marginBottom: 6 }}>
                لا توجد فواتير حتى الآن
              </div>
              <p style={{ font: "13px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
                ستظهر هنا فواتير الاشتراك والمدفوعات المرتبطة بحسابك.
              </p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto", padding: "0 8px 8px" }}>
                <table className="bl-inv-table">
                  <thead>
                    <tr>
                      <th>رقم الفاتورة</th>
                      <th>تاريخ الإصدار</th>
                      <th>فترة الاشتراك</th>
                      <th>المبلغ</th>
                      <th>الحالة</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ direction: "ltr", textAlign: "end", font: "12.5px var(--font-mono)" }}>{inv.invoiceNumber}</td>
                        <td>{fmtDate(inv.issueDate)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {inv.periodStart ? `${fmtDate(inv.periodStart)} — ${fmtDate(inv.periodEnd)}` : "—"}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>{inv.total} {inv.currency === "SAR" ? "ريال" : inv.currency}</td>
                        <td>{badge(INVOICE_STATUS_AR[inv.status] ?? inv.status, INV_UI[inv.status] ?? INV_UI.PENDING)}</td>
                        <td>
                          <Link href={`/account/billing/invoices/${inv.id}`} style={{ font: "var(--weight-semibold) 12.5px var(--font-sans)", color: "var(--blue-600)", textDecoration: "none" }}>
                            عرض الفاتورة
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* بطاقات الجوال */}
              <div className="bl-inv-cards" style={{ padding: "0 16px 16px" }}>
                {invoices.map((inv) => (
                  <Link key={inv.id} href={`/account/billing/invoices/${inv.id}`} style={{ textDecoration: "none", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 16px", display: "block" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ font: "12.5px var(--font-mono)", color: "var(--blue-700)", direction: "ltr" }}>{inv.invoiceNumber}</span>
                      {badge(INVOICE_STATUS_AR[inv.status] ?? inv.status, INV_UI[inv.status] ?? INV_UI.PENDING)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, font: "13px var(--font-sans)", color: "var(--text-strong)" }}>
                      <span>{fmtDate(inv.issueDate)}</span>
                      <b>{inv.total} {inv.currency === "SAR" ? "ريال" : inv.currency}</b>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ===== بيانات الفوترة ===== */}
        <div style={cardStyle}>
          {secTitle("building-2", "بيانات الفوترة")}
          <p style={{ font: "12.5px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 16px" }}>
            اختيارية بالكامل — تُستخدم هذه البيانات عند إصدار الفواتير المستقبلية.
          </p>
          <div className="bl-profile-grid">
            {input("legalName", "الاسم أو اسم الجهة", "مثال: شركة وثّق للحلول الرقمية")}
            {input("organizationName", "اسم المنشأة (اختياري)", "مثال: مؤسسة النجاح التجارية")}
            {input("billingEmail", "بريد الفوترة", "مثال: billing@example.com", "ltr")}
            {input("phone", "رقم الجوال", "مثال: 9665xxxxxxx", "ltr")}
            {input("city", "المدينة", "مثال: الرياض")}
            {input("country", "الدولة", "مثال: المملكة العربية السعودية")}
            {input("address", "العنوان", "مثال: حي العليا، طريق الملك فهد")}
            {input("taxNumber", "الرقم الضريبي (اختياري)", "مثال: 3xxxxxxxxxxxxxx", "ltr")}
            {input("commercialRegistration", "السجل التجاري (اختياري)", "مثال: 1010xxxxxx", "ltr")}
          </div>
          <div style={{ marginTop: 18 }}>
            <button
              className="bl-btn"
              onClick={saveProfile}
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 20px", borderRadius: "var(--radius-pill)", border: "none", background: "var(--primary)", color: "#fff", font: "var(--weight-semibold) 13.5px var(--font-sans)", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              <Icon name="save" size={15} color="#fff" /> {saving ? "جارٍ الحفظ…" : "حفظ بيانات الفوترة"}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div role="status" style={{ position: "fixed", bottom: 22, insetInlineStart: "50%", transform: "translateX(50%)", zIndex: 70, display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: "var(--radius-pill)", background: "var(--navy-900)", color: "#fff", font: "var(--weight-medium) 13px/1 var(--font-sans)", boxShadow: "var(--shadow-lg)", maxWidth: "calc(100vw - 40px)" }}>
          <Icon name="check-circle" size={15} color="var(--green-500)" />
          {toast}
        </div>
      )}
    </div>
  );
}

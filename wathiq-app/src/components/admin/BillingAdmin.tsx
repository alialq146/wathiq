"use client";

/**
 * لوحة «الاشتراكات والفواتير» في الأدمن (v2.0):
 * بطاقات مالية (+MRR بتنويه صريح)، تنبيهات قابلة للضغط، جداول الاشتراكات
 * والفواتير والمدفوعات، ونافذة التجديد اليدوي الذري (نقدي/تحويل بنكي).
 * كل استدعاء يمر عبر Admin APIs المحمية بـ SUPER_ADMIN في الخادم.
 */

import React from "react";
import { SUB_STATUS_AR, CYCLE_AR, INVOICE_STATUS_AR, PAY_METHOD_AR, PLAN_AR } from "@/lib/billing";

const num = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US"));
const when = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
};
const dateOnly = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }) : "—");

/* ---- primitives (متسقة مع AdminClient) ---- */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: 16, ...style }}>{children}</div>;
}
function Kpi({ label, value, sub, accent, onClick }: { label: string; value: string; sub?: string; accent?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "14px 16px", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ font: "var(--weight-medium) 11.5px/1 var(--font-sans)", color: "var(--text-subtle)", marginBottom: 8 }}>{label}</div>
      <div style={{ font: "var(--weight-bold) 22px/1 var(--font-sans)", color: accent ?? "var(--text-strong)" }}>{value}</div>
      {sub && <div style={{ font: "11px/1.5 var(--font-sans)", color: "var(--text-subtle)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}
function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 999, background: bg, color: fg, font: "var(--weight-semibold) 11.5px/1.4 var(--font-sans)", whiteSpace: "nowrap" }}>{label}</span>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ font: "var(--weight-bold) 14px/1 var(--font-sans)", color: "var(--text-strong)", marginBottom: 12 }}>{children}</div>;
}
function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text-subtle)", font: "13px var(--font-sans)" }}>{text}</div>;
}
const btn = (tone: "primary" | "ghost" | "danger" = "ghost"): React.CSSProperties => ({
  padding: "6px 12px", borderRadius: "var(--radius-md)", cursor: "pointer",
  font: "var(--weight-medium) 12.5px var(--font-sans)",
  border: `1px solid ${tone === "primary" ? "var(--blue-600)" : tone === "danger" ? "var(--red-100)" : "var(--border-default)"}`,
  background: tone === "primary" ? "var(--blue-600)" : tone === "danger" ? "var(--red-50)" : "var(--surface-card)",
  color: tone === "primary" ? "#fff" : tone === "danger" ? "var(--red-600)" : "var(--text-strong)",
});
const sel: React.CSSProperties = { height: 32, padding: "0 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--surface-card)", font: "12.5px var(--font-sans)", color: "var(--text-strong)" };
const inp: React.CSSProperties = { height: 34, padding: "0 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--surface-card)", font: "13px var(--font-sans)", color: "var(--text-strong)", width: "100%" };

const SUB_UI: Record<string, { bg: string; fg: string }> = {
  ACTIVE: { bg: "var(--green-50)", fg: "var(--green-600)" },
  TRIAL: { bg: "var(--blue-50)", fg: "var(--blue-600)" },
  EXPIRED: { bg: "var(--red-50)", fg: "var(--red-600)" },
  CANCELED: { bg: "var(--slate-100)", fg: "var(--text-muted)" },
  SUSPENDED: { bg: "var(--amber-50)", fg: "var(--amber-600)" },
};
const INV_UI: Record<string, { bg: string; fg: string }> = {
  PAID: { bg: "var(--green-50)", fg: "var(--green-600)" },
  PENDING: { bg: "var(--amber-50)", fg: "var(--amber-600)" },
  OVERDUE: { bg: "var(--red-50)", fg: "var(--red-600)" },
  DRAFT: { bg: "var(--slate-100)", fg: "var(--text-muted)" },
  CANCELED: { bg: "var(--slate-100)", fg: "var(--text-muted)" },
  REFUNDED: { bg: "var(--violet-50)", fg: "var(--violet-500)" },
};

/* ---- types ---- */
interface SubRow { id: string; userId: string; name: string; email: string; plan: string; status: string; billingCycle: string; startDate: string; endDate: string; daysLeft: number; price: string; currency: string }
interface InvRow { id: string; invoiceNumber: string; userId: string; name: string; email: string; status: string; issueDate: string; dueDate: string | null; total: string; currency: string; periodStart: string | null; periodEnd: string | null; internalNote: string | null }
interface PayRow { id: string; userId: string; name: string; email: string; amount: string; currency: string; method: string; status: string; paidAt: string; referenceNumber: string | null; invoiceId: string | null }
interface BillingData {
  kpis: { activeCount: number; expiring7: number; expiring30: number; expiredCount: number; paidCount: number; pendingCount: number; overdueCount: number; paymentsTotal: string; paymentsCount: number; mrr: string; mrrExcludedCustom: number };
  subscriptions: SubRow[];
  invoices: InvRow[];
  payments: PayRow[];
}

/* ================= نافذة التجديد اليدوي ================= */

function RenewalDialog({
  target,
  onClose,
  onDone,
}: {
  target: { userId: string; name: string; email: string; plan?: string; endDate?: string | null };
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  // القاعدة المعروضة بوضوح: اشتراك نشط بنهاية مستقبلية → البداية من اليوم
  // التالي للنهاية؛ منتهي/بدون اشتراك → من اليوم (والأدمن يعدّل كما يشاء).
  const suggestedStart = (() => {
    if (target.endDate) {
      const e = new Date(target.endDate);
      if (e.getTime() > Date.now()) {
        const next = new Date(e.getTime() + 86400_000);
        return next.toISOString().slice(0, 10);
      }
    }
    return today;
  })();
  const addMonths = (iso: string, m: number) => {
    const d = new Date(iso);
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
  };

  const [plan, setPlan] = React.useState(target.plan === "ENTERPRISE" ? "ENTERPRISE" : "PRO");
  const [cycle, setCycle] = React.useState("MONTHLY");
  const [start, setStart] = React.useState(suggestedStart);
  const [end, setEnd] = React.useState(addMonths(suggestedStart, 1));
  const [price, setPrice] = React.useState(target.plan === "ENTERPRISE" ? "" : "149");
  const [method, setMethod] = React.useState("CASH");
  const [paidAt, setPaidAt] = React.useState(today);
  const [refNo, setRefNo] = React.useState("");
  const [note, setNote] = React.useState("");
  const [createInvoice, setCreateInvoice] = React.useState(true);
  const [markPaid, setMarkPaid] = React.useState(true);
  const [resetUsage, setResetUsage] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const applyCycle = (c: string, s = start) => {
    setCycle(c);
    if (c === "MONTHLY") setEnd(addMonths(s, 1));
    else if (c === "YEARLY") setEnd(addMonths(s, 12));
  };

  const submit = async () => {
    if (busy) return;
    setErr(null);
    if (!price.trim() || isNaN(Number(price)) || Number(price) < 0) return setErr("أدخل مبلغًا صحيحًا.");
    if (new Date(end).getTime() <= new Date(start).getTime()) return setErr("تاريخ النهاية يجب أن يكون بعد البداية.");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: target.userId, plan, billingCycle: cycle,
          startDate: start, endDate: end, price: Number(price),
          paymentMethod: method, paidAt, referenceNumber: refNo, internalNote: note,
          createInvoice, markInvoicePaid: markPaid, resetUsage,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "failed");
      onDone(j.invoiceNumber ? `تم التجديد وإصدار الفاتورة ${j.invoiceNumber}.` : "تم تجديد الاشتراك بنجاح.");
      onClose();
    } catch (e) {
      setErr(e instanceof Error && e.message === "end-before-start" ? "تاريخ النهاية قبل البداية." : "تعذر تنفيذ العملية. راجع البيانات وحاول مجددًا.");
    } finally {
      setBusy(false);
    }
  };

  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const lbl: React.CSSProperties = { display: "block", font: "var(--weight-semibold) 12px/1 var(--font-sans)", color: "var(--text-strong)", marginBottom: 6 };
  const check = (checked: boolean, set: (v: boolean) => void, label: string) => (
    <label style={{ display: "flex", alignItems: "center", gap: 8, font: "12.5px var(--font-sans)", color: "var(--text-strong)", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--surface-overlay)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", zIndex: 80, overflowY: "auto" }} onClick={onClose}>
      <div role="dialog" aria-label="تجديد الاشتراك" style={{ width: "100%", maxWidth: 620, background: "var(--surface-card)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ font: "var(--weight-bold) 15px/1.3 var(--font-sans)", color: "var(--text-strong)" }}>تجديد / تفعيل الاشتراك</div>
          <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-subtle)", marginTop: 3 }}>
            {target.name} · <span style={{ direction: "ltr", display: "inline-block" }}>{target.email}</span>
          </div>
        </div>
        <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={row}>
            <div>
              <label style={lbl}>الخطة</label>
              <select style={{ ...sel, width: "100%" }} value={plan} onChange={(e) => setPlan(e.target.value)}>
                <option value="PRO">الاحترافية (PRO)</option>
                <option value="ENTERPRISE">الأعمال (ENTERPRISE)</option>
                <option value="FREE">الأساسية (FREE)</option>
              </select>
            </div>
            <div>
              <label style={lbl}>مدة التجديد</label>
              <select style={{ ...sel, width: "100%" }} value={cycle} onChange={(e) => applyCycle(e.target.value)}>
                <option value="MONTHLY">شهر</option>
                <option value="YEARLY">سنة</option>
                <option value="CUSTOM">مدة مخصصة</option>
              </select>
            </div>
          </div>
          <div style={row}>
            <div>
              <label style={lbl}>تاريخ البداية</label>
              <input type="date" style={inp} value={start} onChange={(e) => { setStart(e.target.value); if (cycle !== "CUSTOM") applyCycle(cycle, e.target.value); }} />
              {target.endDate && new Date(target.endDate).getTime() > Date.now() && (
                <div style={{ font: "11px/1.5 var(--font-sans)", color: "var(--text-subtle)", marginTop: 4 }}>
                  الاشتراك الحالي نشط حتى {dateOnly(target.endDate)} — البداية المقترحة من اليوم التالي.
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>تاريخ النهاية</label>
              <input type="date" style={inp} value={end} onChange={(e) => { setEnd(e.target.value); setCycle("CUSTOM"); }} />
            </div>
          </div>
          <div style={row}>
            <div>
              <label style={lbl}>المبلغ المستلم (ريال)</label>
              <input style={{ ...inp, direction: "ltr", textAlign: "left" }} inputMode="decimal" placeholder="149" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>طريقة الدفع</label>
              <select style={{ ...sel, width: "100%" }} value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="CASH">نقدي</option>
                <option value="BANK_TRANSFER">تحويل بنكي</option>
                <option value="MANUAL">دفع يدوي</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>
          </div>
          <div style={row}>
            <div>
              <label style={lbl}>تاريخ الدفع</label>
              <input type="date" style={inp} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>رقم مرجعي (اختياري)</label>
              <input style={{ ...inp, direction: "ltr", textAlign: "left" }} placeholder={method === "BANK_TRANSFER" ? "رقم الحوالة" : "—"} value={refNo} onChange={(e) => setRefNo(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={lbl}>ملاحظة داخلية (لا تظهر للعميل)</label>
            <textarea rows={2} style={{ ...inp, height: "auto", padding: "8px 10px" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: استلم المبلغ نقدًا في المكتب." />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", background: "var(--slate-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            {check(createInvoice, setCreateInvoice, "إنشاء فاتورة لهذه العملية")}
            {createInvoice && check(markPaid, setMarkPaid, "جعل الفاتورة مدفوعة مباشرة")}
            {check(resetUsage, setResetUsage, "إعادة تعيين عداد الاستخدام وبدء فترة جديدة")}
          </div>
          {err && <div style={{ font: "12.5px/1.6 var(--font-sans)", color: "var(--red-600)" }}>{err}</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--border-subtle)" }}>
          <button style={btn("ghost")} onClick={onClose} disabled={busy}>إلغاء</button>
          <button style={btn("primary")} onClick={submit} disabled={busy}>
            {busy ? "جارٍ التنفيذ…" : "تأكيد التجديد"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= التبويب الرئيسي ================= */

export function BillingTab() {
  const [data, setData] = React.useState<BillingData | null>(null);
  const [error, setError] = React.useState(false);
  const [subFilter, setSubFilter] = React.useState("");
  const [subQ, setSubQ] = React.useState("");
  const [invFilter, setInvFilter] = React.useState("");
  const [invQ, setInvQ] = React.useState("");
  const [renewTarget, setRenewTarget] = React.useState<{ userId: string; name: string; email: string; plan?: string; endDate?: string | null } | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const load = React.useCallback(async () => {
    setError(false);
    try {
      const qs = new URLSearchParams({ subStatus: subFilter, subQ, invStatus: invFilter, invQ });
      const res = await fetch(`/api/admin/billing?${qs}`);
      const j = await res.json();
      if (!j.ok) throw new Error();
      setData(j);
    } catch {
      setError(true);
    }
  }, [subFilter, subQ, invFilter, invQ]);
  React.useEffect(() => { void load(); }, [load]);

  const patchInvoice = async (id: string, status: string) => {
    const res = await fetch("/api/admin/billing/invoice", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const j = await res.json();
    showToast(j.ok ? "تم تحديث الفاتورة." : j.error === "paid-invoice-locked" ? "الفاتورة المدفوعة لا تتغير إلا إلى ملغاة أو مستردة." : "تعذر التحديث.");
    await load();
  };

  const subAction = async (userId: string, status: string, label: string) => {
    if (!confirm(`تأكيد: ${label}؟`)) return;
    const res = await fetch("/api/admin/billing/subscription", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status }),
    });
    const j = await res.json();
    showToast(j.ok ? "تم تحديث حالة الاشتراك." : "تعذر التحديث.");
    await load();
  };

  if (error) return <EmptyState text="تعذر تحميل بيانات الفوترة — حدّث الصفحة." />;
  if (!data) return <Card><div style={{ padding: 30, textAlign: "center", color: "var(--text-subtle)", font: "13px var(--font-sans)" }}>جارٍ التحميل…</div></Card>;

  const k = data.kpis;
  const expiring = data.subscriptions.filter((s) => s.status === "ACTIVE" && s.daysLeft <= 30);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* بطاقات مالية */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
        <Kpi label="اشتراكات نشطة" value={num(k.activeCount)} accent="var(--green-600)" onClick={() => setSubFilter("ACTIVE")} />
        <Kpi label="تنتهي خلال 7 أيام" value={num(k.expiring7)} accent={k.expiring7 > 0 ? "var(--amber-600)" : undefined} onClick={() => setSubFilter("EXPIRING_7")} />
        <Kpi label="تنتهي خلال 30 يومًا" value={num(k.expiring30)} onClick={() => setSubFilter("EXPIRING_30")} />
        <Kpi label="اشتراكات منتهية" value={num(k.expiredCount)} accent={k.expiredCount > 0 ? "var(--red-600)" : undefined} onClick={() => setSubFilter("EXPIRED")} />
        <Kpi label="فواتير مدفوعة" value={num(k.paidCount)} onClick={() => setInvFilter("PAID")} />
        <Kpi label="فواتير معلقة" value={num(k.pendingCount)} accent={k.pendingCount > 0 ? "var(--amber-600)" : undefined} onClick={() => setInvFilter("PENDING")} />
        <Kpi label="فواتير متأخرة" value={num(k.overdueCount)} accent={k.overdueCount > 0 ? "var(--red-600)" : undefined} onClick={() => setInvFilter("OVERDUE")} />
        <Kpi label="إجمالي المدفوعات" value={`${k.paymentsTotal} ر.س`} sub={`${num(k.paymentsCount)} دفعة مسجلة`} />
        <Kpi label="الإيراد الشهري المتوقع" value={`${k.mrr} ر.س`} sub={`تقدير مبني على الاشتراكات المسجلة داخل وثّق${k.mrrExcludedCustom ? ` · ${k.mrrExcludedCustom} مدة مخصصة مستثناة` : ""}`} />
      </div>

      {/* قاربت على الانتهاء */}
      <Card>
        <SectionTitle>اشتراكات قاربت على الانتهاء</SectionTitle>
        {expiring.length === 0 ? (
          <EmptyState text="لا اشتراكات قريبة من الانتهاء — ممتاز." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  {["العميل", "الخطة", "تاريخ الانتهاء", "الأيام المتبقية", "الإجراء"].map((h) => (
                    <th key={h} style={{ textAlign: "start", font: "var(--weight-semibold) 11.5px/1 var(--font-sans)", color: "var(--text-subtle)", padding: "8px 10px", borderBottom: "1px solid var(--border-default)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expiring.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: "10px", borderBottom: "1px solid var(--border-subtle)", font: "13px var(--font-sans)" }}>
                      {s.name}
                      <div style={{ font: "11px var(--font-sans)", color: "var(--text-subtle)", direction: "ltr", textAlign: "end" }}>{s.email}</div>
                    </td>
                    <td style={{ padding: "10px", borderBottom: "1px solid var(--border-subtle)" }}><Badge label={PLAN_AR[s.plan] ?? s.plan} bg="var(--teal-50)" fg="var(--teal-600)" /></td>
                    <td style={{ padding: "10px", borderBottom: "1px solid var(--border-subtle)", font: "12.5px var(--font-sans)" }}>{dateOnly(s.endDate)}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid var(--border-subtle)", font: "var(--weight-bold) 13px var(--font-sans)", color: s.daysLeft <= 3 ? "var(--red-600)" : s.daysLeft <= 7 ? "var(--amber-600)" : "var(--text-strong)" }}>
                      {s.daysLeft <= 0 ? "انتهى" : `${s.daysLeft} يومًا`}
                    </td>
                    <td style={{ padding: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
                      <button style={btn("primary")} onClick={() => setRenewTarget({ userId: s.userId, name: s.name, email: s.email, plan: s.plan, endDate: s.endDate })}>تجديد</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* الاشتراكات */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <SectionTitle>الاشتراكات</SectionTitle>
          <select style={sel} value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
            <option value="">الحالة: الكل</option>
            <option value="ACTIVE">نشط</option>
            <option value="TRIAL">تجريبي</option>
            <option value="EXPIRED">منتهي</option>
            <option value="CANCELED">ملغي</option>
            <option value="SUSPENDED">موقوف</option>
            <option value="EXPIRING_7">ينتهي خلال 7 أيام</option>
            <option value="EXPIRING_30">ينتهي خلال 30 يومًا</option>
          </select>
          <input style={{ ...inp, width: 220 }} placeholder="بحث بالاسم أو البريد…" value={subQ} onChange={(e) => setSubQ(e.target.value)} />
        </div>
        {data.subscriptions.length === 0 ? (
          <EmptyState text="لا اشتراكات مسجلة بعد — أنشئ أول اشتراك من زر «تجديد/تفعيل» في ملف العميل." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr>
                  {["العميل", "الخطة", "الحالة", "البداية", "الانتهاء", "المتبقي", "الدورة", "المبلغ", "الإجراءات"].map((h) => (
                    <th key={h} style={{ textAlign: "start", font: "var(--weight-semibold) 11.5px/1 var(--font-sans)", color: "var(--text-subtle)", padding: "8px 10px", borderBottom: "1px solid var(--border-default)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "13px var(--font-sans)" }}>
                      {s.name}
                      <div style={{ font: "11px var(--font-sans)", color: "var(--text-subtle)", direction: "ltr", textAlign: "end" }}>{s.email}</div>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)" }}><Badge label={PLAN_AR[s.plan] ?? s.plan} bg="var(--teal-50)" fg="var(--teal-600)" /></td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)" }}><Badge label={SUB_STATUS_AR[s.status] ?? s.status} {...(SUB_UI[s.status] ?? SUB_UI.ACTIVE)} /></td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "12px var(--font-sans)", whiteSpace: "nowrap" }}>{dateOnly(s.startDate)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "12px var(--font-sans)", whiteSpace: "nowrap" }}>{dateOnly(s.endDate)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "12.5px var(--font-sans)" }}>{s.status === "ACTIVE" ? (s.daysLeft <= 0 ? "انتهى" : `${s.daysLeft} يومًا`) : "—"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "12.5px var(--font-sans)" }}>{CYCLE_AR[s.billingCycle] ?? s.billingCycle}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "12.5px var(--font-sans)", whiteSpace: "nowrap" }}>{s.price} {s.currency === "SAR" ? "ر.س" : s.currency}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        <button style={btn("primary")} onClick={() => setRenewTarget({ userId: s.userId, name: s.name, email: s.email, plan: s.plan, endDate: s.endDate })}>تجديد</button>
                        {s.status === "ACTIVE" && <button style={btn("ghost")} onClick={() => void subAction(s.userId, "SUSPENDED", "تعليق الاشتراك (يوقف مزايا الخطة فورًا)")}>تعليق</button>}
                        {s.status === "ACTIVE" && <button style={btn("danger")} onClick={() => void subAction(s.userId, "CANCELED", "إلغاء الاشتراك (يبقى فعالًا حتى نهاية المدة)")}>إلغاء</button>}
                        {(s.status === "SUSPENDED" || s.status === "CANCELED") && <button style={btn("ghost")} onClick={() => void subAction(s.userId, "ACTIVE", "إعادة تفعيل الاشتراك")}>إعادة تفعيل</button>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* الفواتير */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <SectionTitle>الفواتير</SectionTitle>
          <select style={sel} value={invFilter} onChange={(e) => setInvFilter(e.target.value)}>
            <option value="">الحالة: الكل</option>
            <option value="PAID">مدفوعة</option>
            <option value="PENDING">بانتظار الدفع</option>
            <option value="OVERDUE">متأخرة</option>
            <option value="CANCELED">ملغاة</option>
            <option value="REFUNDED">مستردة</option>
          </select>
          <input style={{ ...inp, width: 220 }} placeholder="بحث برقم الفاتورة…" value={invQ} onChange={(e) => setInvQ(e.target.value)} />
        </div>
        {data.invoices.length === 0 ? (
          <EmptyState text="لا فواتير بعد — تُنشأ الفواتير من نافذة التجديد أو ملف العميل." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr>
                  {["رقم الفاتورة", "العميل", "المبلغ", "الحالة", "الإصدار", "الاستحقاق", "الإجراءات"].map((h) => (
                    <th key={h} style={{ textAlign: "start", font: "var(--weight-semibold) 11.5px/1 var(--font-sans)", color: "var(--text-subtle)", padding: "8px 10px", borderBottom: "1px solid var(--border-default)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((i) => (
                  <tr key={i.id}>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "12px var(--font-mono)", direction: "ltr", textAlign: "end" }}>{i.invoiceNumber}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "13px var(--font-sans)" }}>
                      {i.name}
                      <div style={{ font: "11px var(--font-sans)", color: "var(--text-subtle)", direction: "ltr", textAlign: "end" }}>{i.email}</div>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "12.5px var(--font-sans)", whiteSpace: "nowrap" }}>{i.total} {i.currency === "SAR" ? "ر.س" : i.currency}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)" }}><Badge label={INVOICE_STATUS_AR[i.status] ?? i.status} {...(INV_UI[i.status] ?? INV_UI.PENDING)} /></td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "12px var(--font-sans)", whiteSpace: "nowrap" }}>{dateOnly(i.issueDate)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "12px var(--font-sans)", whiteSpace: "nowrap" }}>{i.dueDate ? dateOnly(i.dueDate) : "—"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        {(i.status === "PENDING" || i.status === "OVERDUE") && (
                          <button style={btn("primary")} onClick={() => void patchInvoice(i.id, "PAID")}>جعلها مدفوعة</button>
                        )}
                        {i.status !== "CANCELED" && i.status !== "REFUNDED" && (
                          <button style={btn("danger")} onClick={() => { if (confirm("إلغاء هذه الفاتورة؟ (لا حذف نهائي — تبقى في السجل)")) void patchInvoice(i.id, "CANCELED"); }}>إلغاء</button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* المدفوعات */}
      <Card>
        <SectionTitle>المدفوعات</SectionTitle>
        {data.payments.length === 0 ? (
          <EmptyState text="لا مدفوعات مسجلة بعد." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr>
                  {["العميل", "المبلغ", "الطريقة", "الحالة", "التاريخ", "المرجع"].map((h) => (
                    <th key={h} style={{ textAlign: "start", font: "var(--weight-semibold) 11.5px/1 var(--font-sans)", color: "var(--text-subtle)", padding: "8px 10px", borderBottom: "1px solid var(--border-default)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "13px var(--font-sans)" }}>
                      {p.name}
                      <div style={{ font: "11px var(--font-sans)", color: "var(--text-subtle)", direction: "ltr", textAlign: "end" }}>{p.email}</div>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "var(--weight-semibold) 12.5px var(--font-sans)", whiteSpace: "nowrap" }}>{p.amount} {p.currency === "SAR" ? "ر.س" : p.currency}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "12.5px var(--font-sans)" }}>{PAY_METHOD_AR[p.method] ?? p.method}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)" }}>
                      <Badge label={p.status === "COMPLETED" ? "مكتملة" : p.status} bg={p.status === "COMPLETED" ? "var(--green-50)" : "var(--slate-100)"} fg={p.status === "COMPLETED" ? "var(--green-600)" : "var(--text-muted)"} />
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "12px var(--font-sans)", whiteSpace: "nowrap" }}>{when(p.paidAt)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)", font: "11.5px var(--font-mono)", direction: "ltr", textAlign: "end" }}>{p.referenceNumber ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {renewTarget && <RenewalDialog target={renewTarget} onClose={() => setRenewTarget(null)} onDone={showToast} />}

      {toast && (
        <div role="status" style={{ position: "fixed", bottom: 22, insetInlineStart: "50%", transform: "translateX(50%)", zIndex: 90, padding: "10px 16px", borderRadius: 999, background: "var(--navy-900)", color: "#fff", font: "var(--weight-medium) 13px/1 var(--font-sans)", boxShadow: "var(--shadow-lg)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

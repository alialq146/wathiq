"use client";

/**
 * Admin Dashboard v1 — completely separate from the user workspace.
 * Server-computed overview arrives as props; Users / AI-Usage / Errors tabs
 * fetch lazily from the guarded /api/admin/* routes with pagination.
 * No chart libraries — bars, badges, and progress meters are token-styled divs.
 */

import React from "react";
import Link from "next/link";
import type { AdminOverviewData, AdminAlert, UsageRowLite, TopConsumer } from "@/lib/admin-data";

/* ================= formatting helpers ================= */

const num = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US"));
const usd = (n: number | null | undefined) => (n == null ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
const sar = (n: number | null | undefined) => (n == null ? "—" : `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} ر.س`);
const when = (isoStr: string | null | undefined) => {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
};
const shortModel = (m: string) =>
  m.includes("haiku") ? "Haiku" : m.includes("sonnet") ? "Sonnet" : m.includes("opus") ? "Opus" : m;

/* ================= status/plan visual maps ================= */

const STATUS_UI: Record<string, { label: string; bg: string; fg: string }> = {
  SUCCESS: { label: "ناجح", bg: "var(--green-50)", fg: "var(--green-600)" },
  FAILED: { label: "فشل", bg: "var(--red-50)", fg: "var(--red-600)" },
  BLOCKED_LIMIT: { label: "حد الباقة", bg: "var(--amber-50)", fg: "var(--amber-600)" },
  BLOCKED_SIZE: { label: "حجم كبير", bg: "var(--amber-50)", fg: "var(--amber-600)" },
  BLOCKED_AUTH: { label: "غير مصرّح", bg: "var(--red-50)", fg: "var(--red-600)" },
};
const SEVERITY_OF: Record<string, { label: string; bg: string; fg: string }> = {
  FAILED: { label: "HIGH", bg: "var(--red-50)", fg: "var(--red-600)" },
  BLOCKED_AUTH: { label: "MEDIUM", bg: "var(--amber-50)", fg: "var(--amber-600)" },
  BLOCKED_LIMIT: { label: "LOW", bg: "var(--slate-100)", fg: "var(--slate-600)" },
  BLOCKED_SIZE: { label: "LOW", bg: "var(--slate-100)", fg: "var(--slate-600)" },
};
const PLAN_UI: Record<string, { label: string; bg: string; fg: string }> = {
  FREE: { label: "مجاني", bg: "var(--slate-100)", fg: "var(--slate-600)" },
  PRO: { label: "احترافي", bg: "var(--blue-50)", fg: "var(--blue-600)" },
  ENTERPRISE: { label: "الأعمال", bg: "var(--violet-50)", fg: "var(--violet-500)" },
};
const ALERT_UI: Record<AdminAlert["severity"], { icon: string; bg: string; border: string; fg: string }> = {
  success: { icon: "✓", bg: "var(--green-50)", border: "var(--green-100)", fg: "var(--green-600)" },
  info: { icon: "ℹ", bg: "var(--blue-50)", border: "var(--blue-100)", fg: "var(--blue-600)" },
  warn: { icon: "⚠", bg: "var(--amber-50)", border: "var(--amber-100)", fg: "var(--amber-600)" },
  error: { icon: "✕", bg: "var(--red-50)", border: "var(--red-100)", fg: "var(--red-600)" },
};

/* ================= tiny primitives ================= */

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 999, background: bg, color: fg, font: "var(--weight-semibold) 11px var(--font-sans)", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}
const StatusBadge = ({ s }: { s: string }) => {
  const ui = STATUS_UI[s] ?? { label: s, bg: "var(--slate-100)", fg: "var(--slate-600)" };
  return <Badge label={ui.label} bg={ui.bg} fg={ui.fg} />;
};
const PlanBadge = ({ p }: { p: string }) => {
  const ui = PLAN_UI[p] ?? { label: p, bg: "var(--slate-100)", fg: "var(--slate-600)" };
  return <Badge label={ui.label} bg={ui.bg} fg={ui.fg} />;
};

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: 18, ...style }}>
      {children}
    </div>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <Card style={{ padding: "14px 16px" }}>
      <div style={{ font: "var(--weight-medium) 12px var(--font-sans)", color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ font: "var(--weight-bold) 22px var(--font-sans)", color: accent ?? "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ font: "11px var(--font-sans)", color: "var(--text-subtle)", marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ font: "var(--weight-semibold) 15px var(--font-sans)", color: "var(--text-strong)", margin: "0 0 12px" }}>{children}</h2>;
}

function Meter({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 999, background: "var(--slate-100)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 999 }} />
    </div>
  );
}

function Skeleton({ h = 220 }: { h?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[0.9, 0.7, 0.85, 0.6].map((w, i) => (
        <div key={i} style={{ height: h / 5, width: `${w * 100}%`, borderRadius: "var(--radius-md)", background: "var(--slate-100)", animation: "pulse 1.4s ease-in-out infinite" }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.55} 50%{opacity:1} }`}</style>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-subtle)", font: "13px var(--font-sans)" }}>
      <div style={{ fontSize: 26, marginBottom: 8 }}>◎</div>
      {text}
    </div>
  );
}

function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div style={{ padding: "28px 16px", textAlign: "center", font: "13px var(--font-sans)", color: "var(--red-600)" }}>
      {text}
      {onRetry && (
        <div style={{ marginTop: 10 }}>
          <SmallBtn onClick={onRetry}>إعادة المحاولة</SmallBtn>
        </div>
      )}
    </div>
  );
}

function SmallBtn({ children, onClick, disabled, tone = "default" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: "default" | "primary" | "danger" }) {
  const colors =
    tone === "primary"
      ? { bg: "var(--blue-600)", fg: "#fff", border: "var(--blue-600)" }
      : tone === "danger"
        ? { bg: "var(--red-50)", fg: "var(--red-600)", border: "var(--red-100)" }
        : { bg: "var(--surface-card)", fg: "var(--text-strong)", border: "var(--border-default)" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 12px",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.fg,
        font: "var(--weight-medium) 12px var(--font-sans)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  background: "var(--surface-card)",
  font: "13px var(--font-sans)",
  color: "var(--text-strong)",
  outline: "none",
};

const th: React.CSSProperties = {
  textAlign: "right",
  padding: "9px 10px",
  font: "var(--weight-semibold) 11px var(--font-sans)",
  color: "var(--text-muted)",
  borderBottom: "1px solid var(--border-subtle)",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "9px 10px",
  font: "12.5px var(--font-sans)",
  color: "var(--text-strong)",
  borderBottom: "1px solid var(--border-subtle)",
  verticalAlign: "top",
  fontVariantNumeric: "tabular-nums",
};

function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", padding: "10px 0 0" }}>
      <span style={{ font: "12px var(--font-sans)", color: "var(--text-subtle)" }}>
        صفحة {page} من {pages} · {num(total)} سجل
      </span>
      <SmallBtn disabled={page <= 1} onClick={() => onPage(page - 1)}>السابق</SmallBtn>
      <SmallBtn disabled={page >= pages} onClick={() => onPage(page + 1)}>التالي</SmallBtn>
    </div>
  );
}

/* ================= alerts ================= */

function Alerts({ alerts }: { alerts: AdminAlert[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {alerts.map((a, i) => {
        const ui = ALERT_UI[a.severity];
        return (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: "var(--radius-md)", background: ui.bg, border: `1px solid ${ui.border}` }}>
            <span style={{ color: ui.fg, font: "var(--weight-bold) 13px var(--font-sans)", marginTop: 1 }}>{ui.icon}</span>
            <div>
              <div style={{ font: "var(--weight-medium) 13px var(--font-sans)", color: "var(--text-strong)" }}>{a.text}</div>
              {a.hint && <div style={{ font: "12px/1.6 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>{a.hint}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================= recent mini table ================= */

function RecentList({ rows, empty }: { rows: UsageRowLite[]; empty: string }) {
  if (rows.length === 0) return <EmptyState text={empty} />;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.map((r) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px", borderBottom: "1px solid var(--border-subtle)" }}>
          <StatusBadge s={r.status} />
          <span style={{ font: "12px var(--font-sans)", color: "var(--text-strong)", direction: "ltr", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{r.userEmail}</span>
          <span style={{ font: "11px var(--font-mono)", color: "var(--text-subtle)" }}>{shortModel(r.modelUsed)}</span>
          <span style={{ marginInlineStart: "auto", font: "11px var(--font-sans)", color: "var(--text-subtle)", whiteSpace: "nowrap" }}>{when(r.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

/* ================= Overview tab ================= */

function OverviewTab({ d }: { d: AdminOverviewData }) {
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <SectionTitle>تنبيهات ذكية</SectionTitle>
        <Alerts alerts={d.alerts} />
      </div>

      <div>
        <SectionTitle>المستخدمون</SectionTitle>
        <div style={grid}>
          <Kpi label="إجمالي المستخدمين" value={num(d.kpis.totalUsers)} />
          <Kpi label="جدد اليوم" value={num(d.kpis.newToday)} accent="var(--blue-600)" />
          <Kpi label="جدد هذا الشهر" value={num(d.kpis.newMonth)} />
          <Kpi label="نشطون هذا الشهر" value={num(d.kpis.activeMonth)} sub="استخدموا التحليل مرة على الأقل" />
          <Kpi label="إجمالي المشاريع" value={num(d.kpis.totalProjects)} />
          <Kpi label="إجمالي المتطلبات" value={num(d.kpis.totalRequirements)} />
        </div>
      </div>

      <div>
        <SectionTitle>تحليلات الذكاء الاصطناعي (الكل)</SectionTitle>
        <div style={grid}>
          <Kpi label="الإجمالي" value={num(d.kpis.aiTotal)} />
          <Kpi label="ناجحة" value={num(d.kpis.aiSuccess)} accent="var(--green-600)" />
          <Kpi label="فاشلة" value={num(d.kpis.aiFailed)} accent={d.kpis.aiFailed > 0 ? "var(--red-600)" : undefined} />
          <Kpi label="محجوبة (حد الباقة)" value={num(d.kpis.aiBlockedLimit)} accent={d.kpis.aiBlockedLimit > 0 ? "var(--amber-600)" : undefined} />
          <Kpi label="محجوبة (حجم الملف)" value={num(d.kpis.aiBlockedSize)} />
        </div>
      </div>

      <div>
        <SectionTitle>مؤشرات مالية تقديرية</SectionTitle>
        <div style={grid}>
          <Kpi label="MRR التقديري" value={sar(d.finance.mrrSar)} sub={`${d.finance.proUsers} × 149 ر.س (Pro) · الأعمال: يدوي`} accent="var(--blue-600)" />
          <Kpi label="تكلفة AI هذا الشهر" value={usd(d.finance.aiCostMonthUsd)} sub={`≈ ${sar(d.finance.aiCostMonthSar)} (سعر ${d.finance.usdToSar})`} />
          <Kpi label="صافي الربح التقديري" value={sar(d.finance.netMonthSar)} accent={d.finance.netMonthSar >= 0 ? "var(--green-600)" : "var(--red-600)"} />
          <Kpi label="متوسط تكلفة التحليل" value={usd(d.finance.avgCostPerAnalysisUsd)} sub="للتحليلات الناجحة هذا الشهر" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        <Card>
          <SectionTitle>أعلى المستخدمين استهلاكًا (هذا الشهر)</SectionTitle>
          {d.topConsumers.length === 0 ? (
            <EmptyState text="لا يوجد استهلاك بعد هذا الشهر." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {d.topConsumers.map((t: TopConsumer) => (
                <div key={t.userId} style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ font: "var(--weight-medium) 12.5px var(--font-sans)", direction: "ltr" }}>{t.email}</span>
                    <PlanBadge p={t.plan} />
                    <span style={{ marginInlineStart: "auto", font: "12px var(--font-sans)", color: "var(--text-muted)" }}>
                      {num(t.analyses)} تحليل · {usd(t.costUsd)} · {shortModel(t.topModel)}
                    </span>
                  </div>
                  {t.note && <div style={{ font: "11.5px var(--font-sans)", color: "var(--amber-600)", marginTop: 4 }}>⚠ {t.note}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <SectionTitle>آخر ٥ أخطاء</SectionTitle>
          <RecentList rows={d.recentErrors} empty="لا توجد أخطاء — ممتاز." />
        </Card>
        <Card>
          <SectionTitle>آخر ٥ تحليلات</SectionTitle>
          <RecentList rows={d.recentAnalyses} empty="لا توجد تحليلات بعد." />
        </Card>
      </div>
    </div>
  );
}

/* ================= Users tab ================= */

interface UserRow {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: string;
  accountStatus: string;
  subscriptionStatus: string;
  analysisCount: number;
  limit: number | null;
  limitOverride: boolean;
  projects: number;
  aiCalls: number;
  costUsd: number;
  lastActivity: string | null;
  createdAt: string;
}

function UsersTab() {
  const [rows, setRows] = React.useState<UserRow[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState("");
  const [qDraft, setQDraft] = React.useState("");
  const [err, setErr] = React.useState(false);
  const [managed, setManaged] = React.useState<UserRow | null>(null);

  const load = React.useCallback(async () => {
    setRows(null);
    setErr(false);
    try {
      const res = await fetch(`/api/admin/users?page=${page}&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setRows(data.users);
      setTotal(data.total);
    } catch {
      setErr(true);
      setRows([]);
    }
  }, [page, q]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <SectionTitle>المستخدمون</SectionTitle>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
          <input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), setQ(qDraft))}
            placeholder="بحث بالاسم أو البريد…"
            style={{ ...inputStyle, width: 220 }}
          />
          <SmallBtn onClick={() => (setPage(1), setQ(qDraft))}>بحث</SmallBtn>
        </div>
      </div>

      {rows === null ? (
        <Skeleton />
      ) : err ? (
        <ErrorState text="تعذّر تحميل المستخدمين." onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState text="لا يوجد مستخدمون مطابقون." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={th}>المستخدم</th>
                <th style={th}>الخطة</th>
                <th style={th}>الحالة</th>
                <th style={th}>المشاريع</th>
                <th style={th}>التحليلات</th>
                <th style={th}>الحد</th>
                <th style={th}>آخر نشاط</th>
                <th style={th}>التسجيل</th>
                <th style={th}>تكلفة AI</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td style={td}>
                    <div style={{ font: "var(--weight-medium) 12.5px var(--font-sans)" }}>{u.name}</div>
                    <div style={{ font: "11px var(--font-sans)", color: "var(--text-subtle)", direction: "ltr", textAlign: "right" }}>{u.email}</div>
                  </td>
                  <td style={td}>
                    <PlanBadge p={u.plan} />
                    {u.role === "SUPER_ADMIN" && <div style={{ marginTop: 4 }}><Badge label="أدمن" bg="var(--violet-50)" fg="var(--violet-500)" /></div>}
                  </td>
                  <td style={td}>
                    {u.accountStatus === "DISABLED" ? <Badge label="معطَّل" bg="var(--red-50)" fg="var(--red-600)" /> : <Badge label="نشط" bg="var(--green-50)" fg="var(--green-600)" />}
                  </td>
                  <td style={td}>{num(u.projects)}</td>
                  <td style={td}>
                    {num(u.analysisCount)}
                    {u.limit != null && (
                      <div style={{ width: 70, marginTop: 5 }}>
                        <Meter pct={(u.analysisCount / Math.max(1, u.limit)) * 100} color={u.analysisCount >= u.limit ? "var(--red-500)" : "var(--blue-500)"} />
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    {u.limit == null ? "غير محدود" : num(u.limit)}
                    {u.limitOverride && <div style={{ font: "10px var(--font-sans)", color: "var(--amber-600)" }}>مخصص</div>}
                  </td>
                  <td style={td}>{when(u.lastActivity)}</td>
                  <td style={td}>{when(u.createdAt)}</td>
                  <td style={td}>{usd(u.costUsd)}</td>
                  <td style={td}><SmallBtn onClick={() => setManaged(u)}>إدارة</SmallBtn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={total} pageSize={20} onPage={setPage} />

      {managed && <ManageUserDialog user={managed} onClose={() => setManaged(null)} onChanged={load} />}
    </Card>
  );
}

/* ---- user management dialog (plan / limit / counter / status / details) ---- */

interface UserDetail {
  user: UserRow & { resetDate: string | null };
  requirements: number;
  projects: Array<{ id: string; name: string; code: string; status: string; createdAt: string }>;
  usage: {
    byStatus: Record<string, number>;
    costUsd: number;
    recent: Array<{ id: string; createdAt: string; status: string; modelUsed: string; inputTokens: number | null; outputTokens: number | null; estimatedCost: number | null; errorMessage: string | null }>;
  };
}

function ManageUserDialog({ user, onClose, onChanged }: { user: UserRow; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [plan, setPlan] = React.useState(user.plan);
  const [limit, setLimit] = React.useState(String(user.limit ?? ""));
  const [detail, setDetail] = React.useState<UserDetail | null>(null);
  const [showDetail, setShowDetail] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const act = async (action: string, value?: unknown) => {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action, value }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg("تم الحفظ بنجاح.");
        onChanged();
      } else if (data.error === "self") {
        setMsg("لا يمكنك تعطيل حسابك الحالي.");
      } else {
        setMsg("تعذّر تنفيذ العملية. حاول مرة أخرى.");
      }
    } catch {
      setMsg("تعذّر الاتصال بالخادم.");
    }
    setBusy(null);
  };

  const loadDetail = async () => {
    setShowDetail(true);
    if (detail) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      const data = await res.json();
      if (data.ok) setDetail(data);
    } catch {
      /* view shows skeleton until retry */
    }
  };

  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };
  const label: React.CSSProperties = { font: "var(--weight-medium) 12px var(--font-sans)", color: "var(--text-muted)", width: 110, flexShrink: 0 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--surface-overlay)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px", zIndex: 60, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 620, background: "var(--surface-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-xl)", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ font: "var(--weight-semibold) 15px var(--font-sans)" }}>إدارة المستخدم</span>
          <span style={{ font: "12px var(--font-sans)", color: "var(--text-subtle)", direction: "ltr" }}>{user.email}</span>
          <button onClick={onClose} aria-label="إغلاق" style={{ marginInlineStart: "auto", border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {!showDetail ? (
            <>
              <div style={row}>
                <span style={label}>الخطة</span>
                <select value={plan} onChange={(e) => setPlan(e.target.value)} style={inputStyle}>
                  <option value="FREE">مجاني (FREE)</option>
                  <option value="PRO">احترافي (PRO)</option>
                  <option value="ENTERPRISE">الأعمال (ENTERPRISE)</option>
                </select>
                <SmallBtn tone="primary" disabled={busy !== null || plan === user.plan} onClick={() => act("set-plan", plan)}>
                  {busy === "set-plan" ? "جارٍ…" : "تغيير الخطة"}
                </SmallBtn>
              </div>

              <div style={row}>
                <span style={label}>عداد التحليلات</span>
                <span style={{ font: "13px var(--font-sans)" }}>{num(user.analysisCount)} مستخدمة</span>
                <SmallBtn disabled={busy !== null} onClick={() => act("reset-count")}>
                  {busy === "reset-count" ? "جارٍ…" : "إعادة تعيين العداد"}
                </SmallBtn>
              </div>

              <div style={row}>
                <span style={label}>حد مخصص</span>
                <input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="مثال: 100" dir="ltr" style={{ ...inputStyle, width: 90 }} />
                <SmallBtn disabled={busy !== null} onClick={() => act("set-limit", Number(limit))}>
                  {busy === "set-limit" ? "جارٍ…" : "تطبيق الحد"}
                </SmallBtn>
                {user.limitOverride && (
                  <SmallBtn disabled={busy !== null} onClick={() => act("clear-limit")}>إلغاء التخصيص (حد الخطة)</SmallBtn>
                )}
              </div>

              <div style={row}>
                <span style={label}>حالة الحساب</span>
                {user.accountStatus === "DISABLED" ? (
                  <SmallBtn tone="primary" disabled={busy !== null} onClick={() => act("set-status", "ACTIVE")}>تفعيل الحساب</SmallBtn>
                ) : (
                  <SmallBtn tone="danger" disabled={busy !== null} onClick={() => act("set-status", "DISABLED")}>تعطيل الحساب</SmallBtn>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                <SmallBtn onClick={loadDetail}>عرض التفاصيل (المشاريع والتحليلات)</SmallBtn>
              </div>
            </>
          ) : (
            <>
              <SmallBtn onClick={() => setShowDetail(false)}>← رجوع للإجراءات</SmallBtn>
              {!detail ? (
                <Skeleton />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                    <Kpi label="المشاريع" value={num(detail.projects.length)} />
                    <Kpi label="المتطلبات" value={num(detail.requirements)} />
                    <Kpi label="تحليلات ناجحة" value={num(detail.usage.byStatus.SUCCESS ?? 0)} accent="var(--green-600)" />
                    <Kpi label="تكلفة AI" value={usd(detail.usage.costUsd)} />
                  </div>
                  <div>
                    <SectionTitle>المشاريع</SectionTitle>
                    {detail.projects.length === 0 ? (
                      <EmptyState text="لا مشاريع." />
                    ) : (
                      detail.projects.map((p) => (
                        <div key={p.id} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border-subtle)", font: "12.5px var(--font-sans)" }}>
                          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-subtle)" }}>{p.code}</span>
                          <span>{p.name}</span>
                          <span style={{ marginInlineStart: "auto", color: "var(--text-subtle)" }}>{when(p.createdAt)}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div>
                    <SectionTitle>آخر العمليات</SectionTitle>
                    {detail.usage.recent.length === 0 ? (
                      <EmptyState text="لا عمليات AI." />
                    ) : (
                      detail.usage.recent.map((r) => (
                        <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)", font: "12px var(--font-sans)" }}>
                          <StatusBadge s={r.status} />
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{shortModel(r.modelUsed)}</span>
                          {r.errorMessage && <span style={{ color: "var(--red-600)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{r.errorMessage}</span>}
                          <span style={{ marginInlineStart: "auto", color: "var(--text-subtle)", whiteSpace: "nowrap" }}>{when(r.createdAt)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {msg && <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--blue-50)", border: "1px solid var(--blue-100)", font: "12.5px var(--font-sans)", color: "var(--blue-700)" }}>{msg}</div>}
        </div>
      </div>
    </div>
  );
}

/* ================= Subscriptions tab ================= */

function SubscriptionsTab({ d }: { d: AdminOverviewData }) {
  const s = d.subscriptions;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
        <Kpi label="مجاني" value={num(s.counts.FREE)} />
        <Kpi label="احترافي" value={num(s.counts.PRO)} accent="var(--blue-600)" />
        <Kpi label="الأعمال" value={num(s.counts.ENTERPRISE)} accent="var(--violet-500)" />
        <Kpi label="نسبة المدفوع" value={s.freeToPaidPct == null ? "—" : `${s.freeToPaidPct}%`} sub="من إجمالي المستخدمين" />
        <Kpi label="وصلوا للحد" value={num(s.atLimit)} accent={s.atLimit > 0 ? "var(--amber-600)" : undefined} sub="فرصة ترقية" />
        <Kpi label="قريبون من الحد" value={num(s.nearLimit)} sub="≥ 80% من الحد" />
        <Kpi label="MRR تقديري" value={sar(d.finance.mrrSar)} accent="var(--blue-600)" />
        <Kpi label="ARR تقديري" value={sar(d.finance.arrSar)} />
      </div>

      <Card>
        <SectionTitle>الخطط — الإيراد مقابل تكلفة AI (تقديري، هذا الشهر)</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={th}>الخطة</th>
                <th style={th}>المستخدمون</th>
                <th style={th}>حد التحليلات</th>
                <th style={th}>متوسط الاستخدام</th>
                <th style={th}>الإيراد التقديري</th>
                <th style={th}>تكلفة AI</th>
                <th style={th}>الهامش التقديري</th>
              </tr>
            </thead>
            <tbody>
              {s.perPlan.map((p) => (
                <tr key={p.plan}>
                  <td style={td}><PlanBadge p={p.plan} /></td>
                  <td style={td}>{num(p.users)}</td>
                  <td style={td}>{p.limit == null ? "مخصص" : num(p.limit)}</td>
                  <td style={td}>{p.avgUsage}</td>
                  <td style={td}>{p.revenueSar == null ? "يدوي / تواصل" : sar(p.revenueSar)}</td>
                  <td style={td}>{usd(p.aiCostUsd)}</td>
                  <td style={{ ...td, color: p.marginSar == null ? undefined : p.marginSar >= 0 ? "var(--green-600)" : "var(--red-600)" }}>
                    {p.marginSar == null ? "—" : sar(p.marginSar)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ font: "11.5px/1.7 var(--font-sans)", color: "var(--text-subtle)", margin: "10px 0 0" }}>
          تكلفة AI لكل خطة تُقدَّر عبر توجيه النماذج (كل خطة ↔ نموذجها). MRR = عدد مستخدمي Pro × 149 ر.س — تقديري لأن الترقية يدوية.
        </p>
      </Card>
    </div>
  );
}

/* ================= AI Usage tab (cards + filters + logs) ================= */

interface LogRow {
  id: string;
  createdAt: string;
  userEmail: string;
  userPlan: string;
  projectId: string | null;
  requirementId: string | null;
  documentId: string | null;
  model: string;
  status: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  errorMessage: string | null;
}
interface LogsResponse {
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  aggregates: { byStatus: Record<string, number>; costUsd: number; models: Array<{ model: string; requests: number }> };
  rows: LogRow[];
}

function useLogs(fixedStatus?: string) {
  const [data, setData] = React.useState<LogsResponse | null>(null);
  const [err, setErr] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [range, setRange] = React.useState("month");
  const [status, setStatus] = React.useState(fixedStatus ?? "");
  const [model, setModel] = React.useState("");
  const [plan, setPlan] = React.useState("");
  const [q, setQ] = React.useState("");

  const load = React.useCallback(async () => {
    setData(null);
    setErr(false);
    const params = new URLSearchParams({ page: String(page), range });
    if (status) params.set("status", status);
    if (model) params.set("model", model);
    if (plan) params.set("plan", plan);
    if (q) params.set("q", q);
    try {
      const res = await fetch(`/api/admin/usage?${params}`);
      const json = (await res.json()) as LogsResponse;
      if (!json.ok) throw new Error();
      setData(json);
    } catch {
      setErr(true);
    }
  }, [page, range, status, model, plan, q]);

  React.useEffect(() => {
    load();
  }, [load]);

  return { data, err, load, page, setPage, range, setRange, status, setStatus, model, setModel, plan, setPlan, q, setQ };
}

function LogsTable({ rows }: { rows: LogRow[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
        <thead>
          <tr>
            <th style={th}>التاريخ</th>
            <th style={th}>المستخدم</th>
            <th style={th}>الخطة</th>
            <th style={th}>النموذج</th>
            <th style={th}>الحالة</th>
            <th style={th}>Input</th>
            <th style={th}>Output</th>
            <th style={th}>التكلفة</th>
            <th style={th}>المرجع</th>
            <th style={th}>الخطأ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ ...td, whiteSpace: "nowrap" }}>{when(r.createdAt)}</td>
              <td style={{ ...td, direction: "ltr", textAlign: "right", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis" }}>{r.userEmail}</td>
              <td style={td}><PlanBadge p={r.userPlan} /></td>
              <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 11 }}>{shortModel(r.model)}</td>
              <td style={td}><StatusBadge s={r.status} /></td>
              <td style={td}>{num(r.inputTokens)}</td>
              <td style={td}>{num(r.outputTokens)}</td>
              <td style={td}>{r.costUsd == null ? "—" : usd(r.costUsd)}</td>
              <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-subtle)" }}>
                {r.requirementId ?? (r.documentId ? "PDF" : r.projectId ? "مشروع" : "—")}
              </td>
              <td style={{ ...td, color: "var(--red-600)", fontSize: 11.5, maxWidth: 220 }}>{r.errorMessage ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const selectFilter: React.CSSProperties = { ...inputStyle, padding: "6px 8px", fontSize: 12 };

function UsageTab({ d }: { d: AdminOverviewData }) {
  const L = useLogs();
  const agg = L.data?.aggregates;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
        <Kpi label="طلبات اليوم" value={num(d.usage.requestsToday)} />
        <Kpi label="طلبات هذا الشهر" value={num(d.usage.requestsMonth)} />
        <Kpi label="ناجحة (الشهر)" value={num(d.usage.successMonth)} accent="var(--green-600)" />
        <Kpi label="فاشلة (الشهر)" value={num(d.usage.failedMonth)} accent={d.usage.failedMonth > 0 ? "var(--red-600)" : undefined} />
        <Kpi label="محجوبة — حد" value={num(d.usage.blockedLimitMonth)} />
        <Kpi label="محجوبة — حجم" value={num(d.usage.blockedSizeMonth)} />
        <Kpi label="تكلفة اليوم" value={usd(d.usage.costTodayUsd)} />
        <Kpi label="تكلفة الشهر" value={usd(d.usage.costMonthUsd)} accent="var(--blue-600)" />
      </div>

      <Card>
        <SectionTitle>التوزيع حسب النموذج (هذا الشهر)</SectionTitle>
        {d.usage.byModel.length === 0 ? (
          <EmptyState text="لا استخدام هذا الشهر." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {d.usage.byModel.map((m) => (
              <div key={m.model}>
                <div style={{ display: "flex", gap: 10, font: "12px var(--font-sans)", marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{m.model}</span>
                  <span style={{ color: "var(--text-subtle)" }}>
                    {num(m.requests)} طلب · in {num(m.inputTokens)} · out {num(m.outputTokens)} · {usd(m.costUsd)}
                  </span>
                  <span style={{ marginInlineStart: "auto", fontWeight: 600 }}>{m.pct}%</span>
                </div>
                <Meter pct={m.pct} color={m.model.includes("opus") ? "var(--violet-500)" : m.model.includes("sonnet") ? "var(--blue-500)" : "var(--teal-500)"} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <SectionTitle>سجل العمليات</SectionTitle>
          <div style={{ marginInlineStart: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
            <select value={L.range} onChange={(e) => (L.setPage(1), L.setRange(e.target.value))} style={selectFilter}>
              <option value="today">اليوم</option>
              <option value="7d">آخر ٧ أيام</option>
              <option value="month">هذا الشهر</option>
              <option value="all">الكل</option>
            </select>
            <select value={L.status} onChange={(e) => (L.setPage(1), L.setStatus(e.target.value))} style={selectFilter}>
              <option value="">كل الحالات</option>
              <option value="SUCCESS">ناجح</option>
              <option value="FAILED">فشل</option>
              <option value="BLOCKED_LIMIT">حد الباقة</option>
              <option value="BLOCKED_SIZE">حجم كبير</option>
              <option value="BLOCKED_AUTH">غير مصرّح</option>
            </select>
            <select value={L.plan} onChange={(e) => (L.setPage(1), L.setPlan(e.target.value))} style={selectFilter}>
              <option value="">كل الخطط</option>
              <option value="FREE">مجاني</option>
              <option value="PRO">احترافي</option>
              <option value="ENTERPRISE">الأعمال</option>
            </select>
            <select value={L.model} onChange={(e) => (L.setPage(1), L.setModel(e.target.value))} style={selectFilter}>
              <option value="">كل النماذج</option>
              {(agg?.models ?? []).map((m) => (
                <option key={m.model} value={m.model}>{shortModel(m.model)}</option>
              ))}
            </select>
            <input
              placeholder="بريد المستخدم…"
              defaultValue={L.q}
              onKeyDown={(e) => e.key === "Enter" && (L.setPage(1), L.setQ((e.target as HTMLInputElement).value))}
              style={{ ...selectFilter, width: 150 }}
            />
          </div>
        </div>

        {L.data === null && !L.err ? (
          <Skeleton />
        ) : L.err ? (
          <ErrorState text="تعذّر تحميل السجل." onRetry={L.load} />
        ) : L.data!.rows.length === 0 ? (
          <EmptyState text="لا سجلات مطابقة للفلاتر." />
        ) : (
          <>
            <div style={{ font: "12px var(--font-sans)", color: "var(--text-subtle)", marginBottom: 8 }}>
              نتائج الفلتر: {num(L.data!.total)} عملية · التكلفة {usd(L.data!.aggregates.costUsd)}
            </div>
            <LogsTable rows={L.data!.rows} />
            <Pager page={L.page} total={L.data!.total} pageSize={L.data!.pageSize} onPage={L.setPage} />
          </>
        )}
      </Card>
    </div>
  );
}

/* ================= Errors tab ================= */

const DIAG_HINTS: Array<{ match: (r: LogRow) => boolean; title: string; checks: string[] }> = [
  {
    match: (r) => r.status === "FAILED",
    title: "أخطاء مزود الذكاء الاصطناعي — ماذا أفحص؟",
    checks: [
      "تحقق من ANTHROPIC_API_KEY في Vercel.",
      "تحقق من أسماء AI_MODEL_FREE / PRO / ENTERPRISE (اسم نموذج خاطئ يفشل فورًا).",
      "تحقق من رصيد حساب المزود وحدود المعدل (rate limits).",
      "تحقق من حجم الملف/النص المُرسل.",
    ],
  },
  {
    match: (r) => r.status === "BLOCKED_LIMIT",
    title: "محاولات محجوبة بحد الباقة — ماذا أفحص؟",
    checks: [
      "تحقق من analysisLimit وplan للمستخدم (تبويب المستخدمين).",
      "تحقق من resetDate — هل تأخّرت إعادة التعيين الشهرية؟",
      "هل يكرر المستخدم نفس التحليل؟ قد يحتاج ترقية.",
    ],
  },
  {
    match: (r) => r.status === "BLOCKED_SIZE",
    title: "ملفات كبيرة محجوبة — ماذا أفحص؟",
    checks: ["الحد الحالي ≈ 3.3MB للـ PDF.", "هل الملفات المرفوضة قريبة من الحد؟ فكّر في رفع الحد للخطط المدفوعة."],
  },
  {
    match: (r) => r.status === "BLOCKED_AUTH",
    title: "أخطاء صلاحيات — ماذا أفحص؟",
    checks: ["تحقق من الجلسة وWATHIQ_SESSION_SECRET.", "تحقق من ملكية projectId / requirementId.", "تحقق من role وحالة الحساب."],
  },
];

function ErrorsTab() {
  const L = useLogs("ERRORS");
  const agg = L.data?.aggregates;
  const by = agg?.byStatus ?? {};
  const totalErr = Object.entries(by).reduce((a, [, n]) => a + n, 0);
  const most = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  const hints = L.data ? DIAG_HINTS.filter((h) => L.data!.rows.some(h.match)) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        <Kpi label="أخطاء (حسب الفلتر)" value={num(totalErr)} accent={totalErr > 0 ? "var(--red-600)" : "var(--green-600)"} />
        <Kpi label="فشل API" value={num(by.FAILED ?? 0)} />
        <Kpi label="محجوب — حد" value={num(by.BLOCKED_LIMIT ?? 0)} />
        <Kpi label="محجوب — حجم" value={num(by.BLOCKED_SIZE ?? 0)} />
        <Kpi label="الأكثر شيوعًا" value={most ? (STATUS_UI[most[0]]?.label ?? most[0]) : "—"} />
        <Kpi label="آخر خطأ" value={L.data?.rows[0] ? when(L.data.rows[0].createdAt) : "—"} />
      </div>

      {hints.length > 0 && (
        <Card style={{ background: "var(--amber-50)", borderColor: "var(--amber-100)" }}>
          <SectionTitle>اقتراحات تشخيصية</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {hints.map((h) => (
              <div key={h.title}>
                <div style={{ font: "var(--weight-semibold) 13px var(--font-sans)", color: "var(--amber-600)", marginBottom: 4 }}>{h.title}</div>
                <ul style={{ margin: 0, paddingInlineStart: 18, font: "12.5px/1.8 var(--font-sans)", color: "var(--text-strong)" }}>
                  {h.checks.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <SectionTitle>سجل الأخطاء</SectionTitle>
          <select value={L.range} onChange={(e) => (L.setPage(1), L.setRange(e.target.value))} style={{ ...selectFilter, marginInlineStart: "auto" }}>
            <option value="today">اليوم</option>
            <option value="7d">آخر ٧ أيام</option>
            <option value="month">هذا الشهر</option>
            <option value="all">الكل</option>
          </select>
        </div>
        {L.data === null && !L.err ? (
          <Skeleton />
        ) : L.err ? (
          <ErrorState text="تعذّر تحميل الأخطاء." onRetry={L.load} />
        ) : L.data!.rows.length === 0 ? (
          <EmptyState text="لا أخطاء في هذه الفترة — النظام سليم. ✓" />
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr>
                    <th style={th}>الوقت</th>
                    <th style={th}>النوع</th>
                    <th style={th}>الخطورة</th>
                    <th style={th}>المستخدم</th>
                    <th style={th}>النموذج</th>
                    <th style={th}>الرسالة</th>
                  </tr>
                </thead>
                <tbody>
                  {L.data!.rows.map((r) => {
                    const sev = SEVERITY_OF[r.status] ?? { label: "—", bg: "var(--slate-100)", fg: "var(--slate-600)" };
                    return (
                      <tr key={r.id}>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>{when(r.createdAt)}</td>
                        <td style={td}><StatusBadge s={r.status} /></td>
                        <td style={td}><Badge label={sev.label} bg={sev.bg} fg={sev.fg} /></td>
                        <td style={{ ...td, direction: "ltr", textAlign: "right" }}>{r.userEmail}</td>
                        <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 11 }}>{shortModel(r.model)}</td>
                        <td style={{ ...td, color: "var(--red-600)", fontSize: 11.5, maxWidth: 280 }}>{r.errorMessage ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={L.page} total={L.data!.total} pageSize={L.data!.pageSize} onPage={L.setPage} />
          </>
        )}
      </Card>
    </div>
  );
}

/* ================= Settings tab (read-only) ================= */

function ConfiguredBadge({ ok }: { ok: boolean }) {
  return ok ? <Badge label="Configured ✓" bg="var(--green-50)" fg="var(--green-600)" /> : <Badge label="Missing ✕" bg="var(--red-50)" fg="var(--red-600)" />;
}

function SettingsTab({ d }: { d: AdminOverviewData }) {
  const h = d.health;
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap" };
  const key: React.CSSProperties = { font: "var(--weight-medium) 12.5px var(--font-mono)", color: "var(--text-muted)", minWidth: 220, direction: "ltr", textAlign: "right" };
  const val: React.CSSProperties = { font: "13px var(--font-sans)", color: "var(--text-strong)" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <SectionTitle>معلومات المنصة</SectionTitle>
        <div style={row}><span style={key}>App Version</span><span style={val}>{h.appVersion}</span></div>
        <div style={row}><span style={key}>Environment</span><span style={val}>{h.environment}</span></div>
        <div style={row}><span style={key}>WhatsApp</span><span style={{ ...val, direction: "ltr" }}>{h.contact.whatsapp.replace("https://wa.me/", "+").split("?")[0]}</span></div>
        <div style={{ ...row, borderBottom: "none" }}><span style={key}>Max PDF</span><span style={val}>{h.maxPdfNote}</span></div>
      </Card>

      <Card>
        <SectionTitle>نماذج الذكاء الاصطناعي (حسب الخطة)</SectionTitle>
        <div style={row}><span style={key}>AI_MODEL_FREE</span><span style={{ ...val, fontFamily: "var(--font-mono)", fontSize: 12 }}>{h.models.free}</span>{!h.env.aiModelFree && <Badge label="fallback" bg="var(--slate-100)" fg="var(--slate-600)" />}</div>
        <div style={row}><span style={key}>AI_MODEL_PRO</span><span style={{ ...val, fontFamily: "var(--font-mono)", fontSize: 12 }}>{h.models.pro}</span>{!h.env.aiModelPro && <Badge label="fallback" bg="var(--slate-100)" fg="var(--slate-600)" />}</div>
        <div style={{ ...row, borderBottom: "none" }}><span style={key}>AI_MODEL_ENTERPRISE</span><span style={{ ...val, fontFamily: "var(--font-mono)", fontSize: 12 }}>{h.models.enterprise}</span>{!h.env.aiModelEnterprise && <Badge label="fallback" bg="var(--slate-100)" fg="var(--slate-600)" />}</div>
      </Card>

      <Card>
        <SectionTitle>حدود الخطط</SectionTitle>
        <div style={row}><span style={key}>FREE_ANALYSIS_LIMIT</span><span style={val}>{h.limits.free ?? "غير محدود"}</span></div>
        <div style={row}><span style={key}>PRO_ANALYSIS_LIMIT</span><span style={val}>{h.limits.pro ?? "غير محدود"}</span></div>
        <div style={{ ...row, borderBottom: "none" }}><span style={key}>ENTERPRISE_ANALYSIS_LIMIT</span><span style={val}>{h.limits.enterprise ?? "مخصص / غير محدود"}</span></div>
      </Card>

      <Card>
        <SectionTitle>أسرار البيئة (الحالة فقط — لا تُعرض القيم أبدًا)</SectionTitle>
        <div style={row}><span style={key}>DATABASE_URL</span><ConfiguredBadge ok={h.env.databaseUrl} /></div>
        <div style={row}><span style={key}>ANTHROPIC_API_KEY</span><ConfiguredBadge ok={h.env.anthropicKey} /></div>
        <div style={{ ...row, borderBottom: "none" }}><span style={key}>WATHIQ_SESSION_SECRET</span><ConfiguredBadge ok={h.env.sessionSecret} /></div>
      </Card>
    </div>
  );
}

/* ================= System Health tab ================= */

function HealthCard({ title, state, detail }: { title: string; state: "ok" | "warn" | "down"; detail: string }) {
  const ui = state === "ok" ? { label: "Healthy", bg: "var(--green-50)", fg: "var(--green-600)" } : state === "warn" ? { label: "Warning", bg: "var(--amber-50)", fg: "var(--amber-600)" } : { label: "Down", bg: "var(--red-50)", fg: "var(--red-600)" };
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: ui.fg, display: "inline-block" }} />
        <span style={{ font: "var(--weight-semibold) 13.5px var(--font-sans)" }}>{title}</span>
        <span style={{ marginInlineStart: "auto" }}><Badge label={ui.label} bg={ui.bg} fg={ui.fg} /></span>
      </div>
      <div style={{ font: "12px/1.7 var(--font-sans)", color: "var(--text-muted)" }}>{detail}</div>
    </Card>
  );
}

function HealthTab({ d }: { d: AdminOverviewData }) {
  const h = d.health;
  const aiOk = h.env.anthropicKey;
  const trackingOk = h.counts.aiUsage > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
        <HealthCard title="Database" state={h.db === "healthy" ? "ok" : "down"} detail={h.db === "healthy" ? "الاتصال بقاعدة البيانات يعمل." : "تعذر الاتصال بقاعدة البيانات — تحقق من DATABASE_URL."} />
        <HealthCard title="AI Config" state={aiOk ? "ok" : "down"} detail={aiOk ? "مفتاح Claude مضبوط والنماذج مُوجَّهة حسب الخطة." : "ANTHROPIC_API_KEY مفقود — التحليل متوقف."} />
        <HealthCard title="Usage Tracking" state={trackingOk ? "ok" : "warn"} detail={trackingOk ? `آخر عملية: ${when(h.lastAi)}` : "لا سجلات AiUsage بعد — تأكد بعد أول تحليل."} />
        <HealthCard title="Auth Config" state={h.env.sessionSecret ? "ok" : "warn"} detail={h.env.sessionSecret ? "سر الجلسات مضبوط صراحةً." : "WATHIQ_SESSION_SECRET غير مضبوط — يُشتق سر بديل تلقائيًا، لكن يُفضَّل ضبطه."} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
        <Kpi label="Users" value={num(h.counts.users)} />
        <Kpi label="Projects" value={num(h.counts.projects)} />
        <Kpi label="Requirements" value={num(h.counts.requirements)} />
        <Kpi label="AiUsage rows" value={num(h.counts.aiUsage)} />
        <Kpi label="آخر عملية AI" value={when(h.lastAi)} />
        <Kpi label="آخر نجاح" value={when(h.lastSuccess)} accent="var(--green-600)" />
        <Kpi label="آخر فشل" value={when(h.lastFailed)} accent={h.lastFailed ? "var(--red-600)" : undefined} />
        <Kpi label="الإصدار · البيئة" value={`${h.appVersion} · ${h.environment}`} />
      </div>

      <Card>
        <SectionTitle>قائمة الفحص التشخيصية</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {h.checklist.map((c) => (
            <div key={c.label} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ color: c.ok ? "var(--green-600)" : "var(--red-600)", font: "var(--weight-bold) 14px var(--font-sans)", width: 16, textAlign: "center" }}>{c.ok ? "✓" : "✕"}</span>
              <div>
                <div style={{ font: "var(--weight-medium) 13px var(--font-sans)", color: "var(--text-strong)" }}>{c.label}</div>
                {!c.ok && c.hint && <div style={{ font: "12px/1.6 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>{c.hint}</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ================= shell ================= */

const TABS = [
  { id: "overview", label: "نظرة عامة" },
  { id: "users", label: "المستخدمون" },
  { id: "subs", label: "الاشتراكات" },
  { id: "usage", label: "AI Usage" },
  { id: "errors", label: "الأخطاء" },
  { id: "settings", label: "الإعدادات" },
  { id: "health", label: "صحة النظام" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function AdminClient({ initial, adminName, adminEmail }: { initial: AdminOverviewData; adminName: string; adminEmail: string }) {
  const [tab, setTab] = React.useState<TabId>("overview");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      {/* Top bar */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "var(--surface-card)", borderBottom: "1px solid var(--border-default)", padding: "0 20px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", gap: 14, height: 56, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--slate-900)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚙</span>
            <span style={{ font: "var(--weight-bold) 15px var(--font-sans)", color: "var(--text-strong)" }}>وثّق · لوحة الأدمن</span>
            <Badge label="SUPER ADMIN" bg="var(--violet-50)" fg="var(--violet-500)" />
          </span>
          <span style={{ marginInlineStart: "auto", font: "12px var(--font-sans)", color: "var(--text-subtle)" }}>
            {adminName} · <span style={{ direction: "ltr", display: "inline-block" }}>{adminEmail}</span>
          </span>
          <Link href="/" style={{ font: "var(--weight-medium) 12.5px var(--font-sans)", color: "var(--blue-600)", textDecoration: "none" }}>
            ← المنصة
          </Link>
        </div>
        {/* Tabs */}
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", gap: 2, overflowX: "auto" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 14px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                font: `var(--weight-${tab === t.id ? "semibold" : "medium"}) 13px var(--font-sans)`,
                color: tab === t.id ? "var(--blue-600)" : "var(--text-muted)",
                borderBottom: tab === t.id ? "2px solid var(--blue-600)" : "2px solid transparent",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 20px 60px" }}>
        <div style={{ font: "11.5px var(--font-sans)", color: "var(--text-subtle)", marginBottom: 14 }}>
          البيانات محسوبة عند فتح الصفحة · {when(initial.generatedAt)} — حدّث الصفحة لأحدث الأرقام.
        </div>
        {tab === "overview" && <OverviewTab d={initial} />}
        {tab === "users" && <UsersTab />}
        {tab === "subs" && <SubscriptionsTab d={initial} />}
        {tab === "usage" && <UsageTab d={initial} />}
        {tab === "errors" && <ErrorsTab />}
        {tab === "settings" && <SettingsTab d={initial} />}
        {tab === "health" && <HealthTab d={initial} />}
      </main>
    </div>
  );
}

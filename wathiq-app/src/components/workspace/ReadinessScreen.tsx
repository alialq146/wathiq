"use client";

/**
 * شاشة «جاهزية المشروع» (v2.3) — تعرض نتيجة محرك الجاهزية الخادمي:
 * الدرجة العامة، بطاقات الوثائق المفعلة فقط (لا بطاقة لوثيقة غير مطلوبة)،
 * محاور الجاهزية، الإجراءات المطلوبة بفلاتر، وملخص المتطلبات.
 * لا تستدعي أي ذكاء اصطناعي — الحساب من البيانات المحفوظة فقط.
 */

import React from "react";
import { Icon } from "@/components/ds";
import { getProjectReadiness, type ReadinessResponse } from "@/app/actions";
import type { ReadinessResult, ReadinessIssue, IssueSeverity } from "@/lib/readiness";

const SEV_AR: Record<IssueSeverity, string> = { critical: "نقص حرج", important: "تحسين مهم", optional: "اقتراح اختياري" };
const SEV_UI: Record<IssueSeverity, { bg: string; fg: string; border: string; icon: string }> = {
  critical: { bg: "var(--red-50)", fg: "var(--red-600)", border: "var(--red-100)", icon: "alert-circle" },
  important: { bg: "var(--amber-50)", fg: "var(--amber-600)", border: "var(--amber-100)", icon: "alert-triangle" },
  optional: { bg: "var(--blue-50)", fg: "var(--blue-600)", border: "var(--border-subtle)", icon: "lightbulb" },
};
const STATUS_UI: Record<string, { fg: string; bg: string }> = {
  ready: { fg: "var(--green-600)", bg: "var(--green-50)" },
  ready_with_notes: { fg: "var(--teal-600)", bg: "var(--teal-50)" },
  needs_work: { fg: "var(--amber-600)", bg: "var(--amber-50)" },
  not_ready: { fg: "var(--red-600)", bg: "var(--red-50)" },
};

const card: React.CSSProperties = {
  background: "var(--surface-card)", border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-xl)", padding: "20px 22px",
};

function ScoreRing({ score, size = 96, tone }: { score: number; size?: number; tone: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`الدرجة ${score} من 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--slate-100)" strokeWidth={10} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={10}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" style={{ font: "var(--weight-bold) 22px var(--font-sans)", fill: "var(--text-strong)" }}>
        {score}%
      </text>
    </svg>
  );
}

export function ReadinessScreen({
  projectId,
  onFix,
  onExport,
}: {
  projectId: string | null;
  /** إجراء إصلاح رمزي: requirements | context | requirement:<id> */
  onFix: (action: string) => void;
  onExport: (doc: "brd" | "srs") => void;
}) {
  const [data, setData] = React.useState<ReadinessResponse | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | IssueSeverity>("all");
  const [scopeFilter, setScopeFilter] = React.useState<"all" | "project" | "requirements" | "brd" | "srs">("all");

  const load = React.useCallback(async (recalculate: boolean) => {
    if (!projectId) return;
    setBusy(true);
    try {
      const res = await getProjectReadiness(projectId, { recalculate });
      setData(res);
    } catch {
      setData({ ok: false, error: "server" });
    } finally {
      setBusy(false);
    }
  }, [projectId]);

  React.useEffect(() => { void load(false); }, [load]);

  if (!projectId) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", font: "14px var(--font-sans)" }}>اختر مشروعًا لعرض جاهزيته.</div>;
  }
  if (!data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "4px 0" }}>
        {[96, 140, 180].map((h) => <div key={h} style={{ height: h, borderRadius: "var(--radius-xl)", background: "var(--slate-100)", opacity: 0.6 }} />)}
      </div>
    );
  }
  if (!data.ok || !data.result) {
    const msg = data.error === "feature-disabled" ? "مركز الجاهزية غير مفعل حاليًا." : "تعذر احتساب جاهزية المشروع — حاول مرة أخرى.";
    return <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", font: "13.5px/1.8 var(--font-sans)" }}>{msg}</div>;
  }

  const r: ReadinessResult = data.result;
  const st = STATUS_UI[r.overallStatus] ?? STATUS_UI.not_ready;
  const docs = [r.documents.brd, r.documents.srs].filter(Boolean) as NonNullable<typeof r.documents.brd>[];

  const visibleIssues = r.issues.filter((i) =>
    (filter === "all" || i.severity === filter) && (scopeFilter === "all" || i.scope === scopeFilter)
  );

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} style={{
      padding: "6px 13px", borderRadius: 999, cursor: "pointer",
      border: `1px solid ${active ? "var(--teal-300)" : "var(--border-default)"}`,
      background: active ? "var(--teal-50)" : "var(--surface-card)",
      color: active ? "var(--teal-700)" : "var(--text-muted)",
      font: `var(--weight-${active ? "semibold" : "medium"}) 12px var(--font-sans)`, whiteSpace: "nowrap",
    }}>{label}</button>
  );

  const summaryTiles: Array<[string, number, string?]> = [
    ["إجمالي المتطلبات", r.requirementsSummary.total],
    ["المعتمد", r.requirementsSummary.approved, "var(--green-600)"],
    ["تحت المراجعة", r.requirementsSummary.inReview],
    ["المسودات", r.requirementsSummary.drafts],
    ["تحتاج معلومات", r.requirementsSummary.needsInfo, r.requirementsSummary.needsInfo ? "var(--amber-600)" : undefined],
    ["المحظورة", r.requirementsSummary.blocked, r.requirementsSummary.blocked ? "var(--red-600)" : undefined],
    ["بلا معايير قبول", r.requirementsSummary.withoutCriteria],
    ["غير المحللة", r.requirementsSummary.notAnalyzed],
    ["منخفضة الجودة", r.requirementsSummary.lowQuality],
    ["أسئلة مفتوحة", r.requirementsSummary.openQuestions],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        .rd-head { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
        .rd-hero { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
        .rd-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 14px; }
        .rd-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
        .rd-filters { display: flex; gap: 8px; flex-wrap: wrap; }
      `}</style>

      {/* الرأس */}
      <div className="rd-head">
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ font: "var(--weight-bold) 20px/1.3 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>جاهزية المشروع</h1>
          <p style={{ font: "13px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "5px 0 0" }}>
            هل المشروع جاهز للتسليم أو إصدار الوثائق المطلوبة، وما الذي ينقصه بالتحديد؟
          </p>
          <div style={{ font: "11.5px var(--font-sans)", color: "var(--text-subtle)", marginTop: 6 }}>
            آخر احتساب: {new Date(r.calculatedAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })} — يُحسب من بياناتك المحفوظة دون ذكاء اصطناعي ولا يستهلك حصتك.
          </div>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={busy}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-strong)", font: "var(--weight-semibold) 12.5px var(--font-sans)", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}
        >
          <Icon name="refresh-cw" size={14} style={busy ? { animation: "wq-spin 0.8s linear infinite" } : undefined} /> إعادة احتساب
        </button>
      </div>

      {/* الدرجة العامة */}
      <div style={{ ...card, background: "linear-gradient(165deg, var(--surface-card), var(--teal-50))" }}>
        <div className="rd-hero">
          <ScoreRing score={r.overallScore} tone={st.fg} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <span style={{ display: "inline-flex", padding: "5px 14px", borderRadius: 999, background: st.bg, color: st.fg, font: "var(--weight-bold) 13px/1 var(--font-sans)" }}>{r.statusLabel}</span>
            <p style={{ font: "13.5px/1.8 var(--font-sans)", color: "var(--text-strong)", margin: "10px 0 0", maxWidth: 480 }}>{r.statusMessage}</p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
              {[
                ["نواقص حرجة", r.counts.critical, "var(--red-600)"],
                ["تحسينات مهمة", r.counts.important, "var(--amber-600)"],
                ["اقتراحات", r.counts.optional, "var(--text-muted)"],
              ].map(([l, v, cFg]) => (
                <span key={l as string} style={{ font: "12.5px var(--font-sans)", color: "var(--text-muted)" }}>
                  <b style={{ color: cFg as string, fontSize: 15 }}>{v as number}</b> {l as string}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {data.limited && (
        <div style={{ ...card, display: "flex", gap: 10, alignItems: "flex-start", background: "var(--blue-50)", border: "1px solid var(--border-subtle)" }}>
          <Icon name="gem" size={16} color="var(--blue-600)" style={{ marginTop: 2 }} />
          <span style={{ font: "12.5px/1.7 var(--font-sans)", color: "var(--text-strong)" }}>
            أنت تشاهد ملخص الجاهزية. الترقية تتيح التفاصيل الكاملة: جاهزية الوثائق، كل الملاحظات، والفلاتر. <a href="/pricing" style={{ color: "var(--blue-600)", fontWeight: 600 }}>عرض الباقات</a>
          </span>
        </div>
      )}

      {/* الوثائق المفعلة فقط */}
      {docs.length > 0 && (
        <div className="rd-grid">
          {docs.map((d) => {
            const dst = STATUS_UI[d.status] ?? STATUS_UI.not_ready;
            return (
              <div key={d.type} style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <Icon name="file-text" size={16} color="var(--teal-600)" />
                  <span style={{ font: "var(--weight-bold) 14.5px var(--font-sans)", color: "var(--text-strong)" }}>
                    {d.type === "BRD" ? "وثيقة متطلبات الأعمال BRD" : "وثيقة متطلبات النظام SRS"}
                  </span>
                  <span style={{ padding: "3px 10px", borderRadius: 999, background: d.applicability === "REQUIRED" ? "var(--teal-50)" : "var(--slate-100)", color: d.applicability === "REQUIRED" ? "var(--teal-700)" : "var(--text-muted)", font: "var(--weight-semibold) 11px var(--font-sans)" }}>
                    {d.applicability === "REQUIRED" ? "وثيقة مطلوبة" : "وثيقة اختيارية"}
                  </span>
                </div>
                {d.applicability === "OPTIONAL" && (
                  <div style={{ font: "11.5px/1.6 var(--font-sans)", color: "var(--text-subtle)", marginTop: 6 }}>
                    هذه الوثيقة اختيارية ولا تؤثر على جاهزية المشروع العامة.
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
                  <span style={{ font: "var(--weight-bold) 26px/1 var(--font-sans)", color: dst.fg }}>{d.score}%</span>
                  <span style={{ padding: "4px 12px", borderRadius: 999, background: dst.bg, color: dst.fg, font: "var(--weight-semibold) 12px var(--font-sans)" }}>{d.statusLabel}</span>
                </div>
                {d.topIssues.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                    {d.topIssues.slice(0, 3).map((i, idx) => (
                      <li key={idx} style={{ display: "flex", gap: 7, font: "12px/1.6 var(--font-sans)", color: "var(--text-muted)" }}>
                        <Icon name={SEV_UI[i.severity].icon} size={13} color={SEV_UI[i.severity].fg} style={{ marginTop: 2, flexShrink: 0 }} />
                        {i.title}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => onExport(d.type === "BRD" ? "brd" : "srs")}
                  style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 15px", borderRadius: "var(--radius-pill)", border: "none", background: "var(--primary)", color: "#fff", font: "var(--weight-semibold) 12.5px var(--font-sans)", cursor: "pointer" }}
                >
                  <Icon name="download" size={13} color="#fff" /> تجهيز الوثيقة
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* محاور الجاهزية */}
      {!data.limited && (
        <div style={card}>
          <h2 style={{ font: "var(--weight-bold) 15px var(--font-sans)", color: "var(--text-strong)", margin: "0 0 14px" }}>محاور الجاهزية</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {r.axes.filter((a) => a.applied).map((a) => {
              const ast = STATUS_UI[a.status] ?? STATUS_UI.not_ready;
              return (
                <div key={a.key}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ font: "var(--weight-semibold) 13px var(--font-sans)", color: "var(--text-strong)" }}>{a.label}</span>
                    <span style={{ font: "11px var(--font-sans)", color: "var(--text-subtle)" }}>الوزن {a.weight}%</span>
                    {a.issues.length > 0 && <span style={{ font: "11px var(--font-sans)", color: "var(--text-subtle)" }}>· {a.issues.length} ملاحظة</span>}
                    <span style={{ marginInlineStart: "auto", font: "var(--weight-bold) 13px var(--font-sans)", color: ast.fg }}>{a.score}%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: "var(--slate-100)", overflow: "hidden" }}>
                    <div style={{ width: `${a.score}%`, height: "100%", borderRadius: 999, background: ast.fg }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* الإجراءات المطلوبة */}
      <div style={card}>
        <h2 style={{ font: "var(--weight-bold) 15px var(--font-sans)", color: "var(--text-strong)", margin: "0 0 12px" }}>الإجراءات المطلوبة</h2>
        {!data.limited && (
          <div className="rd-filters" style={{ marginBottom: 14 }}>
            {chip("الكل", filter === "all", () => setFilter("all"))}
            {chip("حرج", filter === "critical", () => setFilter("critical"))}
            {chip("مهم", filter === "important", () => setFilter("important"))}
            {chip("اختياري", filter === "optional", () => setFilter("optional"))}
            <span style={{ width: 1, background: "var(--border-subtle)", margin: "0 4px" }} />
            {chip("المشروع", scopeFilter === "project", () => setScopeFilter(scopeFilter === "project" ? "all" : "project"))}
            {chip("المتطلبات", scopeFilter === "requirements", () => setScopeFilter(scopeFilter === "requirements" ? "all" : "requirements"))}
            {r.documents.brd && chip("BRD", scopeFilter === "brd", () => setScopeFilter(scopeFilter === "brd" ? "all" : "brd"))}
            {r.documents.srs && chip("SRS", scopeFilter === "srs", () => setScopeFilter(scopeFilter === "srs" ? "all" : "srs"))}
          </div>
        )}
        {visibleIssues.length === 0 ? (
          <div style={{ padding: "22px 0", textAlign: "center", color: "var(--text-muted)", font: "13px var(--font-sans)" }}>
            {r.issues.length === 0 ? "لا توجد ملاحظات — عمل ممتاز! ✨" : "لا ملاحظات ضمن الفلتر الحالي."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleIssues.map((i: ReadinessIssue, idx) => {
              const ui = SEV_UI[i.severity];
              return (
                <div key={`${i.code}-${idx}`} style={{ border: `1px solid ${ui.border}`, borderRadius: "var(--radius-lg)", padding: "12px 15px", background: i.severity === "critical" ? ui.bg : "var(--surface-card)" }}>
                  <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <Icon name={ui.icon} size={15} color={ui.fg} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ font: "var(--weight-semibold) 13px/1.5 var(--font-sans)", color: "var(--text-strong)" }}>{i.title}</span>
                        <span style={{ padding: "2px 9px", borderRadius: 999, background: ui.bg, color: ui.fg, font: "var(--weight-semibold) 10.5px var(--font-sans)" }}>{SEV_AR[i.severity]}</span>
                      </div>
                      <p style={{ font: "12px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "4px 0 0" }}>{i.description}</p>
                    </div>
                    {i.fixAction && i.actionLabel && (
                      <button
                        onClick={() => onFix(i.fixAction as string)}
                        style={{ flexShrink: 0, height: 32, padding: "0 13px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--blue-600)", font: "var(--weight-semibold) 12px var(--font-sans)", cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        {i.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ملخص المتطلبات */}
      <div style={card}>
        <h2 style={{ font: "var(--weight-bold) 15px var(--font-sans)", color: "var(--text-strong)", margin: "0 0 14px" }}>ملخص المتطلبات</h2>
        <div className="rd-tiles">
          {summaryTiles.map(([label, value, tone]) => (
            <div key={label as string} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "10px 13px" }}>
              <div style={{ font: "var(--weight-bold) 19px/1 var(--font-sans)", color: (tone as string) ?? "var(--text-strong)" }}>{value as number}</div>
              <div style={{ font: "11px/1.5 var(--font-sans)", color: "var(--text-subtle)", marginTop: 4 }}>{label as string}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Badge, Button, Card, ConfidenceMeter, Icon, PriorityLabel, StatusBadge } from "@/components/ds";
import { type Requirement } from "@/lib/data";
import { getPlan } from "@/lib/plans";
import { useWorkspaceData } from "./WorkspaceDataContext";
import type { UsageInfo } from "@/lib/workspace-data";

export interface OverviewScreenProps {
  onOpen?: (req: Requirement | null) => void;
  onNewAnalysis?: () => void;
}

/* Compact plan + usage card for the dashboard. */
function UsageCard({ usage }: { usage: UsageInfo }) {
  const plan = getPlan(usage.plan);
  const limit = usage.analysisLimit; // null = unlimited
  const used = usage.analysisCount;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const nearLimit = limit != null && used >= limit;
  const canUpgrade = usage.plan !== "ENTERPRISE";

  return (
    <Card padding="lg" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            width: 40, height: 40, borderRadius: "var(--radius-md)", flex: "0 0 40px",
            background: "linear-gradient(150deg, var(--teal-50), var(--blue-50))",
            border: "1px solid var(--teal-100)", display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name="gem" size={20} color="var(--teal-600)" />
        </span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ font: "var(--weight-semibold) 14px/1 var(--font-sans)", color: "var(--text-strong)" }}>
              الخطة: {plan.name}
            </span>
            <Badge tone={usage.plan === "FREE" ? "neutral" : "ai"}>{plan.tag}</Badge>
          </div>
          <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 4 }}>
            {limit == null ? (
              <>التحليلات: <b style={{ color: "var(--text-body)" }}>غير محدودة</b></>
            ) : (
              <>التحليلات المستخدمة: <b style={{ color: nearLimit ? "var(--red-600)" : "var(--text-body)" }}>{used}</b> من {limit}</>
            )}
          </div>
          {limit != null && (
            <div style={{ height: 7, borderRadius: 999, background: "var(--slate-150)", overflow: "hidden", marginTop: 8, maxWidth: 320 }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: nearLimit ? "var(--red-500)" : "var(--teal-500)", transition: "width var(--dur-base)" }} />
            </div>
          )}
        </div>
        {canUpgrade && (
          <a
            href="/pricing"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px",
              borderRadius: "var(--radius-pill)", background: "var(--primary)", color: "#fff",
              font: "var(--weight-semibold) 14px var(--font-sans)", textDecoration: "none",
            }}
          >
            <Icon name="arrow-up" size={15} color="#fff" /> ترقية الخطة
          </a>
        )}
      </div>
    </Card>
  );
}

const STATUS_META = [
  { id: "approved", label: "معتمد", c: "var(--green-500)" },
  { id: "review", label: "قيد المراجعة", c: "var(--amber-500)" },
  { id: "needs_info", label: "بحاجة لمعلومات", c: "var(--teal-500)" },
  { id: "analyzing", label: "قيد التحليل", c: "var(--blue-600)" },
  { id: "draft", label: "مسودة", c: "var(--slate-400)" },
  { id: "blocked", label: "محظور", c: "var(--red-500)" },
];

/* Project overview — BA-specific readiness view, computed from the user's
   real data. Shows an onboarding empty state for brand-new workspaces. */
export function OverviewScreen({ onOpen, onNewAnalysis }: OverviewScreenProps) {
  const { requirements, acceptanceCriteria, openQuestions, usage, activeProject } = useWorkspaceData();

  const total = requirements.length;
  const projectName = activeProject?.name ?? "مساحة العمل";
  const projectCode = activeProject?.code ?? "";

  // ---- empty state (new account) ----
  if (total === 0) {
    return (
      <div style={{ padding: "24px 28px 40px", maxWidth: 1120, margin: "0 auto" }}>
        {usage && <UsageCard usage={usage} />}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 14,
            padding: "48px 28px",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--radius-xl)",
            background: "var(--surface-card)",
          }}
        >
          <span
            style={{
              width: 60,
              height: 60,
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(150deg, var(--teal-50), var(--blue-50))",
              border: "1px solid var(--teal-100)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="sparkles" size={28} color="var(--teal-600)" />
          </span>
          <h1 style={{ font: "var(--weight-bold) 24px/1.3 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>
            مرحبًا بك في وثّق 👋
          </h1>
          <p style={{ font: "15px/1.8 var(--font-sans)", color: "var(--text-muted)", maxWidth: 460, margin: 0 }}>
            مساحتك جاهزة وفارغة. ابدأ بتحليل أول وثيقة متطلبات بالذكاء الاصطناعي، أو أضف متطلبًا يدويًّا — وستظهر هنا مؤشرات جاهزية مشروعك.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            <Button variant="primary" iconStart={<Icon name="sparkles" size={16} />} onClick={() => onNewAnalysis && onNewAnalysis()}>
              ابدأ أول تحليل
            </Button>
            <Button variant="secondary" iconStart={<Icon name="plus" size={15} />} onClick={() => onOpen && onOpen(null)}>
              إضافة متطلب يدويًّا
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- derived metrics ----
  const statusCounts: Record<string, number> = {};
  for (const r of requirements) statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;

  const stakeholders = new Set<string>();
  for (const r of requirements) r.stakeholders.forEach((s) => stakeholders.add(s));

  const approved = statusCounts["approved"] || 0;
  const review = statusCounts["review"] || 0;
  const readiness = Math.round(((approved + review * 0.5) / total) * 100);

  const confs = requirements.map((r) => r.confidence).filter((c): c is number => c != null);
  const avgConf = confs.length ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length) : 0;

  const doneCriteria = acceptanceCriteria.filter((c) => c.done).length;
  const coverage = acceptanceCriteria.length ? Math.round((doneCriteria / acceptanceCriteria.length) * 100) : 0;

  // Missing info: requirements needing info, then low-confidence ones.
  const needsInfo = requirements.filter((r) => r.status === "needs_info");
  const lowConf = requirements.filter((r) => r.confidence != null && r.confidence < 60 && r.status !== "needs_info");
  const missing = [
    ...needsInfo.map((r) => ({ r, text: `«${r.title}» بحاجة لمعلومات إضافية قبل الاعتماد.`, sev: "high" as const })),
    ...lowConf.map((r) => ({ r, text: `ثقة منخفضة (${r.confidence}٪) — يُنصح بمراجعة بشرية.`, sev: "medium" as const })),
  ].slice(0, 5);

  const readinessTone = readiness >= 75 ? "success" : readiness >= 40 ? "warning" : "danger";

  return (
    <div style={{ padding: "24px 28px 40px", maxWidth: 1120, margin: "0 auto" }}>
      {usage && <UsageCard usage={usage} />}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ font: "var(--weight-semibold) var(--text-h1)/1.2 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>
          {projectName}
        </h1>
        <p
          style={{
            font: "14px/1.5 var(--font-sans)",
            color: "var(--text-muted)",
            margin: "6px 0 0",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ font: "12px var(--font-mono)", color: "var(--text-subtle)", direction: "ltr" }}>{projectCode}</span>
          <span>·</span>
          <span>{total} متطلب</span>
          <span>·</span>
          <span>{stakeholders.size} أصحاب مصلحة</span>
        </p>
      </div>

      {/* readiness band */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 16, marginBottom: 16 }}>
        <Card padding="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ font: "var(--weight-semibold) 14px var(--font-sans)", color: "var(--text-strong)" }}>
              جاهزية المتطلبات للاعتماد
            </span>
            <Badge tone={readinessTone}>{readiness}٪</Badge>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: "var(--slate-150)", overflow: "hidden", display: "flex" }}>
            {STATUS_META.map((s) => {
              const w = ((statusCounts[s.id] || 0) / total) * 100;
              return w > 0 ? <div key={s.id} style={{ width: `${w}%`, background: s.c }} /> : null;
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14 }}>
            {STATUS_META.filter((s) => statusCounts[s.id]).map((s) => (
              <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "12px var(--font-sans)", color: "var(--text-muted)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} /> {s.label}
                <span style={{ font: "11px var(--font-mono)", color: "var(--text-subtle)" }}>{statusCounts[s.id]}</span>
              </span>
            ))}
          </div>
        </Card>
        <Card padding="lg" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={{ font: "12px var(--font-sans)", color: "var(--text-muted)", marginBottom: 8 }}>تغطية معايير القبول</span>
          <div style={{ font: "var(--weight-bold) 32px/1 var(--font-sans)", color: "var(--text-strong)" }}>
            {coverage}<span style={{ fontSize: 18, color: "var(--text-muted)" }}>٪</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <ConfidenceMeter value={coverage} label={`${doneCriteria} من ${acceptanceCriteria.length} مكتملة`} />
          </div>
        </Card>
        <Card padding="lg" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={{ font: "12px var(--font-sans)", color: "var(--text-muted)", marginBottom: 8 }}>متوسط ثقة الذكاء الاصطناعي</span>
          <div style={{ font: "var(--weight-bold) 32px/1 var(--font-sans)", color: "var(--teal-600)" }}>
            {avgConf}<span style={{ fontSize: 18, color: "var(--text-muted)" }}>٪</span>
          </div>
          <div style={{ marginTop: 10, font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
            {lowConf.length > 0
              ? `${lowConf.length} متطلب بثقة منخفضة يحتاج مراجعة بشرية.`
              : "لا توجد متطلبات بثقة منخفضة."}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 16 }}>
        {/* Missing information */}
        <Card padding="none">
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
            <Icon name="alert-triangle" size={17} color="var(--amber-600)" />
            <span style={{ font: "var(--weight-semibold) 14px var(--font-sans)", color: "var(--text-strong)" }}>معلومات ناقصة</span>
            <Badge tone={missing.length ? "warning" : "success"} style={{ marginInlineStart: "auto" }}>
              {missing.length}
            </Badge>
          </div>
          {missing.length === 0 ? (
            <div style={{ padding: "22px 18px", font: "13px/1.6 var(--font-sans)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="check-circle" size={16} color="var(--green-500)" /> لا توجد معلومات ناقصة — كل المتطلبات مكتملة.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {missing.map((m, i) => (
                <button
                  key={m.r.id}
                  onClick={() => onOpen && onOpen(m.r)}
                  style={{
                    display: "flex", gap: 11, alignItems: "flex-start", padding: "13px 18px",
                    borderTop: i ? "1px solid var(--border-subtle)" : "none",
                    background: "transparent", border: "none", cursor: "pointer", textAlign: "start",
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.sev === "high" ? "var(--red-500)" : "var(--amber-500)", marginTop: 6, flex: "0 0 7px" }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ font: "var(--font-mono-id)", color: "var(--blue-700)", direction: "ltr" }}>{m.r.id}</span>
                    <div style={{ font: "13px/1.5 var(--font-sans)", color: "var(--text-body)", marginTop: 3 }}>{m.text}</div>
                  </div>
                  <Icon name="chevron-left" size={15} color="var(--text-subtle)" />
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Recently analyzed */}
        <Card padding="none">
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
            <Icon name="clock" size={17} color="var(--text-muted)" />
            <span style={{ font: "var(--weight-semibold) 14px var(--font-sans)", color: "var(--text-strong)" }}>أحدث المتطلبات</span>
            <Button variant="ghost" size="sm" style={{ marginInlineStart: "auto" }} onClick={() => onOpen && onOpen(null)}>
              عرض الكل
            </Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {requirements.slice(0, 4).map((r, i) => (
              <button
                key={r.id}
                onClick={() => onOpen && onOpen(r)}
                style={{
                  display: "flex", gap: 11, alignItems: "center", padding: "12px 18px",
                  borderTop: i ? "1px solid var(--border-subtle)" : "none",
                  background: "transparent", border: "none", cursor: "pointer", textAlign: "start",
                }}
              >
                <PriorityLabel level={r.priority} showLabel={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ font: "var(--font-mono-id)", color: "var(--text-muted)", direction: "ltr", fontSize: 12 }}>{r.id}</span>
                  <div style={{ font: "var(--weight-medium) 13px/1.4 var(--font-sans)", color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.title}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

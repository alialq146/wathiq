"use client";

import React from "react";
import { Badge, Button, Card, ConfidenceMeter, Icon, PriorityLabel, StatusBadge } from "@/components/ds";
import { type Requirement } from "@/lib/data";
import { getPlan } from "@/lib/plans";
import { useWorkspaceData } from "./WorkspaceDataContext";
import { ProjectContextSection } from "./ProjectContextSection";
import { OnboardingChecklist } from "./OnboardingChecklist";
import type { UsageInfo } from "@/lib/workspace-data";
import { arCount, arReqCount } from "@/lib/arabic";
import { trackClientEvent } from "@/app/actions";

export interface OverviewScreenProps {
  onOpen?: (req: Requirement | null) => void;
  onNewAnalysis?: () => void;
  onNewProject?: () => void;
  onGoToRequirements?: () => void;
  /** v2.3: فتح شاشة جاهزية المشروع. */
  onOpenReadiness?: () => void;
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
              الخطة الحالية: {plan.name}
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
            onClick={() => void trackClientEvent("upgrade_clicked", { from: "overview-usage-card" })}
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

/* ---- getting-started guidance ---- */

type StepState = "done" | "current" | "pending";

const STEP_UI: Record<StepState, { bg: string; fg: string; border: string }> = {
  done: { bg: "var(--green-50)", fg: "var(--green-600)", border: "var(--green-100)" },
  current: { bg: "var(--blue-50)", fg: "var(--blue-600)", border: "var(--blue-100)" },
  pending: { bg: "var(--slate-50)", fg: "var(--text-subtle)", border: "var(--border-subtle)" },
};

function StepChip({ n, label, state }: { n: number; label: string; state: StepState }) {
  const ui = STEP_UI[state];
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px",
        borderRadius: "var(--radius-pill)", background: ui.bg, border: `1px solid ${ui.border}`,
        font: `var(--weight-${state === "current" ? "semibold" : "medium"}) 12.5px/1 var(--font-sans)`, color: ui.fg,
        whiteSpace: "nowrap",
      }}
    >
      {state === "done" ? <Icon name="check" size={13} color="var(--green-600)" /> : <b style={{ fontSize: 11 }}>{n}</b>}
      {label}
    </span>
  );
}

/**
 * Compact progress strip shown until the first analysis succeeds — then it
 * disappears on its own. Never intrusive: one row of step chips + one line.
 */
function GettingStartedStrip({
  states,
  currentLabel,
  onPrimary,
  primaryLabel,
}: {
  states: [StepState, StepState, StepState, StepState];
  currentLabel: string;
  onPrimary?: () => void;
  primaryLabel: string;
}) {
  const labels = ["إنشاء مشروع", "إضافة متطلبات", "تنفيذ التحليل", "مراجعة النتائج"];
  return (
    <Card padding="lg" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ font: "var(--weight-semibold) 13px/1 var(--font-sans)", color: "var(--text-strong)", marginBottom: 10 }}>
            خطوات البدء
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {labels.map((l, i) => (
              <StepChip key={l} n={i + 1} label={l} state={states[i]} />
            ))}
          </div>
          <div style={{ font: "12.5px/1.6 var(--font-sans)", color: "var(--text-muted)", marginTop: 10 }}>
            أنت الآن في خطوة {currentLabel}.
          </div>
        </div>
        {onPrimary && (
          <Button variant="primary" iconStart={<Icon name="sparkles" size={15} />} onClick={onPrimary}>
            {primaryLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}

const PRIORITY_META = [
  { id: "critical", label: "حرجة", c: "var(--red-500)" },
  { id: "high", label: "عالية", c: "var(--amber-500)" },
  { id: "medium", label: "متوسطة", c: "var(--blue-500)" },
  { id: "low", label: "منخفضة", c: "var(--slate-400)" },
];

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
export function OverviewScreen({ onOpen, onNewAnalysis, onNewProject, onGoToRequirements, onOpenReadiness }: OverviewScreenProps) {
  const { requirements, acceptanceCriteria, usage, activeProject, featureFlags } = useWorkspaceData();

  const total = requirements.length;
  const projectName = activeProject?.name ?? "مساحة العمل";
  const projectCode = activeProject?.code ?? "";

  const scrollToContext = () => {
    document.getElementById("project-context-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const checklist = (
    <OnboardingChecklist
      onNewProject={onNewProject}
      onAddContext={scrollToContext}
      onAddModule={scrollToContext}
      onAddRequirement={() => onOpen && onOpen(null)}
      onOpenAssistant={() => onNewAnalysis && onNewAnalysis()}
      onExport={() => onGoToRequirements && onGoToRequirements()}
    />
  );

  // ---- first-time onboarding (no requirements yet) ----
  if (total === 0) {
    const hasProject = Boolean(activeProject);
    const steps = [
      {
        icon: "folder-plus",
        title: "أنشئ مشروعك الأول",
        desc: "ابدأ مساحة عمل تجمع فيها وثائق ومتطلبات مشروعك.",
        state: (hasProject ? "done" : "current") as StepState,
      },
      {
        icon: "upload",
        title: "أضف المتطلبات",
        desc: "ارفع ملف PDF أو أدخل المتطلبات يدويًا داخل المشروع.",
        state: (hasProject ? "current" : "pending") as StepState,
      },
      {
        icon: "sparkles",
        title: "راجع تحليل وثّق",
        desc: "اطّلع على مؤشر الجودة، نقاط الغموض، الأسئلة المقترحة، ومعايير القبول.",
        state: "pending" as StepState,
      },
    ];
    return (
      <div style={{ padding: "24px 28px 40px", maxWidth: 1120, margin: "0 auto" }}>
        {usage && <UsageCard usage={usage} />}
        <div
          style={{
            marginTop: 24,
            padding: "36px 28px",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            background: "var(--surface-card)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
            <span
              style={{
                width: 56, height: 56, borderRadius: "var(--radius-lg)",
                background: "linear-gradient(150deg, var(--teal-50), var(--blue-50))",
                border: "1px solid var(--teal-100)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon name="sparkles" size={26} color="var(--teal-600)" />
            </span>
            <h1 style={{ font: "var(--weight-bold) 23px/1.3 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>
              مرحبًا بك في وثّق
            </h1>
            <p style={{ font: "14.5px/1.8 var(--font-sans)", color: "var(--text-muted)", maxWidth: 520, margin: 0 }}>
              ابدأ بتنظيم متطلبات مشروعك، ثم ارفع وثيقة المتطلبات أو أضف المتطلبات يدويًا
              ليقوم وثّق بتحليلها واكتشاف نقاط الغموض والتوصيات.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 14, margin: "26px 0" }}>
            {steps.map((s, i) => {
              const ui = STEP_UI[s.state];
              return (
                <div
                  key={s.title}
                  style={{
                    padding: "16px 16px 14px",
                    borderRadius: "var(--radius-lg)",
                    border: `1px solid ${s.state === "current" ? "var(--blue-200)" : "var(--border-subtle)"}`,
                    background: s.state === "current" ? "var(--blue-50)" : "var(--surface-card)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                    <span
                      style={{
                        width: 26, height: 26, borderRadius: "50%", flex: "0 0 26px",
                        background: ui.bg, border: `1px solid ${ui.border}`, color: ui.fg,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        font: "var(--weight-bold) 12px var(--font-sans)",
                      }}
                    >
                      {s.state === "done" ? <Icon name="check" size={14} color="var(--green-600)" /> : i + 1}
                    </span>
                    <Icon name={s.icon} size={17} color="var(--teal-600)" />
                    <span style={{ font: "var(--weight-semibold) 13.5px/1.4 var(--font-sans)", color: "var(--text-strong)" }}>
                      {s.title}
                    </span>
                  </div>
                  <p style={{ font: "12.5px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>{s.desc}</p>
                  {s.state === "done" && (
                    <div style={{ font: "11.5px var(--font-sans)", color: "var(--green-600)", marginTop: 8 }}>
                      مكتملة — مشروعك «{activeProject?.name}» جاهز.
                    </div>
                  )}
                  {s.state === "current" && (
                    <div style={{ font: "11.5px var(--font-sans)", color: "var(--blue-600)", marginTop: 8 }}>الخطوة الحالية</div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <Button variant="primary" iconStart={<Icon name="upload" size={15} />} onClick={() => onNewAnalysis && onNewAnalysis()}>
              ارفع وثيقة متطلبات
            </Button>
            <Button variant="secondary" iconStart={<Icon name="plus" size={15} />} onClick={() => onOpen && onOpen(null)}>
              أضف متطلبًا يدويًا
            </Button>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>{checklist}</div>
        {/* سياق المشروع ووحداته متاحان من أول لحظة — قبل إضافة أي متطلب — لأن الرحلة
            الطبيعية للمحلل: سياق ← وحدات ← متطلبات. اختياري دائمًا ولا يعيق البدء. */}
        <div id="project-context-anchor" style={{ marginTop: 20 }}>
          <ProjectContextSection />
        </div>
      </div>
    );
  }

  // First analysis not done yet → show the compact guidance strip.
  const hasAnalyzed =
    (usage?.analysisCount ?? 0) > 0 ||
    requirements.some((r) => r.analysis != null || r.confidence != null);

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
      {checklist}
      {!hasAnalyzed && (
        <GettingStartedStrip
          states={["done", "done", "current", "pending"]}
          currentLabel="تنفيذ التحليل"
          primaryLabel="ابدأ أول تحليل"
          onPrimary={() => onNewAnalysis && onNewAnalysis()}
        />
      )}
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
          <span>{arReqCount(total)}</span>
          <span>·</span>
          <span>{arCount(stakeholders.size, { one: "صاحب مصلحة واحد", two: "صاحبا مصلحة", few: "أصحاب مصلحة", many: "صاحب مصلحة" })}</span>
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
          {/* مؤشر اختياري — يظهر فقط إذا استُخدم مساعد وثّق؛ الملخصات الأخرى لا تعتمد على AI. */}
          <span style={{ font: "12px var(--font-sans)", color: "var(--text-muted)", marginBottom: 8 }}>متوسط مؤشر الجودة</span>
          {confs.length === 0 ? (
            <div style={{ font: "13px/1.7 var(--font-sans)", color: "var(--text-subtle)" }}>
              لم يُستخدم مساعد وثّق بعد — المؤشر اختياري ويُحسب عند تحليل المتطلبات.
            </div>
          ) : (
            <>
              <div style={{ font: "var(--weight-bold) 32px/1 var(--font-sans)", color: "var(--teal-600)" }}>
                {avgConf}<span style={{ fontSize: 18, color: "var(--text-muted)" }}>٪</span>
              </div>
              <div style={{ marginTop: 10, font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
                {lowConf.length > 0
                  ? `${lowConf.length} متطلب بمؤشر منخفض يحتاج مراجعة بشرية.`
                  : "لا توجد متطلبات بمؤشر منخفض."}
              </div>
            </>
          )}
        </Card>
        <Card padding="lg">
          {/* توزيع الأولويات — محسوب من الحقول مباشرة، بلا ذكاء اصطناعي. */}
          <span style={{ font: "12px var(--font-sans)", color: "var(--text-muted)", marginBottom: 12, display: "block" }}>حسب الأولوية</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PRIORITY_META.map((p) => {
              const n = requirements.filter((r) => r.priority === p.id).length;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ font: "12px var(--font-sans)", color: "var(--text-muted)", width: 52, flexShrink: 0 }}>{p.label}</span>
                  <div style={{ flex: 1, height: 7, borderRadius: 999, background: "var(--slate-150)", overflow: "hidden" }}>
                    <div style={{ width: `${total ? (n / total) * 100 : 0}%`, height: "100%", background: p.c, borderRadius: 999 }} />
                  </div>
                  <span style={{ font: "11px var(--font-mono)", color: "var(--text-subtle)", width: 20, textAlign: "end" }}>{n}</span>
                </div>
              );
            })}
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

      {/* v2.3: بطاقة جاهزية المشروع المختصرة — تظهر فقط عند تفعيل الميزة */}
      {featureFlags.readinessEnabled && activeProject && (
        <div style={{ marginTop: 20 }}>
          <ReadinessMiniCard projectId={activeProject.id} onOpen={onOpenReadiness} />
        </div>
      )}

      {/* سياق المشروع ووحداته (v1.9.9) — اختياريان بالكامل */}
      <div id="project-context-anchor" style={{ marginTop: 20 }}>
        <ProjectContextSection />
      </div>
    </div>
  );
}

/* بطاقة الجاهزية المختصرة — تحميل كسول من الخادم (لا AI ولا استهلاك حصة). */
function ReadinessMiniCard({ projectId, onOpen }: { projectId: string; onOpen?: () => void }) {
  const [state, setState] = React.useState<{ score: number; label: string; critical: number; important: number } | null | "error">(null);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { getProjectReadiness } = await import("@/app/actions");
        const res = await getProjectReadiness(projectId);
        if (!alive) return;
        if (res.ok && res.result) {
          setState({ score: res.result.overallScore, label: res.result.statusLabel, critical: res.result.counts.critical, important: res.result.counts.important });
        } else setState("error");
      } catch { if (alive) setState("error"); }
    })();
    return () => { alive = false; };
  }, [projectId]);

  if (state === "error") return null; // الميزة معطلة أو خطأ — لا ضوضاء في النظرة العامة
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--teal-50)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="target" size={19} color="var(--teal-600)" />
        </span>
        <div style={{ flex: 1, minWidth: 200 }}>
          {state === null ? (
            <div style={{ height: 34, borderRadius: 8, background: "var(--slate-100)", maxWidth: 280 }} />
          ) : (
            <>
              <div style={{ font: "var(--weight-bold) 15px/1.3 var(--font-sans)", color: "var(--text-strong)" }}>
                جاهزية المشروع: {state.score}% — {state.label}
              </div>
              <div style={{ font: "12px/1.6 var(--font-sans)", color: "var(--text-muted)", marginTop: 3 }}>
                {state.critical + state.important > 0
                  ? `يوجد ${state.critical + state.important} إجراءً مهمًا قبل اكتمال المشروع${state.critical ? ` (${state.critical} منها حرج)` : ""}.`
                  : "لا توجد نواقص جوهرية — عمل ممتاز."}
              </div>
            </>
          )}
        </div>
        <button onClick={onOpen} style={{ height: 36, padding: "0 16px", borderRadius: "var(--radius-pill)", border: "none", background: "var(--primary)", color: "#fff", font: "var(--weight-semibold) 12.5px var(--font-sans)", cursor: "pointer" }}>
          عرض الجاهزية
        </button>
      </div>
    </Card>
  );
}

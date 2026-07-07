"use client";

/**
 * قائمة «ابدأ مع وثّق» (v1.9.11) — إرشاد المستخدم الجديد عبر ست خطوات،
 * كل خطوة تُحسب حالتها من بيانات مساحة العمل الحقيقية (لا تتبع منفصل).
 * غير إجبارية: قابلة للطي والإخفاء (تُحفظ في localStorage)، وتختفي وحدها
 * عند اكتمال كل الخطوات — بلا أي استدعاء ذكاء اصطناعي.
 */

import React from "react";
import { Icon } from "@/components/ds";
import { useWorkspaceData } from "./WorkspaceDataContext";

const DISMISS_KEY = "wathiq_onboarding_dismissed";
const COLLAPSE_KEY = "wathiq_onboarding_collapsed";

export interface OnboardingChecklistProps {
  onAddContext?: () => void;
  onAddModule?: () => void;
  onAddRequirement?: () => void;
  onOpenAssistant?: () => void;
  onExport?: () => void;
  onNewProject?: () => void;
}

interface StepDef {
  key: string;
  label: string;
  done: boolean;
  actionLabel: string;
  onAction?: () => void;
}

export function OnboardingChecklist({
  onAddContext,
  onAddModule,
  onAddRequirement,
  onOpenAssistant,
  onExport,
  onNewProject,
}: OnboardingChecklistProps) {
  const { requirements, activeProject, modules, usage } = useWorkspaceData();
  const [dismissed, setDismissed] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    setReady(true);
  }, []);

  const hasContext = Boolean(
    activeProject &&
      (activeProject.projectIdea ||
        activeProject.projectGoal ||
        activeProject.targetUsers ||
        activeProject.projectScope ||
        activeProject.outOfScope ||
        activeProject.relatedSystems ||
        activeProject.constraints)
  );
  const analyzed = (usage?.analysisCount ?? 0) > 0 || requirements.some((r) => r.analysis != null || r.confidence != null);

  const steps: StepDef[] = [
    { key: "project", label: "أنشئ مشروعك الأول", done: Boolean(activeProject), actionLabel: "ابدأ", onAction: onNewProject },
    { key: "context", label: "أضف سياق المشروع", done: hasContext, actionLabel: "انتقل للسياق", onAction: onAddContext },
    { key: "modules", label: "أضف وحدات المشروع", done: (modules?.length ?? 0) > 0, actionLabel: "انتقل للوحدات", onAction: onAddModule },
    { key: "requirement", label: "أضف أول متطلب", done: requirements.length > 0, actionLabel: "أضف متطلبًا", onAction: onAddRequirement },
    { key: "assistant", label: "جرّب مساعد وثّق", done: analyzed, actionLabel: "شغّل المساعد", onAction: onOpenAssistant },
    { key: "export", label: "صدّر أول وثيقة BRD أو SRS", done: requirements.length > 0 && analyzed, actionLabel: "انتقل للتصدير", onAction: onExport },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  // لا نعرضها إذا: لم يُقرأ التخزين بعد، أُخفيت يدويًا، أو اكتملت كل الخطوات.
  if (!ready || dismissed || allDone) return null;

  const persist = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    try { localStorage.setItem(key, val ? "1" : "0"); } catch { /* تجاهل */ }
  };

  const pct = Math.round((doneCount / steps.length) * 100);
  const nextStep = steps.find((s) => !s.done);

  return (
    <div
      style={{
        marginBottom: 16,
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-xl)",
        background: "linear-gradient(160deg, var(--surface-card), var(--teal-50))",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
        <span
          style={{
            width: 34, height: 34, borderRadius: "var(--radius-md)", flex: "0 0 34px",
            background: "var(--teal-100)", display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name="rocket" size={17} color="var(--teal-600)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "var(--weight-bold) 14px/1.3 var(--font-sans)", color: "var(--text-strong)" }}>
            ابدأ مع وثّق
          </div>
          <div style={{ font: "12px/1.4 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>
            أكملت {doneCount} من {steps.length} خطوات · {pct}%
          </div>
        </div>
        <button
          onClick={() => persist(COLLAPSE_KEY, !collapsed, setCollapsed)}
          aria-label={collapsed ? "توسيع" : "طي"}
          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
        >
          <Icon name={collapsed ? "chevron-down" : "chevron-up"} size={17} color="var(--text-subtle)" />
        </button>
        <button
          onClick={() => persist(DISMISS_KEY, true, setDismissed)}
          aria-label="إخفاء الدليل"
          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
        >
          <Icon name="x" size={16} color="var(--text-subtle)" />
        </button>
      </div>

      {/* شريط تقدم */}
      <div style={{ height: 4, background: "var(--slate-100)", marginInline: 18, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--teal-500)", borderRadius: 999, transition: "width var(--dur-base)" }} />
      </div>

      {collapsed ? (
        nextStep && (
          <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ font: "12.5px var(--font-sans)", color: "var(--text-muted)", flex: 1 }}>
              الخطوة التالية: {nextStep.label}
            </span>
            {nextStep.onAction && (
              <button onClick={nextStep.onAction} style={actionBtnStyle}>{nextStep.actionLabel}</button>
            )}
          </div>
        )
      ) : (
        <div style={{ padding: "12px 18px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
          {steps.map((s) => (
            <div
              key={s.key}
              style={{
                display: "flex", alignItems: "center", gap: 11, padding: "8px 4px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <span
                style={{
                  width: 20, height: 20, borderRadius: 999, flex: "0 0 20px",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: s.done ? "var(--green-500)" : "transparent",
                  border: s.done ? "none" : "1.5px solid var(--border-default)",
                }}
              >
                {s.done && <Icon name="check" size={12} color="#fff" />}
              </span>
              <span
                style={{
                  flex: 1,
                  font: `var(--weight-${s.done ? "medium" : "semibold"}) 13px/1.4 var(--font-sans)`,
                  color: s.done ? "var(--text-subtle)" : "var(--text-strong)",
                  textDecoration: s.done ? "line-through" : "none",
                }}
              >
                {s.label}
              </span>
              {!s.done && s.onAction && (
                <button onClick={s.onAction} style={actionBtnStyle}>{s.actionLabel}</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--teal-100)",
  background: "var(--surface-card)",
  color: "var(--teal-600)",
  font: "var(--weight-semibold) 12px/1 var(--font-sans)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

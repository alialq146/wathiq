"use client";

import React from "react";
import { Icon } from "@/components/ds";
import { AppShell, type ScreenId } from "./AppShell";
import { OverviewScreen } from "./OverviewScreen";
import { RequirementsScreen } from "./RequirementsScreen";
import { RequirementDetail, DetailRail } from "./RequirementDetailScreen";
import { AnalysisScreen } from "./AnalysisScreen";
import {
  WorkspaceDataProvider,
  type WorkspaceDataValue,
} from "./WorkspaceDataContext";
import type { Requirement } from "@/lib/data";

const CONTEXT_LABELS: Partial<Record<ScreenId, string>> = {
  stakeholders: "أصحاب المصلحة",
  rules: "قواعد العمل",
  audit: "سجل التدقيق",
};

/** Minimal placeholder for the contextual nav routes the prototype lists. */
function PlaceholderScreen({ label }: { label: string }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        color: "var(--text-muted)",
        padding: 40,
        textAlign: "center",
      }}
    >
      <span
        style={{
          width: 52,
          height: 52,
          borderRadius: "var(--radius-lg)",
          background: "var(--slate-100)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="construction" size={24} color="var(--text-subtle)" />
      </span>
      <div style={{ font: "var(--weight-semibold) 16px var(--font-sans)", color: "var(--text-strong)" }}>{label}</div>
      <div style={{ font: "13px/1.6 var(--font-sans)", maxWidth: 360 }}>
        هذا القسم قيد الإعداد ضمن مساحة عمل وثّق.
      </div>
    </div>
  );
}

export function WorkspaceClient({ data }: { data: WorkspaceDataValue }) {
  const [screen, setScreen] = React.useState<ScreenId | "detail">("overview");
  const [req, setReq] = React.useState<Requirement | null>(null);
  const [analysisMode, setAnalysisMode] = React.useState<"text" | "pdf">("text");
  // Bumped on every navigation to Analysis so the screen remounts fresh in the chosen mode.
  const [analysisNonce, setAnalysisNonce] = React.useState(0);

  const openReq = (r: Requirement | null) => {
    if (r) {
      setReq(r);
      setScreen("detail");
    } else {
      setScreen("requirements");
    }
  };

  const openAnalysis = (mode: "text" | "pdf" = "text") => {
    setAnalysisMode(mode);
    setAnalysisNonce((n) => n + 1);
    setScreen("analysis");
  };

  // Sidebar "تحليل وثّق" and any other analysis navigation route through openAnalysis.
  const nav = (id: ScreenId) => {
    if (id === "analysis") openAnalysis("text");
    else setScreen(id);
  };

  let main: React.ReactNode;
  let rail: React.ReactNode = null;
  let current: ScreenId = screen === "detail" ? "requirements" : screen;

  if (screen === "overview") {
    main = <OverviewScreen onOpen={openReq} />;
  } else if (screen === "requirements") {
    main = <RequirementsScreen onOpen={openReq} onViewAnalysis={() => openAnalysis("text")} />;
  } else if (screen === "analysis") {
    main = <AnalysisScreen key={`analysis-${analysisNonce}`} initialMode={analysisMode} />;
  } else if (screen === "detail" && req) {
    main = <RequirementDetail req={req} onBack={() => setScreen("requirements")} />;
    rail = <DetailRail req={req} />;
    current = "requirements";
  } else if (CONTEXT_LABELS[screen as ScreenId]) {
    current = screen as ScreenId;
    main = <PlaceholderScreen label={CONTEXT_LABELS[screen as ScreenId] as string} />;
  } else {
    main = <OverviewScreen onOpen={openReq} />;
  }

  return (
    <WorkspaceDataProvider value={data}>
      <div id="app-root">
        <AppShell
          current={current}
          onNavigate={nav}
          onNewAnalysis={() => openAnalysis("text")}
          rightRail={rail}
        >
          {main}
        </AppShell>
      </div>
    </WorkspaceDataProvider>
  );
}

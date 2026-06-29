"use client";

import React from "react";
import { Icon } from "@/components/ds";
import { AppShell, type ScreenId } from "@/components/workspace/AppShell";
import { OverviewScreen } from "@/components/workspace/OverviewScreen";
import { RequirementsScreen } from "@/components/workspace/RequirementsScreen";
import {
  RequirementDetail,
  DetailRail,
} from "@/components/workspace/RequirementDetailScreen";
import { AnalysisScreen } from "@/components/workspace/AnalysisScreen";
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

export default function Page() {
  const [screen, setScreen] = React.useState<ScreenId | "detail">("overview");
  const [req, setReq] = React.useState<Requirement | null>(null);

  const openReq = (r: Requirement | null) => {
    if (r) {
      setReq(r);
      setScreen("detail");
    } else {
      setScreen("requirements");
    }
  };
  const nav = (id: ScreenId) => setScreen(id);

  let main: React.ReactNode;
  let rail: React.ReactNode = null;
  let current: ScreenId = screen === "detail" ? "requirements" : screen;

  if (screen === "overview") {
    main = <OverviewScreen onOpen={openReq} />;
  } else if (screen === "requirements") {
    main = <RequirementsScreen onOpen={openReq} />;
  } else if (screen === "analysis") {
    main = <AnalysisScreen />;
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
    <div id="app-root">
      <AppShell current={current} onNavigate={nav} rightRail={rail}>
        {main}
      </AppShell>
    </div>
  );
}

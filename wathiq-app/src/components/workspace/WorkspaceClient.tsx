"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ds";
import { AppShell, type ScreenId } from "./AppShell";
import { OverviewScreen } from "./OverviewScreen";
import { RequirementsScreen } from "./RequirementsScreen";
import { RequirementDetail, DetailRail } from "./RequirementDetailScreen";
import { AnalysisScreen } from "./AnalysisScreen";
import { StakeholdersScreen, RulesScreen, AuditScreen } from "./ContextScreens";
import { ProjectFormDialog } from "./ProjectFormDialog";
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

// مفتاح حفظ موقع المستخدم (الشاشة + المتطلب المفتوح) — يستعيده بعد أي
// إعادة بناء للشجرة (router.refresh / revalidate) حتى لا يُقذف للرئيسية.
const NAV_KEY = "wq-nav";

export function WorkspaceClient({ data }: { data: WorkspaceDataValue }) {
  const router = useRouter();
  const [screen, setScreen] = React.useState<ScreenId | "detail">("overview");
  const [projectDialog, setProjectDialog] = React.useState(false);
  // نخزّن مُعرّف المتطلب فقط ونشتق الكائن من بيانات الخادم الطازجة كل تصيير —
  // فيتحدّث مؤشر الجودة والتحليل مباشرة بعد router.refresh() دون نسخة قديمة.
  const [reqId, setReqId] = React.useState<string | null>(null);
  const [statusPatch, setStatusPatch] = React.useState<{ id: string; status: Requirement["status"] } | null>(null);
  const [analysisMode, setAnalysisMode] = React.useState<"text" | "pdf">("text");
  // Bumped on every navigation to Analysis so the screen remounts fresh in the chosen mode.
  const [analysisNonce, setAnalysisNonce] = React.useState(0);
  const [search, setSearch] = React.useState("");

  // استعادة الموقع بعد التركيب (آمنة من hydration لأنها في effect).
  React.useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(NAV_KEY) ?? "null") as
        | { screen?: string; reqId?: string | null }
        | null;
      if (!saved?.screen) return;
      if (saved.screen === "detail" && saved.reqId) {
        setReqId(saved.reqId);
        setScreen("detail");
      } else if (saved.screen !== "detail") {
        setScreen(saved.screen as ScreenId);
      }
    } catch {
      /* تجاهل — نبدأ من النظرة العامة */
    }
    // مرة واحدة عند التركيب فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // حفظ الموقع عند كل تغيّر.
  React.useEffect(() => {
    try {
      sessionStorage.setItem(NAV_KEY, JSON.stringify({ screen, reqId }));
    } catch {
      /* التخزين قد يكون معطلاً — لا يؤثر على العمل */
    }
  }, [screen, reqId]);

  const baseReq = reqId ? data.requirements.find((r) => r.id === reqId) ?? null : null;
  const req: Requirement | null = baseReq
    ? statusPatch && statusPatch.id === baseReq.id
      ? { ...baseReq, status: statusPatch.status }
      : baseReq
    : null;

  // Typing in the global search jumps to the requirements list (where results show).
  const onSearchChange = (value: string) => {
    setSearch(value);
    if (value.trim() && screen !== "requirements" && screen !== "detail") {
      setScreen("requirements");
    }
  };

  const openReq = (r: Requirement | null) => {
    if (r) {
      setReqId(r.id);
      setStatusPatch(null);
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
    main = <OverviewScreen onOpen={openReq} onNewAnalysis={() => openAnalysis("text")} onNewProject={() => setProjectDialog(true)} onGoToRequirements={() => setScreen("requirements")} />;
  } else if (screen === "requirements") {
    main = (
      <RequirementsScreen
        onOpen={openReq}
        onViewAnalysis={() => openAnalysis("text")}
        search={search}
        onClearSearch={() => setSearch("")}
      />
    );
  } else if (screen === "analysis") {
    main = <AnalysisScreen key={`analysis-${analysisNonce}`} initialMode={analysisMode} />;
  } else if (screen === "detail" && req) {
    main = <RequirementDetail req={req} onBack={() => setScreen("requirements")} />;
    rail = (
      <DetailRail
        req={req}
        onStatusChange={(status) => setStatusPatch({ id: req.id, status })}
      />
    );
    current = "requirements";
  } else if (screen === "detail" && !req) {
    // المتطلب المحفوظ لم يعد موجودًا (حُذف أو تغيّر المشروع) → القائمة.
    main = (
      <RequirementsScreen
        onOpen={openReq}
        onViewAnalysis={() => openAnalysis("text")}
        search={search}
        onClearSearch={() => setSearch("")}
      />
    );
    current = "requirements";
  } else if (screen === "stakeholders") {
    current = "stakeholders";
    main = <StakeholdersScreen onOpen={openReq} />;
  } else if (screen === "rules") {
    current = "rules";
    main = <RulesScreen onOpen={openReq} />;
  } else if (screen === "audit") {
    current = "audit";
    main = <AuditScreen />;
  } else if (CONTEXT_LABELS[screen as ScreenId]) {
    current = screen as ScreenId;
    main = <PlaceholderScreen label={CONTEXT_LABELS[screen as ScreenId] as string} />;
  } else {
    main = <OverviewScreen onOpen={openReq} onNewAnalysis={() => openAnalysis("text")} onNewProject={() => setProjectDialog(true)} onGoToRequirements={() => setScreen("requirements")} />;
  }

  return (
    <WorkspaceDataProvider value={data}>
      <div id="app-root">
        <AppShell
          current={current}
          onNavigate={nav}
          onNewAnalysis={() => openAnalysis("text")}
          onNewProject={() => setProjectDialog(true)}
          search={search}
          onSearchChange={onSearchChange}
          rightRail={rail}
        >
          {main}
        </AppShell>
        <ProjectFormDialog
          open={projectDialog}
          mode="create"
          initial={null}
          onClose={() => setProjectDialog(false)}
          onSaved={() => {
            setProjectDialog(false);
            router.refresh();
          }}
        />
      </div>
    </WorkspaceDataProvider>
  );
}

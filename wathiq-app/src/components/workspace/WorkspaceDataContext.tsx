"use client";

import React from "react";
import type {
  Requirement,
  AcceptanceCriterion,
  BusinessRule,
  OpenQuestion,
  AuditEvent,
  Project,
  ProjectModule,
} from "@/lib/data";
import type { UsageInfo } from "@/lib/workspace-data";
import type { DocumentSettings } from "@/lib/settings/types";

/** إعدادات عامة آمنة تصل لمكونات العميل — لا إعدادات داخلية ولا أسرار. */
export interface WorkspacePublicSettings {
  whatsappNumber: string;
  upgradeMessageText: string;
  activationTimeText: string;
  upgradeCtaText: string;
}
export interface WorkspaceFeatureFlags {
  feedbackEnabled: boolean;
  assistantEnabled: boolean;
  documentExportEnabled: boolean;
  readinessEnabled: boolean;
}

export interface WorkspaceDataValue {
  requirements: Requirement[];
  acceptanceCriteria: AcceptanceCriterion[];
  businessRules: BusinessRule[];
  openQuestions: OpenQuestion[];
  auditEvents: AuditEvent[];
  projects: Project[];
  activeProject: Project | null;
  /** وحدات المشروع النشط — اختيارية وقد تكون فارغة. */
  modules: ProjectModule[];
  usage: UsageInfo | null;
  /** Whether the data is backed by the live database (writes will persist). */
  source: "database" | "fallback";
  /** Whether sign-in is configured (controls showing the logout action). */
  authEnabled: boolean;
  /** The signed-in account, or null when auth is disabled. */
  user: { name: string; email: string } | null;
  /** v2.2: إعدادات النظام العامة الآمنة (تواصل/نصوص CTA). */
  publicSettings: WorkspacePublicSettings;
  /** v2.2: إعدادات الوثائق — تمرَّر لبُناة BRD/SRS في العميل. */
  docSettings: DocumentSettings;
  /** v2.2: بوابات الخصائص (الحمايات الأمنية ليست منها). */
  featureFlags: WorkspaceFeatureFlags;
}

const WorkspaceDataContext = React.createContext<WorkspaceDataValue | null>(null);

export function WorkspaceDataProvider({
  value,
  children,
}: {
  value: WorkspaceDataValue;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceDataContext.Provider value={value}>
      {children}
    </WorkspaceDataContext.Provider>
  );
}

/** Read the workspace data supplied by the server component at the page root. */
export function useWorkspaceData(): WorkspaceDataValue {
  const ctx = React.useContext(WorkspaceDataContext);
  if (!ctx) {
    throw new Error("useWorkspaceData must be used within a WorkspaceDataProvider");
  }
  return ctx;
}

"use client";

import React from "react";
import type {
  Requirement,
  AcceptanceCriterion,
  BusinessRule,
  OpenQuestion,
  AuditEvent,
} from "@/lib/data";

export interface WorkspaceDataValue {
  requirements: Requirement[];
  acceptanceCriteria: AcceptanceCriterion[];
  businessRules: BusinessRule[];
  openQuestions: OpenQuestion[];
  auditEvents: AuditEvent[];
  /** Whether the data is backed by the live database (writes will persist). */
  source: "database" | "fallback";
  /** Whether sign-in is configured (controls showing the logout action). */
  authEnabled: boolean;
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

"use client";

import React from "react";
import type {
  Requirement,
  AcceptanceCriterion,
  BusinessRule,
  OpenQuestion,
} from "@/lib/data";

export interface WorkspaceDataValue {
  requirements: Requirement[];
  acceptanceCriteria: AcceptanceCriterion[];
  businessRules: BusinessRule[];
  openQuestions: OpenQuestion[];
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

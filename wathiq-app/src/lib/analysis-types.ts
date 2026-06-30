import type { RequirementStatus, PriorityLevel } from "@/components/ds";

export interface ExtractedRequirement {
  id: string;
  title: string;
  description: string;
  status: RequirementStatus;
  priority: PriorityLevel;
  confidence: number;
  criteria: number;
  openQuestions: number;
  module: string;
  stakeholders: string[];
}

export interface AnalysisResult {
  summary: string;
  confidence: number;
  reasoning: string[];
  recommendations: string[];
  requirements: ExtractedRequirement[];
  acceptanceCriteriaCount: number;
  businessRulesCount: number;
  openQuestionsCount: number;
}

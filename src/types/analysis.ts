/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SearchResult {
  filePath: string;
  startLine: number;
  endLine: number;
  snippet: string;
  score: number;
  matchRationale: string;
}

export interface TraceStep {
  step: number;
  filePath: string;
  blockName: string;
  lines: string;
  description: string;
  logicSnippet: string;
}

export interface TraceFlow {
  intent: string;
  nodesCount: number;
  overviewFlow: string;
  steps: TraceStep[];
}

export interface DiagnosticsIssue {
  severity: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  affectedFiles: string[];
  remediationSnippet: string;
}

export interface DoctorReport {
  scannedAt: string;
  diagnosedIntent: string;
  overallScore: number;
  summaryReview: string;
  issues: DiagnosticsIssue[];
}

export interface RefactorStep {
  step: number;
  filePath: string;
  action: "modify" | "create" | "delete";
  explanation: string;
  targetContent: string;
  replacementContent: string;
}

export interface RefactorPlan {
  directive: string;
  strategyOverview: string;
  expectedOutcomes: string;
  steps: RefactorStep[];
}

export interface ExplanationReport {
  target: string;
  highLevelOverview: string;
  architecturalStyle: string;
  keyDesignPatterns: {
    patternName: string;
    description: string;
    locationInCode: string;
  }[];
  mermaidFlowchart: string;
}

export interface FrameworkDiscovery {
  name: string;
  tagline: string;
  description: string;
  benefits: string[];
  installCommand: string;
  performanceScore: number;
  starsEstimate: string;
  keyFeatures: { feature: string; description: string }[];
  boilerplateFileName: string;
  boilerplateCode: string;
}

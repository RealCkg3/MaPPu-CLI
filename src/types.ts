/**
 * Shared Type Definitions for Mappu Engine
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
  logicSnippet?: string;
}

export interface TraceFlow {
  intent: string;
  overviewFlow: string;
  steps: TraceStep[];
}

export interface DiagnosticsIssue {
  severity: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  affectedFiles: string[];
  remediationSnippet?: string;
}

export interface DoctorReport {
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

export interface RegistryFile {
  filePath: string;
  description: string;
  languages: string;
  exports: string[];
  imports: string[];
}

export interface IndexStatus {
  indexed: boolean;
  scannedAt?: string;
  totalFiles?: number;
  totalChunks?: number;
  files?: RegistryFile[];
}

export interface SandboxFile {
  filePath: string;
  size: number;
  lines: number;
  content: string;
}

export interface GrepResult {
  filePath: string;
  lineNumber: number;
  lineContent: string;
}

export interface GithubResult {
  type: "directory" | "file";
  owner: string;
  repo: string;
  branch: string;
  files?: { name: string; path: string; type: string; downloadUrl: string; size: number }[];
  filePath?: string;
  savedPath?: string;
  content?: string;
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


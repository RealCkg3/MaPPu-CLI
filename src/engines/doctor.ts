/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { getStoredIndex, DoctorReport, DiagnosticsIssue } from "../mappu-core";
import Database from "better-sqlite3";
import * as path from "path";
import { ImportGraphBuilder } from "../graph/import-graph";

export class DoctorEngine {
  /**
   * Evaluates logic, validations, and architectural best-practices statically.
   */
  public async diagnose(projectRoot: string, focusIntent: string, options: any = {}): Promise<DoctorReport> {
    const indexWrap = getStoredIndex(projectRoot);
    if (!indexWrap) {
      throw new Error("No Mappu index found. Run 'mappu init' first.");
    }

    const dbPath = path.join(projectRoot, ".mappu", "mappu.db");
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");

    // Run real offline diagnostic rules scanning inside SQLite database
    const issues: DiagnosticsIssue[] = [];

    // Rule 1: Complexity Scan SQL
    const thresholdComplexity = options.thresholdComplexity !== undefined ? options.thresholdComplexity : 10;
    const overComplex = db.prepare("SELECT * FROM symbols WHERE complexity > ?").all(thresholdComplexity) as any[];
    overComplex.forEach(sym => {
      issues.push({
        severity: "high",
        category: "complexity",
        title: `Cyclomatic complexity elevated in symbol '${sym.name}'`,
        description: `Symbol '${sym.name}' (${(sym.kind || "").toLowerCase()}) in ${sym.filePath} contains ${sym.complexity} branch decisions, exceeding the recommendation of ${thresholdComplexity}.`,
        affectedFiles: [sym.filePath],
        remediationSnippet: `// Proactively simplify conditional branches and isolate nesting logic into child functions:\nexport function thinHelper() {\n  // Refactored segment\n}`
      });
    });

    // Rule 2: Size Limit Checks (Function Level as requested)
    const thresholdLinesFn = options.thresholdLinesFn !== undefined ? options.thresholdLinesFn : 100;
    const overSized = db.prepare("SELECT * FROM symbols WHERE (end_line - start_line) > ?").all(thresholdLinesFn) as any[];
    overSized.forEach(sym => {
      const size = sym.end_line - sym.start_line;
      issues.push({
        severity: "medium",
        category: "size-fn",
        title: `Function size exceeds standard limit: ${sym.name}`,
        description: `Function '${sym.name}' spans ${size} lines in ${sym.filePath}, exceeding the recommended limit of ${thresholdLinesFn}.`,
        affectedFiles: [sym.filePath],
        remediationSnippet: `// Break down oversized function/method into smaller cohesive helpers.`
      });
    });

    // Rule 3: Async with no try/catch (using hybrid DB scan)
    const chunks = db.prepare("SELECT filePath, content FROM chunks").all() as any[];
    const seenAsyncNoCatch = new Set<string>();
    chunks.forEach(c => {
      if (seenAsyncNoCatch.has(c.filePath)) return;
      if (c.content.includes("async ") && !c.content.includes("try") && !c.content.includes(".catch")) {
        seenAsyncNoCatch.add(c.filePath);
        issues.push({
          severity: "high",
          category: "async-no-catch",
          title: `Async execution with unhandled errors in ${c.filePath}`,
          description: `This chunk is declaring async logic (async/await) but lacks an enclosing try/catch or promise-rejection catch handler. Rejection failures will cause active runtime crashes.`,
          affectedFiles: [c.filePath],
          remediationSnippet: `try {\n  await asyncTask();\n} catch (error) {\n  logger.error("Operation failed:", error);\n}`
        });
      }
    });

    // Rule 4: Parameter Limits SQL
    const thresholdParams = options.thresholdParams !== undefined ? options.thresholdParams : 4;
    const excessParams = db.prepare("SELECT * FROM symbols WHERE param_count > ?").all(thresholdParams) as any[];
    excessParams.forEach(sym => {
      issues.push({
        severity: "medium",
        category: "params",
        title: `Excessive parameters signature in '${sym.name}'`,
        description: `Function signature '${sym.name}' in ${sym.filePath} contains ${sym.param_count} arguments, violating clean parameters count limit (${thresholdParams}).`,
        affectedFiles: [sym.filePath],
        remediationSnippet: `// Aggregate multiple inputs into a cohesive options parameters object:\ninterface ConfigOptions {\n  settingA: string;\n  settingB: number;\n}`
      });
    });

    // Rule 5: Circular Imports Scanning using graphology
    try {
      const graphBuilder = new ImportGraphBuilder(projectRoot);
      const cycles = graphBuilder.findCycles();
      cycles.forEach(cycle => {
        issues.push({
          severity: "high",
          category: "circular-deps",
          title: "Circular import cycle boundary detected",
          description: `Circular imports discovered between module path: ${cycle.join(" -> ")}. This leads to tightly coupled schemas & runtime errors.`,
          affectedFiles: cycle,
          remediationSnippet: `// Introduce a decoupled interface or separate shared state repository file to capture mutual details.`
        });
      });
    } catch (err) {
      console.error("Circular deps scan failed using graphology-dag:", err);
    }

    // Rule 6: Dead Export Rule
    const exportedSymbols = db.prepare("SELECT * FROM symbols WHERE isExported = 1").all() as any[];
    const allImports = db.prepare("SELECT imported_names FROM imports").all() as { imported_names: string }[];
    const importedNames = new Set<string>();
    allImports.forEach(imp => {
      try {
        const names = JSON.parse(imp.imported_names) as string[];
        names.forEach(n => importedNames.add(n));
      } catch {
        // fallback
      }
    });

    exportedSymbols.forEach(sym => {
      // Ignore setup / standard framework-entry functions
      if (sym.name === "default" || sym.name === "main" || sym.filePath.includes("server.ts") || sym.filePath.includes("cli/")) {
        return;
      }

      if (!importedNames.has(sym.name)) {
        issues.push({
          severity: "medium",
          category: "dead-export",
          title: `Dead export: symbol '${sym.name}' is exported but never imported`,
          description: `The symbol '${sym.name}' is marked as exported in ${sym.filePath} but does not appear in any import statements across the codebase. Use it or remove the export keyword.`,
          affectedFiles: [sym.filePath],
          remediationSnippet: `// Remove the 'export' keyword if only used internally inside this file:\nconst ${sym.name} = ...`
        });
      }
    });

    // Calculation of overall robustness index
    let score = 100;
    issues.forEach(iss => {
      if (iss.severity === "high") score -= 15;
      else if (iss.severity === "medium") score -= 8;
      else score -= 3;
    });
    const overallScore = Math.max(10, score);

    const summaryReview = issues.length === 0
      ? "Repository structures are exceptionally well aligned! Clean, decoupled code modules and safety validation structures are fully set up."
      : `Discovered codebase safety and design gaps (High: ${issues.filter(i => i.severity === "high").length}, Med: ${issues.filter(i => i.severity === "medium").length}). Refactoring standard abstractions is active.`;

    const report: DoctorReport = {
      scannedAt: new Date().toISOString(),
      diagnosedIntent: focusIntent,
      overallScore,
      summaryReview,
      issues
    };

    // If AI explanation requested and key is present, enrich the review
    const apiKey = process.env.GEMINI_API_KEY;
    if (options.ai && apiKey) {
      try {
        const enrichedSummary = await this.enrichSummaryWithAI(report, apiKey);
        report.summaryReview = enrichedSummary;
      } catch {
        // Safe graceful fallback
      }
    }

    db.close();
    return report;
  }

  private async enrichSummaryWithAI(report: DoctorReport, apiKey: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Review this static doctor report and generate a 2-paragraph professional architectural overview review.
      Score: ${report.overallScore}/100
      Issues:
      ${report.issues.map(i => `- [${i.severity.toUpperCase()}] ${i.title}: ${i.description}`).join("\n")}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the Mappu Doctor Consulting Assistant. Provide high-level recommendations.",
      }
    });

    return response.text || report.summaryReview;
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { getStoredIndex, DoctorReport, DiagnosticsIssue } from "../mappu-core";

export class DoctorEngine {
  /**
   * Evaluates logic, validations, and architectural best-practices statically.
   */
  public async diagnose(projectRoot: string, focusIntent: string, options: any = {}): Promise<DoctorReport> {
    const indexWrap = getStoredIndex(projectRoot);
    if (!indexWrap) {
      throw new Error("No Mappu index found. Run 'mappu init' first.");
    }

    const { registry, chunks: rawChunks } = indexWrap;
    const files = registry.files;

    // Run real offline diagnostic rules scanning inside raw files
    const issues: DiagnosticsIssue[] = [];

    // Rule 1: Complexity Scan
    const thresholdComplexity = options.thresholdComplexity || 12;
    rawChunks.forEach(c => {
      const branches = (c.content.match(/\b(if|else\s+if|for|while|catch|case|&&|\|\|)\b/g) || []).length;
      if (branches > thresholdComplexity) {
        issues.push({
          severity: "high",
          category: "complexity",
          title: `Cyclomatic complexity elevated in chunk of ${c.filePath}`,
          description: `This code chunk contains ${branches} logical branching decisions (if, loop, cases), which exceeds the recommendation of ${thresholdComplexity}.`,
          affectedFiles: [c.filePath],
          remediationSnippet: `// Proactively simplify conditional branches and isolate nesting logic into child functions:\nexport function thinHelper() {\n  // Refactored segment\n}`
        });
      }
    });

    // Rule 2: Size Limit Checks
    const maxLinesFile = options.thresholdLinesFile || 400;
    files.forEach(f => {
      // Find matching raw chunk data to approximate total line size
      const totalLines = rawChunks.filter(c => c.filePath === f.filePath).reduce((max, c) => Math.max(max, c.endLine), 0);
      if (totalLines > maxLinesFile) {
        issues.push({
          severity: "medium",
          category: "size-file",
          title: `File exceeds standard line limit: ${f.filePath}`,
          description: `The file has approximately ${totalLines} lines, exceeding the recommended limit of ${maxLinesFile}.`,
          affectedFiles: [f.filePath],
          remediationSnippet: `// Break down oversized modules into smaller cohesive service modules.`
        });
      }
    });

    // Rule 3: Async with no try/catch
    rawChunks.forEach(c => {
      if (c.content.includes("async ") && !c.content.includes("try") && !c.content.includes(".catch")) {
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

    // Rule 4: Parameter Limits
    const maxParams = options.thresholdParams || 4;
    rawChunks.forEach(c => {
      // Simple regex approximation of parameter declaration count
      const matches = c.content.match(/function\s+\w+\s*\(([^)]*)\)/);
      if (matches) {
        const paramStr = matches[1];
        const paramsCount = paramStr.split(",").filter(Boolean).length;
        if (paramsCount > maxParams) {
          issues.push({
            severity: "medium",
            category: "params",
            title: `Excessive function parameters signature`,
            description: `Function signature contains ${paramsCount} arguments, violating clean parameters count limit (${maxParams}).`,
            affectedFiles: [c.filePath],
            remediationSnippet: `// Aggregate multiple inputs into a cohesive options parameters object:\ninterface ConfigOptions {\n  settingA: string;\n  settingB: number;\n}`
          });
        }
      }
    });

    // Rule 5: Circular Imports Scanning
    const importGraph: Record<string, string[]> = {};
    files.forEach(f => {
      importGraph[f.filePath] = f.imports || [];
    });

    // Simple depth 2 circular validation
    Object.keys(importGraph).forEach(fileA => {
      const imports = importGraph[fileA];
      imports.forEach(imp => {
        // Resolve target file path reference
        const fileBNode = files.find(f => f.filePath !== fileA && f.filePath.includes(imp));
        if (fileBNode) {
          const fileBImports = importGraph[fileBNode.filePath] || [];
          const hasBackRef = fileBImports.some(bi => fileA.includes(bi));
          if (hasBackRef) {
            // Confirm circular cycle
            const exists = issues.some(iss => iss.category === "circular-deps" && iss.affectedFiles.includes(fileBNode.filePath) && iss.affectedFiles.includes(fileA));
            if (!exists) {
              issues.push({
                severity: "high",
                category: "circular-deps",
                title: "Circular import cycle boundary detected",
                description: `Circular imports discovered between module ${fileA} and ${fileBNode.filePath}. This leads to tightly coupled schemas & runtime errors.`,
                affectedFiles: [fileA, fileBNode.filePath],
                remediationSnippet: `// Introduce a decoupled interface or separate shared state repository file to capture mutual details.`
              });
            }
          }
        }
      });
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

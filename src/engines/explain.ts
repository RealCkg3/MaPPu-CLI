/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStoredIndex, ExplanationReport } from "../mappu-core";
import { getLLMAdapter } from "../adapters/llm/factory";

export class ExplainEngine {
  /**
   * Generates a static, deterministic walkthrough explanation from cached index registry metrics.
   */
  public async explain(projectRoot: string, query: string, options: any = {}): Promise<ExplanationReport> {
    const indexWrap = getStoredIndex(projectRoot);
    if (!indexWrap) {
      throw new Error("No Mappu index found. Run 'mappu init' first.");
    }

    const { registry } = indexWrap;
    const files = registry.files;

    // Detect structural details statically
    const totalFiles = files.length;
    const tsFiles = files.filter(f => f.languages.toLowerCase() === "typescript").length;
    const isFullStack = files.some(f => f.filePath === "server.ts");

    const highLevelOverview = `This codebase represents a ${isFullStack ? "Full-Stack Node.js Express & Vite" : "Client-Side Frontend"} application consisting of ${totalFiles} modules. The backend server manages routing entry endpoints while CLI utilities scan code segments dynamically. Primary language components comprise ${tsFiles} TypeScript source files in cooperation with JSON assets.`;

    const architecturalStyle = isFullStack ? "Modular Client-Server with Express API routing" : "Single-Page Client Application";

    const keyDesignPatterns = [
      {
        patternName: "CLI Commands Strategy Registry",
        description: "Enables discrete subcommands parsing (init, search, trace, doctor, map, dead) wrapped under singular executable entry points.",
        locationInCode: "src/cli/index.ts"
      },
      {
        patternName: "Static SAST Auditor Signature Pattern",
        description: "Scans files line-by-line against standard high-risk regex defect matrices to identify XSS, SQLi, and exposed credentials.",
        locationInCode: "src/engines/security.ts"
      }
    ];

    if (files.some(f => f.filePath === "src/mappu-core.ts")) {
      keyDesignPatterns.push({
        patternName: "Deterministic BM25 Textual Ranker",
        description: "Tokenizes query terms, splits camelCase/snake_case coordinates, and ranks document relevance weight offline using the Okapi BM25 formula.",
        locationInCode: "src/engines/search.ts"
      });
    }

    // Generate valid Mermaid Flowchart dynamically from actual indexed file relationships!
    let mermaidFlowchart = "graph TD\n";
    files.slice(0, 10).forEach(f => {
      const parentName = f.filePath.replace(/[^a-zA-Z0-9]/g, "_");
      mermaidFlowchart += `  ${parentName}["📂 ${f.filePath}"]\n`;
      f.imports.forEach(imp => {
        // Find matching target file to verify dependency connection
        const matched = files.find(other => other.filePath !== f.filePath && other.filePath.includes(imp));
        if (matched) {
          const childName = matched.filePath.replace(/[^a-zA-Z0-9]/g, "_");
          mermaidFlowchart += `  ${parentName} --> ${childName}\n`;
        }
      });
    });

    const report: ExplanationReport = {
      target: query,
      highLevelOverview,
      architecturalStyle,
      keyDesignPatterns,
      mermaidFlowchart
    };

    // If AI mode requested, run refinement
    if (options.ai) {
      try {
        const enriched = await this.enrichExplanationWithAI(report);
        return enriched;
      } catch {
        // Fall back gracefully
      }
    }

    return report;
  }

  private async enrichExplanationWithAI(report: ExplanationReport): Promise<ExplanationReport> {
    const adapter = getLLMAdapter();
    const prompt = `
      Given this static walkthrough explanation, return an enriched walkthrough with detailed AI analysis and explanations.
      Walking target: ${report.target}
      Current info:
      ${JSON.stringify(report, null, 2)}
    `;

    const responseText = await adapter.generate(prompt, "You are the Mappu Code Explainer. Enrich static architectural Walkthroughs.", {
      responseMimeType: "application/json"
    });

    return JSON.parse(responseText || JSON.stringify(report));
  }
}

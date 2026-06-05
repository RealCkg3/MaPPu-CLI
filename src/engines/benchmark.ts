/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as path from "path";
import { getStoredIndex } from "../mappu-core";

export interface BenchmarkFinding {
  id: string;
  type: "sync-in-async" | "n-plus-one" | "hotspot-complexity";
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  line: number;
  snippet: string;
  message: string;
  remediation: string;
}

export class BenchmarkEngine {
  /**
   * Identifies hotspots, N+1 pattern leaks, and thread blockages using static analysis.
   */
  public analyzePerformance(projectRoot: string): BenchmarkFinding[] {
    const indexWrap = getStoredIndex(projectRoot);
    if (!indexWrap) {
      return [];
    }

    const { registry } = indexWrap;
    const findings: BenchmarkFinding[] = [];

    registry.files.forEach(file => {
      let content = "";
      try {
        const fullPath = path.join(projectRoot, file.filePath);
        content = fs.readFileSync(fullPath, "utf-8");
      } catch {
        return;
      }

      const lines = content.split("\n");
      let inAsyncScope = false;
      let asyncScopeIndent = -1;

      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        const trimmed = lineText.trim();

        // 1. Detect sync-in-async blockers
        if (/\basync\s+(?:function|.*\b(?:=>|\(.*?\)\s*:|\{))/g.test(lineText)) {
          inAsyncScope = true;
          const spaces = lineText.match(/^\s*/);
          asyncScopeIndent = spaces ? spaces[0].length : 0;
        }

        if (inAsyncScope) {
          const currentIndent = lineText.match(/^\s*/)?.[0].length || 0;
          if (trimmed === "}" && currentIndent <= asyncScopeIndent) {
            inAsyncScope = false;
            asyncScopeIndent = -1;
          }

          if (/\b(?:readFileSync|writeFileSync|execSync|spawnSync)\s*\(/g.test(lineText)) {
            findings.push({
              id: `perf-sync-async-${file.filePath}-${lineNum}`,
              type: "sync-in-async",
              severity: "high",
              file: file.filePath,
              line: lineNum,
              snippet: trimmed,
              message: "Synchronous blocking operation performed within an asynchronous routing frame.",
              remediation: "Substitute with asynchronous fs.promises or callback workflows to keep event loops non-blocking."
            });
          }
        }

        // 2. Detect N+1 query loop heuristics
        if (
          (/\b(?:for|while|forEach|map|filter)\s*\(.*\)/.test(lineText) || lineText.endsWith(".map(") || lineText.endsWith(".forEach(")) &&
          idx < lines.length - 4
        ) {
          const windowText = lines.slice(idx, idx + 5).join("\n");
          if (/\b(?:await\s+[a-zA-Z0-9_\.]+\.(?:find|get|query|save|update|delete|search|db|execute))\b/i.test(windowText)) {
            findings.push({
              id: `perf-n-plus-one-${file.filePath}-${lineNum}`,
              type: "n-plus-one",
              severity: "critical",
              file: file.filePath,
              line: lineNum,
              snippet: trimmed,
              message: "Potential N+1 query loop pattern detected statically.",
              remediation: "Construct bulk select parameters, combine schemas, or map async checks outer loop execution namespaces."
            });
          }
        }

        // 3. Nested loop complexity hotspots
        if (trimmed.startsWith("for ") && idx < lines.length - 2) {
          const bodyCheck = lines.slice(idx + 1, idx + 3).map(l => l.trim());
          if (bodyCheck.some(l => l.startsWith("for ") || l.includes(".forEach(") || l.includes(".map("))) {
            findings.push({
              id: `perf-nested-loops-${file.filePath}-${lineNum}`,
              type: "hotspot-complexity",
              severity: "medium",
              file: file.filePath,
              line: lineNum,
              snippet: trimmed,
              message: "Nested iterative loop complexity check. Operations scale non-linearly O(N^2).",
              remediation: "Refactor checking workflows matching dynamic records indices using Key-Value Map hashes lookup O(1)."
            });
          }
        }
      });
    });

    return findings;
  }
}

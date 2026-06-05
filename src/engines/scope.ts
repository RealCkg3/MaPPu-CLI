/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStoredIndex } from "../mappu-core";

export interface ScopeRule {
  from: string; // string match for source files
  to: string;   // string match for forbidden imports
  severity: "error" | "warning";
  message: string;
}

export interface ScopeViolation {
  filePath: string;
  importedPath: string;
  rule: ScopeRule;
}

export class ScopeEngine {
  public static DEFAULT_RULES: ScopeRule[] = [
    {
      from: "src/frontend",
      to: "src/server",
      severity: "error",
      message: "Frontend components must not import server modules directly."
    },
    {
      from: "src/frontend",
      to: "src/engines",
      severity: "error",
      message: "Frontend components must not import analytical engines directly."
    },
    {
      from: "src/engines",
      to: "src/frontend",
      severity: "error",
      message: "Analytical engines must not import frontend UI components."
    },
    {
      from: "src/cli",
      to: "src/frontend",
      severity: "error",
      message: "CLI entry points must not import frontend components."
    }
  ];

  /**
   * Evaluates if any indexed module crosses declared architectural boundaries.
   */
  public analyzeScope(projectRoot: string, customRules?: ScopeRule[]): ScopeViolation[] {
    const indexWrap = getStoredIndex(projectRoot);
    if (!indexWrap) {
      return [];
    }

    const { registry } = indexWrap;
    const rules = customRules || ScopeEngine.DEFAULT_RULES;
    const violations: ScopeViolation[] = [];

    registry.files.forEach(file => {
      const srcPath = file.filePath.replace(/\\/g, "/");
      
      file.imports.forEach(imp => {
        const normalizedImport = imp.replace(/\\/g, "/");

        rules.forEach(rule => {
          // Check if file is inside 'from' directory and imports anything inside 'to'
          const matchesFrom = srcPath.includes(rule.from);
          const matchesTo = normalizedImport.includes(rule.to);

          if (matchesFrom && matchesTo) {
            violations.push({
              filePath: file.filePath,
              importedPath: imp,
              rule
            });
          }
        });
      });
    });

    return violations;
  }
}

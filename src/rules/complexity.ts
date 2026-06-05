/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DoctorRule } from "./registry";

export class ComplexityRule implements DoctorRule {
  id = "complexity";
  name = "Cyclomatic Complexity Scan";
  category = "Maintainability";

  check(file: { filePath: string; content: string }) {
    const issues: any[] = [];
    const lines = file.content.split("\n");

    lines.forEach((line, index) => {
      const branches = (line.match(/if\s*\(|else\s+if|for\s*\(|while\s*\(|catch\s*\(|switch\s*\(/g) || []).length;
      if (branches >= 3) {
        issues.push({
          line: index + 1,
          description: `Line has high potential branching pattern (${branches} branch points detected).`,
          remediation: "Break conditional logic apart into early returns or separate helper expressions."
        });
      }
    });

    return { success: issues.length === 0, issues };
  }
}

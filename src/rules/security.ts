/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DoctorRule } from "./registry";

export class RulesSecurityRule implements DoctorRule {
  id = "rules-security";
  name = "Security Anti-Patterns Detector";
  category = "Auditing Standards";

  check(file: { filePath: string; content: string }) {
    const issues: any[] = [];
    const lines = file.content.split("\n");

    lines.forEach((line, index) => {
      if (line.includes("eval(") && !line.includes("// safe-eval")) {
        issues.push({
          line: index + 1,
          description: "Execution statement invokes dynamic string parsing eval()",
          remediation: "Execute structured logic blocks or switch to pre-compiled AST mapping engines."
        });
      }
    });

    return { success: issues.length === 0, issues };
  }
}

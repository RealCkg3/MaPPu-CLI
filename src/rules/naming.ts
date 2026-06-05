/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DoctorRule } from "./registry";

export class NamingRule implements DoctorRule {
  id = "naming";
  name = "Variable Naming Standards";
  category = "Styling";

  check(file: { filePath: string; content: string }) {
    const issues: any[] = [];
    const lines = file.content.split("\n");

    lines.forEach((line, index) => {
      if (line.includes("const ") || line.includes("let ")) {
        const match = line.match(/(?:const|let)\s+([a-zA-Z0-9_$]+)/);
        if (match && match[1]) {
          const varName = match[1];
          if (/^[A-Z][A-Z0-9_]*$/.test(varName) === false && varName.match(/[A-Z]/) && varName.includes("_")) {
            issues.push({
              line: index + 1,
              description: `Variable name '${varName}' mixes camelCase and snake_case standards.`,
              remediation: "Adopt consistent camelCase (e.g., camelCaseName) or SCREAMING_SNAKE_CASE (e.g., CONSTANT_NAME) styles."
            });
          }
        }
      }
    });

    return { success: issues.length === 0, issues };
  }
}

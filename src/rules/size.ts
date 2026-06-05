/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DoctorRule } from "./registry";

export class SizeRule implements DoctorRule {
  id = "size";
  name = "Module Volume Constraints";
  category = "Refined Codebase Structure";

  check(file: { filePath: string; content: string }) {
    const issues: any[] = [];
    const lines = file.content.split("\n");

    if (lines.length > 500) {
      issues.push({
        line: 1,
        description: `Source file is too long (${lines.length} lines, ceiling limit of 500 lines).`,
        remediation: "Split large classes or utility methods into logical sub-modules to stay clean."
      });
    }

    return { success: issues.length === 0, issues };
  }
}

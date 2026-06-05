/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DoctorRule } from "./registry";

export class CouplingRule implements DoctorRule {
  id = "coupling";
  name = "Logical Imports Coupling Matrix";
  category = "Architecture Integrity";

  check(file: { filePath: string; content: string }) {
    const issues: any[] = [];
    const importLines = (file.content.match(/^import /gm) || []).length;

    if (importLines > 15) {
      issues.push({
        line: 1,
        description: `Import density is extremely high (${importLines} explicit imports found).`,
        remediation: "This module may be taking on too many structural responsibilities. Decouple or isolate concerns."
      });
    }

    return { success: issues.length === 0, issues };
  }
}

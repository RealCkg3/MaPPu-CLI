/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DoctorRule } from "./registry";

export class DocsRule implements DoctorRule {
  id = "docs";
  name = "API JSDoc Guidelines";
  category = "Developer Tool Documentation";

  check(file: { filePath: string; content: string }) {
    const issues: any[] = [];
    
    if (file.filePath.endsWith(".ts") && !file.content.includes("/**")) {
      issues.push({
        line: 1,
        description: "Public TypeScript file lacks structured JSDoc comment blocks.",
        remediation: "Add elegant header or method descriptions starting with /** to build auto-documentation indices."
      });
    }

    return { success: issues.length === 0, issues };
  }
}

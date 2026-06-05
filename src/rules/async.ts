/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DoctorRule } from "./registry";

export class AsyncRule implements DoctorRule {
  id = "async";
  name = "Unawaited Promises Validation";
  category = "Robustness";

  check(file: { filePath: string; content: string }) {
    const issues: any[] = [];
    const lines = file.content.split("\n");

    lines.forEach((line, index) => {
      if (line.includes("async ") && !file.content.includes("await ")) {
        issues.push({
          line: index + 1,
          description: "Async function declared but lacks any internal 'await' logic blocks.",
          remediation: "Convert to a standard return signature or insert needed await commands."
        });
      }
    });

    return { success: issues.length === 0, issues };
  }
}

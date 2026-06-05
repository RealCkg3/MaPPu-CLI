/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { colors } from "./colors";

export function drawTable(headers: string[], rows: string[][]): void {
  const line = "━".repeat(60);
  console.log(`${colors.gray}${line}${colors.reset}`);
  console.log(headers.map(h => `${colors.bold}${h.toUpperCase()}${colors.reset}`).join(" | "));
  console.log(`${colors.gray}${line}${colors.reset}`);
  rows.forEach(row => {
    console.log(row.join(" | "));
  });
  console.log(`${colors.gray}${line}${colors.reset}`);
}

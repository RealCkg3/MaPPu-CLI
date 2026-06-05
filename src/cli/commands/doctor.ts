/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { runDoctor } from "../../mappu-core";
import { colors } from "../display/colors";

export async function executeDoctor(intent: string): Promise<void> {
  if (!intent) {
    console.log(`${colors.red}Error: Specify doctor diagnostics focus.${colors.reset}`);
    return;
  }
  console.log(`\n${colors.cyan}Running diagnoser on: "${colors.bold}${intent}${colors.cyan}"...${colors.reset}`);
  try {
    const report = await runDoctor(process.cwd(), intent);
    console.log(`\nDiagnostics Score: ${report.overallScore}/100`);
    console.log(`Summary: ${report.summaryReview}`);
  } catch (err: any) {
    console.error(`Doctor run failed: ${err.message}`);
  }
}

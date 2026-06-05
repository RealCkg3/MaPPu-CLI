/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { traceExecution } from "../../mappu-core";
import { colors } from "../display/colors";

export async function executeTrace(query: string): Promise<void> {
  if (!query) {
    console.log(`${colors.red}Error: Please specify trace execution target.${colors.reset}`);
    return;
  }
  console.log(`\n${colors.cyan}Tracing execution flow for: "${colors.bold}${query}${colors.cyan}"...${colors.reset}`);
  try {
    const flow = await traceExecution(process.cwd(), query);
    console.log(`\nOverview: ${flow.overviewFlow}`);
  } catch (err: any) {
    console.error(`Trace failed: ${err.message}`);
  }
}

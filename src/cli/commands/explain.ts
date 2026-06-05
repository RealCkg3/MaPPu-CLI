/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { explainCodebase } from "../../mappu-core";
import { colors } from "../display/colors";

export async function executeExplain(query: string): Promise<void> {
  if (!query) {
    console.log(`${colors.red}Error: Specify explain query target.${colors.reset}`);
    return;
  }
  console.log(`\n${colors.cyan}Generating concepts explanations for: "${colors.bold}${query}${colors.cyan}"...${colors.reset}`);
  try {
    const explanation = await explainCodebase(process.cwd(), query);
    console.log(`\nOverview: ${explanation.highLevelOverview}`);
  } catch (err: any) {
    console.error(`Explain failed: ${err.message}`);
  }
}

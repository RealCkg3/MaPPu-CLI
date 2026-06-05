/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { searchIntent } from "../../mappu-core";
import { colors } from "../display/colors";

export async function executeSearch(query: string): Promise<void> {
  if (!query) {
    console.log(`${colors.red}Error: Please specify search intent.${colors.reset}`);
    return;
  }
  console.log(`\n${colors.cyan}Searching codebase for: "${colors.bold}${query}${colors.cyan}"...${colors.reset}\n`);
  try {
    const results = await searchIntent(process.cwd(), query);
    results.forEach((match, index) => {
      console.log(`${colors.bold}${index + 1}. [File] ${colors.teal}${match.filePath}${colors.gray} (Lines: ${match.startLine}-${match.endLine})${colors.reset}`);
      console.log(`   Rationale: ${match.matchRationale}`);
    });
  } catch (err: any) {
    console.error(`Search failed: ${err.message}`);
  }
}

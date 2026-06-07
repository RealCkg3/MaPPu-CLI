/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GitChurnEngine } from "../../engines/git";
import { scanCodebase } from "../../mappu-core";
import { colors } from "../display/colors";

export async function executeGit(): Promise<void> {
  console.log(`\n${colors.cyan}Calculating git commit hotspot and code churn...${colors.reset}`);
  const files = (await scanCodebase(process.cwd())).map(f => f.filePath);
  const hot = await new GitChurnEngine().listHotspots(files, process.cwd());
  hot.forEach(h => {
    console.log(`  File: ${colors.teal}${h.filePath}${colors.reset} (Count: ${h.commitsCount}, Churn Score: ${colors.yellow}${h.churnScore}${colors.reset})`);
  });
}

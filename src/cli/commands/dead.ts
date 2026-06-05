/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeadCodeEngine } from "../../engines/dead-code";
import { colors } from "../display/colors";

export async function executeDead(): Promise<void> {
  console.log(`\n${colors.cyan}Tracing Dead-Code unreferenced nodes...${colors.reset}`);
  const dead = new DeadCodeEngine();
  const results = dead.analyzeReachability(process.cwd());
  results.forEach(r => {
    console.log(` ${r.isReachable ? colors.green : colors.red}● ${r.filePath}${colors.reset} (${r.referencesCount} references)`);
  });
}

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

  const deadFiles = (results as any).deadFiles || [];
  const deadFunctions = (results as any).deadFunctions || [];
  const deadExports = (results as any).deadExports || [];

  console.log(`\n${colors.bold}${colors.cyan}=== CONTROL FLOW REACHABILITY FINDINGS ===${colors.reset}\n`);

  console.log(`${colors.bold}${colors.red}Isolated / Dead Files (${deadFiles.length})${colors.reset}`);
  if (deadFiles.length === 0) {
    console.log(`  ${colors.green}✔ No completely dead files detected in workspace.${colors.reset}`);
  } else {
    deadFiles.forEach((f: any) => {
      console.log(`  ${colors.red}●${colors.reset} ${colors.teal}${f.filePath}${colors.reset} (${f.referencesCount} inbound imports)`);
    });
  }

  console.log(`\n${colors.bold}${colors.yellow}Dead Internal Functions (${deadFunctions.length})${colors.reset}`);
  if (deadFunctions.length === 0) {
    console.log(`  ${colors.green}✔ No unreachable internal functions detected in reachable files.${colors.reset}`);
  } else {
    deadFunctions.forEach((fn: any) => {
      console.log(`  ${colors.yellow}●${colors.reset} ${colors.yellow}${fn.name}${colors.reset} ${colors.gray}(${fn.kind})${colors.reset} in ${colors.teal}${fn.filePath}:${colors.bold}${fn.startLine}`);
    });
  }

  console.log(`\n${colors.bold}${colors.indigo}Dead Exports (${deadExports.length})${colors.reset}`);
  if (deadExports.length === 0) {
    console.log(`  ${colors.green}✔ No unused exports detected in reachable files.${colors.reset}`);
  } else {
    deadExports.forEach((exp: any) => {
      console.log(`  ${colors.indigo}●${colors.reset} ${colors.bold}${exp.name}${colors.reset} ${colors.gray}(${exp.kind})${colors.reset} in ${colors.teal}${exp.filePath}:${colors.bold}${exp.startLine}`);
    });
  }
  console.log("");
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CloneEngine } from "../../engines/clone";
import { scanCodebase } from "../../mappu-core";
import { colors } from "../display/colors";

export async function executeClone(): Promise<void> {
  console.log(`\n${colors.cyan}Looking for duplicate code block clones...${colors.reset}`);
  const scanned = await scanCodebase(process.cwd());
  const clones = new CloneEngine().detectDuplicates(scanned);
  if (clones.length === 0) {
    console.log(`\n${colors.green}✔ No duplicate block clones identified! Pure structural modularity.${colors.reset}`);
    return;
  }
  clones.forEach((c: any) => {
    const rangeA = c.startLineA ? `:${c.startLineA}-${c.endLineA}` : "";
    const rangeB = c.startLineB ? `:${c.startLineB}-${c.endLineB}` : "";
    console.log(`  Duplicate across: ${colors.teal}${c.filePathA}${rangeA}${colors.reset} & ${colors.teal}${c.filePathB}${rangeB}${colors.reset}`);
    if (c.similarityKind) {
      console.log(`    Similarity: ${colors.indigo}${c.similarityKind}${colors.reset}`);
    }
  });
}

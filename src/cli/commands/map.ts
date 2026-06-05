/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStoredIndex } from "../../mappu-core";
import { colors } from "../display/colors";

export async function executeMap(): Promise<void> {
  const index = getStoredIndex(process.cwd());
  if (!index) {
    console.log(`${colors.yellow}No cached Mappu Index located. Run 'mappu init' first.${colors.reset}`);
    return;
  }
  console.log(`\n${colors.green}${colors.bold}Indexed files tree mapping:${colors.reset}`);
  index.registry.files.forEach(f => {
    console.log(`  📂 ${colors.teal}${f.filePath}${colors.reset}`);
  });
}

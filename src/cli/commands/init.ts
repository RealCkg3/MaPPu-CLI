/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { indexCodebase } from "../../mappu-core";
import { colors } from "../display/colors";

export async function executeInit(): Promise<void> {
  console.log(`\n${colors.teal}Initializing Mappu semantic parser...${colors.reset}`);
  try {
    const registry = await indexCodebase(process.cwd(), (progress) => {
      console.log(` ${colors.gray}[Index]${colors.reset} ${progress}`);
    });
    console.log(`\n${colors.green}${colors.bold}✔ Semantic Indexing Completed!${colors.reset}`);
    console.log(`  Indexed Files: ${registry.totalFiles}`);
    console.log(`  Chunks Generated: ${registry.chunks.length}`);
  } catch (err: any) {
    console.error(`\n${colors.red}✖ Indexing failed:${colors.reset} ${err.message}`);
  }
}

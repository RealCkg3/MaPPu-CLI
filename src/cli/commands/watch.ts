/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileWatcher } from "../../index/watcher";
import { colors } from "../display/colors";

export function executeWatch(): void {
  console.log(`\n${colors.cyan}Starting directory watchers. Listening for changes...${colors.reset}`);
  const watcher = new FileWatcher();
  watcher.watch(process.cwd(), (event, filename) => {
    console.log(` [${colors.yellow}Modified${colors.reset}] File change detected: ${colors.teal}${filename}${colors.reset}`);
  });
}

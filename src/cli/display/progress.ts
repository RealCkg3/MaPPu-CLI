/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { colors } from "./colors";

export class CliProgressBar {
  public draw(percent: number, stepText: string): void {
    const bars = "█".repeat(Math.floor(percent / 5)) + "░".repeat(20 - Math.floor(percent / 5));
    console.log(` ${colors.gray}[${bars}]${colors.reset} ${colors.teal}${percent}%${colors.reset} | ${stepText}`);
  }
}

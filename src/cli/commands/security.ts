/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SecurityEngine } from "../../engines/security";
import { colors } from "../display/colors";

export async function executeSecurity(): Promise<void> {
  console.log(`\n${colors.cyan}Performing advanced AST security audit scan...${colors.reset}`);
  try {
    const engine = new SecurityEngine();
    const report = await engine.run(process.cwd(), {});
    const defects = report.findings;

    console.log(`\n${colors.bold}Security Risk Finding Defect Matrix:${colors.reset}`);
    console.log(`Scanned Files Count: ${colors.bold}${report.scannedFiles}${colors.reset} modules | Scanned Duration: ${colors.bold}${report.duration}ms${colors.reset}\n`);
    console.log(`${colors.bold}Summary metrics:${colors.reset}`);
    console.log(`  Critical: ${colors.red}${colors.bold}${report.summary.critical}${colors.reset} | High: ${colors.red}${report.summary.high}${colors.reset} | Medium: ${colors.yellow}${report.summary.medium}${colors.reset} | Low: ${colors.teal}${report.summary.low}${colors.reset}`);
    console.log(`  By Category: sast=${report.summary.byCategory.sast || 0}, ai=${report.summary.byCategory.ai || 0}, iac=${report.summary.byCategory.iac || 0}, secrets=${report.summary.byCategory.secrets || 0}, deps=${report.summary.byCategory.deps || 0}\n`);

    if (defects.length === 0) {
      console.log(`  ${colors.green}✔ No critical SAST patterns, prompt injection, or IaC compliance anomalies found.${colors.reset}\n`);
      return;
    }

    defects.forEach((d, idx) => {
      const sevColor = d.severity === "critical" || d.severity === "high" ? colors.red : d.severity === "medium" ? colors.yellow : colors.teal;
      console.log(`  [${idx + 1}] [${sevColor}${d.severity.toUpperCase()}${colors.reset}] [${colors.indigo}${d.category.toUpperCase()}${colors.reset}] ${colors.bold}${d.file}${d.line ? `:${d.line}` : ""}${colors.reset}`);
      console.log(`      Defect: ${colors.yellow}${d.message}${colors.reset}`);
      if (d.remediation) {
        console.log(`      Remediation: ${colors.green}${d.remediation}${colors.reset}`);
      }
    });
  } catch (err: any) {
    console.error(`Security check failed: ${err.message}`);
  }
}

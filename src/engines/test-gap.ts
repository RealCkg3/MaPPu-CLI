/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as path from "path";
import { getStoredIndex } from "../mappu-core";

export interface UntestedSymbol {
  name: string;
  filePath: string;
}

export interface TestGapReport {
  overallCoverageEstimate: number;
  totalExportsCount: number;
  testedExportsCount: number;
  untestedExportsCount: number;
  untestedSymbols: UntestedSymbol[];
  testFiles: string[];
}

export class TestGapEngine {
  /**
   * Estimates codebase testing parameters statically without running test commands (Idea 7).
   */
  public analyzeGaps(projectRoot: string): TestGapReport {
    const indexWrap = getStoredIndex(projectRoot);
    if (!indexWrap) {
      return {
        overallCoverageEstimate: 0,
        totalExportsCount: 0,
        testedExportsCount: 0,
        untestedExportsCount: 0,
        untestedSymbols: [],
        testFiles: []
      };
    }

    const { registry } = indexWrap;
    const testFiles: string[] = [];
    const sourceFiles: { filePath: string; exports: string[] }[] = [];

    // Sort files between standard application files and test files
    registry.files.forEach(f => {
      const lower = f.filePath.toLowerCase();
      const isTest = lower.includes(".test.") || 
                     lower.includes(".spec.") || 
                     lower.includes("/test/") || 
                     lower.includes("/tests/") || 
                     lower.includes("__tests__");

      if (isTest) {
        testFiles.push(f.filePath);
      } else {
        sourceFiles.push({
          filePath: f.filePath,
          exports: f.exports || []
        });
      }
    });

    // Read full contents of every identified test block to search for symbols imports
    const testFilesContents: string[] = [];
    testFiles.forEach(tf => {
      try {
        const fullPath = path.join(projectRoot, tf);
        testFilesContents.push(fs.readFileSync(fullPath, "utf-8"));
      } catch {
        // skip unreadable
      }
    });

    let totalExports = 0;
    let testedExports = 0;
    const untestedSymbols: UntestedSymbol[] = [];

    sourceFiles.forEach(file => {
      file.exports.forEach(expSymbol => {
        if (!expSymbol || expSymbol === "default") return;

        totalExports++;
        let matchTest = false;

        for (const content of testFilesContents) {
          // Check if symbol exists inside any of the test files (import or direct call)
          if (content.includes(expSymbol)) {
            matchTest = true;
            break;
          }
        }

        if (matchTest) {
          testedExports++;
        } else {
          untestedSymbols.push({
            name: expSymbol,
            filePath: file.filePath
          });
        }
      });
    });

    const percentage = totalExports > 0 ? Math.round((testedExports / totalExports) * 100) : 100;

    return {
      overallCoverageEstimate: percentage,
      totalExportsCount: totalExports,
      testedExportsCount: testedExports,
      untestedExportsCount: totalExports - testedExports,
      untestedSymbols,
      testFiles
    };
  }
}

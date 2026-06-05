/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStoredIndex } from "../mappu-core";

export class DeadCodeEngine {
  /**
   * Evaluates import relationships to isolate dangling or unreferenced file modules.
   */
  public analyzeReachability(projectRoot: string): { filePath: string; isReachable: boolean; referencesCount: number }[] {
    const indexWrap = getStoredIndex(projectRoot);
    if (!indexWrap) {
      return [];
    }

    const { registry } = indexWrap;
    const refCounts: Record<string, number> = {};

    registry.files.forEach(f => {
      refCounts[f.filePath] = 0;
    });

    registry.files.forEach(f => {
      f.imports.forEach((imp: string) => {
        const target = registry.files.find(other => 
          other.filePath !== f.filePath && other.filePath.includes(imp)
        );
        if (target) {
          refCounts[target.filePath] = (refCounts[target.filePath] || 0) + 1;
        }
      });
    });

    return registry.files.map(f => ({
      filePath: f.filePath,
      isReachable: f.filePath === "server.ts" || f.filePath === "index.html" || refCounts[f.filePath] > 0,
      referencesCount: refCounts[f.filePath]
    }));
  }
}

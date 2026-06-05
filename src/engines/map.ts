/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStoredIndex } from "../mappu-core";

export class MapEngine {
  /**
   * Constructs active topology graph representation and formats a Mermaid block.
   */
  public generateMermaidGraph(projectRoot: string): string {
    const indexWrap = getStoredIndex(projectRoot);
    if (!indexWrap) {
      return "graph TD\n  A[Index Missing] --> B[Run Init]";
    }

    const { registry } = indexWrap;
    let md = "graph TD\n";
    
    registry.files.forEach((file, index) => {
      const shortName = file.filePath.split("/").pop() || file.filePath;
      md += `  F${index}["${shortName}"]\n`;
    });

    // Create connections if they imports things
    registry.files.forEach((file, index) => {
      file.imports.forEach((imp: string) => {
        const targetIdx = registry.files.findIndex(f => 
          f.filePath !== file.filePath && f.filePath.includes(imp)
        );
        if (targetIdx !== -1) {
          md += `  F${index} --> F${targetIdx}\n`;
        }
      });
    });

    return md;
  }
}

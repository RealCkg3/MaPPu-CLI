/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImportGraph, CodeNode, CodeEdge } from "../types/graph";

export class ImportGraphBuilder {
  public build(files: any[]): ImportGraph {
    const nodes: CodeNode[] = [];
    const edges: CodeEdge[] = [];

    // Map files and create cross-file references based on imports and exports
    files.forEach(f => {
      nodes.push({
        id: f.filePath,
        label: f.filePath.split("/").pop() || f.filePath,
        type: "file"
      });

      if (f.imports) {
        f.imports.forEach((imp: string) => {
          // Find matching export in other files
          const targetFile = files.find(other => 
            other.exports?.some((e: string) => e === imp || imp.includes(other.filePath))
          );
          if (targetFile) {
            edges.push({
              source: f.filePath,
              target: targetFile.filePath,
              type: "imports"
            });
          }
        });
      }
    });

    return { nodes, edges };
  }
}

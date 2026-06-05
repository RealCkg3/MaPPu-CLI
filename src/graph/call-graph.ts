/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallGraph, CodeNode, CodeEdge } from "../types/graph";

export class CallGraphBuilder {
  public build(files: any[]): CallGraph {
    const nodes: CodeNode[] = [];
    const edges: CodeEdge[] = [];

    files.forEach(f => {
      nodes.push({
        id: f.filePath,
        label: f.filePath.split("/").pop() || f.filePath,
        type: "file",
        metadata: { exports: f.exports }
      });

      // Simple calls tracking setup
      if (f.exports) {
        f.exports.forEach((exp: string) => {
          nodes.push({
            id: `${f.filePath}#${exp}`,
            label: exp,
            type: "function"
          });
          edges.push({
            source: f.filePath,
            target: `${f.filePath}#${exp}`,
            type: "imports"
          });
        });
      }
    });

    return { nodes, edges };
  }
}

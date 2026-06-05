/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallGraph, CodeNode, CodeEdge } from "../types/graph";

export class TypeGraphBuilder {
  public build(files: any[]): CallGraph {
    const nodes: CodeNode[] = [];
    const edges: CodeEdge[] = [];

    // Simple type hierarchy mappings for Classes & Interfaces
    files.forEach(f => {
      if (f.filePath.endsWith(".ts") || f.filePath.endsWith(".tsx")) {
        nodes.push({
          id: f.filePath,
          label: f.filePath.split("/").pop() || f.filePath,
          type: "file"
        });
      }
    });

    return { nodes, edges };
  }
}

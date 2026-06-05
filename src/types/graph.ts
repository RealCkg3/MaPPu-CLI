/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CodeNode {
  id: string; // filePath + SymbolName or pure filePath
  label: string;
  type: "file" | "function" | "class";
  metadata?: Record<string, any>;
}

export interface CodeEdge {
  source: string;
  target: string;
  type: "calls" | "imports" | "extends";
}

export interface CallGraph {
  nodes: CodeNode[];
  edges: CodeEdge[];
}

export interface ImportGraph {
  nodes: CodeNode[];
  edges: CodeEdge[];
}

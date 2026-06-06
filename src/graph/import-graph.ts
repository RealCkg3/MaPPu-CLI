/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DirectedGraph } from "graphology";
import { hasCycle } from "graphology-dag";
import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import { ImportGraph, CodeNode, CodeEdge } from "../types/graph";

export class ImportGraphBuilder {
  private graph: DirectedGraph | null = null;
  private dbPath: string;
  private selfImports = new Set<string>();

  constructor(projectRoot: string = process.cwd()) {
    this.dbPath = path.join(projectRoot, ".mappu", "mappu.db");
  }

  /**
   * Lazily loads and constructs the import graph from DB.
   */
  private ensureGraph(): DirectedGraph {
    if (this.graph) {
      return this.graph;
    }

    const graph = new DirectedGraph();
    this.selfImports.clear();

    if (!fs.existsSync(this.dbPath)) {
      this.graph = graph;
      return graph;
    }

    try {
      const db = new Database(this.dbPath);

      // Load all files as node candidates
      const files = db.prepare("SELECT filePath FROM files").all() as { filePath: string }[];
      for (const file of files) {
        if (file.filePath && !graph.hasNode(file.filePath)) {
          graph.addNode(file.filePath);
        }
      }

      // Check imports table or fallback to edges table
      let rawEdges: { source: string; target: string }[] = [];
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='imports'").get();

      if (tableCheck) {
        try {
          const info = db.prepare("PRAGMA table_info(imports)").all() as any[];
          const hasResolvedFile = info.some(c => c.name === "resolved_file");
          const hasSource = info.some(c => c.name === "source");
          const hasFilePath = info.some(c => c.name === "filePath" || c.name === "file_path");

          const srcCol = hasSource ? "source" : (info.some(c => c.name === "file_path") ? "file_path" : "filePath");
          const tgtCol = hasResolvedFile ? "resolved_file" : "target";

          rawEdges = db.prepare(`
            SELECT ${srcCol} AS source, ${tgtCol} AS target 
            FROM imports 
            WHERE ${tgtCol} IS NOT NULL
          `).all() as any[];
        } catch {
          // Fallback to edges if it fails
        }
      }

      // If no edges populated from specialized table, use edges table
      if (rawEdges.length === 0) {
        rawEdges = db.prepare(`
          SELECT source, target 
          FROM edges 
          WHERE type = 'imports' AND target IS NOT NULL
        `).all() as any[];
      }

      // Populate edges
      for (const edge of rawEdges) {
        const source = edge.source;
        const target = edge.target;

        if (!source || !target) {
          continue;
        }

        // Handle case where a file imports itself
        if (source === target) {
          this.selfImports.add(source);
          continue;
        }

        if (!graph.hasNode(source)) {
          graph.addNode(source);
        }
        if (!graph.hasNode(target)) {
          graph.addNode(target);
        }

        if (!graph.hasEdge(source, target)) {
          graph.addEdge(source, target);
        }
      }

      db.close();
    } catch (error) {
      console.error("[ImportGraphBuilder] Failed to build import graph from DB:", error);
    }

    this.graph = graph;
    return graph;
  }

  /**
   * Returns high-level graph object for external algorithm processing.
   */
  public getGraph(): DirectedGraph {
    return this.ensureGraph();
  }

  /**
   * Returns list of other files imported by this file.
   */
  public getImports(fileId: string): string[] {
    const graph = this.ensureGraph();
    if (!graph.hasNode(fileId)) return [];
    return graph.outNeighbors(fileId);
  }

  /**
   * Returns list of other files that import this file.
   */
  public getImporters(fileId: string): string[] {
    const graph = this.ensureGraph();
    if (!graph.hasNode(fileId)) return [];
    return graph.inNeighbors(fileId);
  }

  /**
   * Detects cycle paths in the graph using DFS recursion backtracking.
   */
  public findCycles(): string[][] {
    const graph = this.ensureGraph();
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack: string[] = [];

    // Add self-import cycles
    for (const file of this.selfImports) {
      cycles.push([file, file]);
    }

    // Verify if there is even any cycle using graphology-dag
    if (!hasCycle(graph) && cycles.length > 0) {
      return cycles;
    }

    const dfs = (node: string) => {
      visited.add(node);
      recStack.push(node);

      const neighbors = graph.outNeighbors(node);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else {
          const recIdx = recStack.indexOf(neighbor);
          if (recIdx !== -1) {
            // Cycle detected!
            const cycle = recStack.slice(recIdx);
            cycle.push(neighbor); // path back to start
            cycles.push(cycle);
          }
        }
      }

      recStack.pop();
    };

    for (const node of graph.nodes()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * Legacy build method for compatibility with the frontend Visualizer.
   */
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

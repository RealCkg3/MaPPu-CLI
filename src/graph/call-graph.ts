/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DirectedGraph } from "graphology";
import { bidirectional } from "graphology-shortest-path";
import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import { CallGraph, CodeNode, CodeEdge } from "../types/graph";

export class CallGraphBuilder {
  private graph: DirectedGraph | null = null;
  private dbPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.dbPath = path.join(projectRoot, ".mappu", "mappu.db");
  }

  /**
   * Lazily loads and constructs the call graph from DB once.
   */
  private ensureGraph(): DirectedGraph {
    if (this.graph) {
      return this.graph;
    }

    const graph = new DirectedGraph();

    if (!fs.existsSync(this.dbPath)) {
      this.graph = graph;
      return graph;
    }

    try {
      const db = new Database(this.dbPath);

      // Load all defined symbols from DB as base nodes
      const symbols = db.prepare("SELECT id FROM symbols").all() as { id: string }[];
      for (const sym of symbols) {
        if (sym.id && !graph.hasNode(sym.id)) {
          graph.addNode(sym.id);
        }
      }

      // Check for a physical 'calls' table first, otherwise query standard 'edges' table
      let rawEdges: { source: string; target: string; callee_symbol?: string | null }[] = [];
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='calls'").get();

      if (tableCheck) {
        try {
          rawEdges = db.prepare(`
            SELECT source, target, callee_symbol 
            FROM calls
          `).all() as any[];
        } catch {
          // Handled via fallback
        }
      } else {
        rawEdges = db.prepare(`
          SELECT 
            e.source, 
            e.target, 
            s.id AS callee_symbol 
          FROM edges e 
          LEFT JOIN symbols s ON e.target = s.id 
          WHERE e.type = 'calls'
        `).all() as any[];
      }

      // Populate edges into the graphology network
      for (const edge of rawEdges) {
        const sourceId = edge.source;
        // If callee_symbol is null/undefined, the callee is external/unresolved
        // Fallback gracefully to the target identifier to maintain external links
        const targetId = edge.callee_symbol || edge.target;

        if (!sourceId || !targetId) {
          continue;
        }

        if (!graph.hasNode(sourceId)) {
          graph.addNode(sourceId);
        }
        if (!graph.hasNode(targetId)) {
          graph.addNode(targetId);
        }

        if (!graph.hasEdge(sourceId, targetId)) {
          graph.addEdge(sourceId, targetId);
        }
      }

      db.close();
    } catch (error) {
      console.error("[CallGraphBuilder] Failed to build call graph from DB:", error);
    }

    this.graph = graph;
    return graph;
  }

  /**
   * Returns list of children/callees called by the given symbolId.
   */
  public getCallees(symbolId: string): string[] {
    const graph = this.ensureGraph();
    if (!graph.hasNode(symbolId)) return [];
    return graph.outNeighbors(symbolId);
  }

  /**
   * Returns list of parents/callers invoking the given symbolId.
   */
  public getCallers(symbolId: string): string[] {
    const graph = this.ensureGraph();
    if (!graph.hasNode(symbolId)) return [];
    return graph.inNeighbors(symbolId);
  }

  /**
   * Finds the shortest path between two symbols using bidirectional search.
   */
  public findPath(fromId: string, toId: string): string[] | null {
    const graph = this.ensureGraph();
    if (!graph.hasNode(fromId) || !graph.hasNode(toId)) return null;
    try {
      return bidirectional(graph, fromId, toId);
    } catch {
      return null;
    }
  }

  /**
   * Legacy build method for compatibility with the generic files visualizer.
   */
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

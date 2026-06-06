/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DirectedGraph } from "graphology";
import { stronglyConnectedComponents } from "graphology-components";

export class GraphAlgorithms {
  /**
   * Depth-First-Search (DFS) cycle detector for circular import dependencies.
   */
  public hasCycle(edges: any[]): boolean {
    const adj: Record<string, string[]> = {};
    edges.forEach(e => {
      if (!adj[e.source]) adj[e.source] = [];
      adj[e.source].push(e.target);
    });

    const visited: Record<string, boolean> = {};
    const recStack: Record<string, boolean> = {};

    const dfs = (node: string): boolean => {
      if (recStack[node]) return true;
      if (visited[node]) return false;

      visited[node] = true;
      recStack[node] = true;

      const neighbors = adj[node] || [];
      for (const n of neighbors) {
        if (dfs(n)) return true;
      }

      recStack[node] = false;
      return false;
    };

    for (const node of Object.keys(adj)) {
      if (dfs(node)) return true;
    }

    return false;
  }

  /**
   * Breadth-First-Search (BFS) reachability / shortest path tracking.
   */
  public findShortestPath(edges: any[], start: string, end: string): string[] | null {
    const adj: Record<string, string[]> = {};
    edges.forEach(e => {
      if (!adj[e.source]) adj[e.source] = [];
      adj[e.source].push(e.target);
    });

    const queue: string[][] = [[start]];
    const visited = new Set<string>([start]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const node = path[path.length - 1];

      if (node === end) return path;

      const neighbors = adj[node] || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push([...path, n]);
        }
      }
    }

    return null;
  }

  /**
   * Finds strongly connected components (SCCs) in a directed graph using Tarjan's algorithm.
   */
  public findStronglyConnectedComponents(graph: DirectedGraph): string[][] {
    if (!graph || typeof graph.forEachNode !== "function") {
      return [];
    }
    try {
      return stronglyConnectedComponents(graph);
    } catch (err) {
      console.error("[GraphAlgorithms] Failed to compute strongly connected components:", err);
      return [];
    }
  }

  /**
   * Returns all reachable node IDs starting from the given set of starting nodes.
   * Highly useful for dead code/tree-shaking analysis.
   */
  public getReachableFrom(graph: DirectedGraph, startNodeIds: string[]): string[] {
    const visited = new Set<string>();
    const queue: string[] = [];

    for (const startId of startNodeIds) {
      if (graph.hasNode(startId)) {
        queue.push(startId);
        visited.add(startId);
      }
    }

    while (queue.length > 0) {
      const node = queue.shift()!;
      let neighbors: string[] = [];
      try {
        neighbors = graph.outNeighbors(node);
      } catch {
        try {
          neighbors = graph.neighbors(node);
        } catch {
          // No neighbors found
        }
      }

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return Array.from(visited);
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
}

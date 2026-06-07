/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImportGraphBuilder } from "../graph/import-graph";
import { CommunityDetector } from "../graph/community";

export class MapEngine {
  private isEdgeInCycle(source: string, target: string, cycles: string[][]): boolean {
    for (const cycle of cycles) {
      for (let i = 0; i < cycle.length - 1; i++) {
        if (cycle[i] === source && cycle[i + 1] === target) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Constructs active topology graph representation and formats a Mermaid block.
   * Includes depth-limit BFS starting from entry points, clustering subgraphs,
   * and highlighting cyclic dependencies.
   */
  public generateMermaidGraph(projectRoot: string, maxDepth?: number): string {
    const builder = new ImportGraphBuilder(projectRoot);
    const graph = builder.getGraph();
    const detector = new CommunityDetector(projectRoot);
    const clusters = detector.getClusters();

    const nodes = graph.nodes();
    if (nodes.length === 0) {
      return "graph TD\n  A[Index Missing / No Files] --> B[Run Init]";
    }

    // Determine Entry Points
    let entryPoints = nodes.filter(node => {
      const inNeighbors = graph.inNeighbors(node).filter(neigh => neigh !== node);
      return inNeighbors.length === 0;
    });

    if (entryPoints.length === 0) {
      const commonEntries = ["server.ts", "src/cli.ts", "src/main.tsx", "src/index.ts", "src/main.ts", "src/cli/index.ts"];
      entryPoints = nodes.filter(node => commonEntries.some(suffix => node.endsWith(suffix)));
    }

    if (entryPoints.length === 0) {
      entryPoints = nodes;
    }

    // BFS Traversal for Depth limit
    let nodesToRender = new Set<string>();
    if (maxDepth !== undefined && maxDepth >= 0) {
      const queue: [string, number][] = [];
      const visited = new Set<string>();

      for (const ep of entryPoints) {
        queue.push([ep, 0]);
        visited.add(ep);
      }

      while (queue.length > 0) {
        const [curr, depth] = queue.shift()!;
        nodesToRender.add(curr);

        if (depth < maxDepth) {
          const outNeighbors = graph.outNeighbors(curr);
          for (const neigh of outNeighbors) {
            if (!visited.has(neigh)) {
              visited.add(neigh);
              queue.push([neigh, depth + 1]);
            }
          }
        }
      }
    } else {
      nodesToRender = new Set(nodes);
    }

    // Group nodes into clusters
    const renderedClusters = new Map<string, string[]>();
    const unclustered: string[] = [];

    const fileToCluster = new Map<string, string>();
    for (const [clusterId, paths] of clusters.entries()) {
      for (const p of paths) {
        fileToCluster.set(p, clusterId);
      }
    }

    for (const node of nodesToRender) {
      const clusterId = fileToCluster.get(node);
      if (clusterId) {
        if (!renderedClusters.has(clusterId)) {
          renderedClusters.set(clusterId, []);
        }
        renderedClusters.get(clusterId)!.push(node);
      } else {
        unclustered.push(node);
      }
    }

    // Cycle detection
    const cycles = builder.findCycles();
    const nodesInCycle = new Set<string>();
    for (const cycle of cycles) {
      for (const node of cycle) {
        nodesInCycle.add(node);
      }
    }

    // Generate output Mermaid markdown
    let md = "graph TD\n";

    // Subgraphs for clustered nodes
    for (const [clusterId, paths] of renderedClusters.entries()) {
      md += `  subgraph ${clusterId} ["${clusterId}"]\n`;
      for (const p of paths) {
        const name = p.replace(/[^a-zA-Z0-9]/g, "_");
        md += `    ${name}["${p}"]\n`;
      }
      md += "  end\n";
    }

    // Unclustered nodes
    if (unclustered.length > 0) {
      md += "  subgraph unclustered [\"Unclustered Files\"]\n";
      for (const p of unclustered) {
        const name = p.replace(/[^a-zA-Z0-9]/g, "_");
        md += `    ${name}["${p}"]\n`;
      }
      md += "  end\n";
    }

    // Edges
    let edgeIdx = 0;
    const cycleLinkStyles: string[] = [];
    const renderedEdges = new Set<string>();

    for (const source of nodesToRender) {
      const sourceName = source.replace(/[^a-zA-Z0-9]/g, "_");
      const outNeighbors = graph.outNeighbors(source);

      for (const target of outNeighbors) {
        if (nodesToRender.has(target)) {
          const edgeKey = `${source}|||${target}`;
          if (renderedEdges.has(edgeKey)) continue;
          renderedEdges.add(edgeKey);

          const targetName = target.replace(/[^a-zA-Z0-9]/g, "_");
          const inCycle = this.isEdgeInCycle(source, target, cycles);

          if (inCycle) {
            md += `  ${sourceName} -->|cycle| ${targetName}\n`;
            cycleLinkStyles.push(`  linkStyle ${edgeIdx} stroke:#ff0000,stroke-width:2.2px;`);
          } else {
            md += `  ${sourceName} --> ${targetName}\n`;
          }
          edgeIdx++;
        }
      }
    }

    // Highlight cycle nodes
    for (const node of nodesToRender) {
      if (nodesInCycle.has(node)) {
        const nodeName = node.replace(/[^a-zA-Z0-9]/g, "_");
        md += `  style ${nodeName} stroke:#ff0000,stroke-width:2px,fill:#ffebee;\n`;
      }
    }

    if (cycleLinkStyles.length > 0) {
      md += "\n" + cycleLinkStyles.join("\n") + "\n";
    }

    return md;
  }

  /**
   * Constructs active topology graph representation and formats a DOT block.
   */
  public generateDotGraph(projectRoot: string, maxDepth?: number): string {
    const builder = new ImportGraphBuilder(projectRoot);
    const graph = builder.getGraph();
    const detector = new CommunityDetector(projectRoot);
    const clusters = detector.getClusters();

    const nodes = graph.nodes();
    if (nodes.length === 0) {
      return "digraph G {\n  A [label=\"Index Missing\"];\n}";
    }

    // Determine Entry Points
    let entryPoints = nodes.filter(node => {
      const inNeighbors = graph.inNeighbors(node).filter(neigh => neigh !== node);
      return inNeighbors.length === 0;
    });

    if (entryPoints.length === 0) {
      const commonEntries = ["server.ts", "src/cli.ts", "src/main.tsx", "src/index.ts", "src/main.ts", "src/cli/index.ts"];
      entryPoints = nodes.filter(node => commonEntries.some(suffix => node.endsWith(suffix)));
    }

    if (entryPoints.length === 0) {
      entryPoints = nodes;
    }

    // BFS Traversal for Depth limit
    let nodesToRender = new Set<string>();
    if (maxDepth !== undefined && maxDepth >= 0) {
      const queue: [string, number][] = [];
      const visited = new Set<string>();

      for (const ep of entryPoints) {
        queue.push([ep, 0]);
        visited.add(ep);
      }

      while (queue.length > 0) {
        const [curr, depth] = queue.shift()!;
        nodesToRender.add(curr);

        if (depth < maxDepth) {
          const outNeighbors = graph.outNeighbors(curr);
          for (const neigh of outNeighbors) {
            if (!visited.has(neigh)) {
              visited.add(neigh);
              queue.push([neigh, depth + 1]);
            }
          }
        }
      }
    } else {
      nodesToRender = new Set(nodes);
    }

    // Group nodes into clusters
    const renderedClusters = new Map<string, string[]>();
    const unclustered: string[] = [];

    const fileToCluster = new Map<string, string>();
    for (const [clusterId, paths] of clusters.entries()) {
      for (const p of paths) {
        fileToCluster.set(p, clusterId);
      }
    }

    for (const node of nodesToRender) {
      const clusterId = fileToCluster.get(node);
      if (clusterId) {
        if (!renderedClusters.has(clusterId)) {
          renderedClusters.set(clusterId, []);
        }
        renderedClusters.get(clusterId)!.push(node);
      } else {
        unclustered.push(node);
      }
    }

    // Cycle detection
    const cycles = builder.findCycles();
    const nodesInCycle = new Set<string>();
    for (const cycle of cycles) {
      for (const node of cycle) {
        nodesInCycle.add(node);
      }
    }

    // Generate output DOT code
    let dot = "digraph Codebase {\n";
    dot += "  node [shape=box, style=filled, fillcolor=\"#f3f4f6\"];\n";

    // Process clusters inside subgraphs
    let clusterIdx = 0;
    for (const [clusterId, paths] of renderedClusters.entries()) {
      dot += `  subgraph cluster_${clusterIdx++} {\n`;
      dot += `    label = "${clusterId}";\n`;
      dot += "    style = dashed;\n";
      dot += "    color = blue;\n";
      for (const p of paths) {
        const inCycle = nodesInCycle.has(p);
        const cycleStyle = inCycle ? " color=\"red\" penwidth=2.0 fillcolor=\"#ffebee\"" : "";
        dot += `    "${p}" [label="${p}"${cycleStyle}];\n`;
      }
      dot += "  }\n";
    }

    // Unclustered nodes
    if (unclustered.length > 0) {
      dot += `  subgraph cluster_unclustered {\n`;
      dot += `    label = "Unclustered Files";\n`;
      dot += "    style = dashed;\n";
      dot += "    color = gray;\n";
      for (const p of unclustered) {
        const inCycle = nodesInCycle.has(p);
        const cycleStyle = inCycle ? " color=\"red\" penwidth=2.0 fillcolor=\"#ffebee\"" : "";
        dot += `    "${p}" [label="${p}"${cycleStyle}];\n`;
      }
      dot += "  }\n";
    }

    // Edges
    const renderedEdges = new Set<string>();

    for (const source of nodesToRender) {
      const outNeighbors = graph.outNeighbors(source);

      for (const target of outNeighbors) {
        if (nodesToRender.has(target)) {
          const edgeKey = `${source}|||${target}`;
          if (renderedEdges.has(edgeKey)) continue;
          renderedEdges.add(edgeKey);

          const inCycle = this.isEdgeInCycle(source, target, cycles);
          if (inCycle) {
            dot += `  "${source}" -> "${target}" [color="red", penwidth=2.2, label="cycle"];\n`;
          } else {
            dot += `  "${source}" -> "${target}";\n`;
          }
        }
      }
    }

    dot += "}\n";
    return dot;
  }
}

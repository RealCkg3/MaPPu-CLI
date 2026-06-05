/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class CommunityDetector {
  /**
   * Identifies logical modular groups or clusters inside codebases.
   * Simple Louvain modularity estimation by grouping files based on mutual imports.
   */
  public detectCommunities(nodes: any[], edges: any[]): Record<string, string[]> {
    const communities: Record<string, string[]> = {};
    let clusterCounter = 1;

    // Default: seed all file nodes to their own clusters
    nodes.forEach(node => {
      if (node.type === "file") {
        const key = `Module_Cluster_${clusterCounter++}`;
        communities[key] = [node.id];
      }
    });

    // Simplify groupings if edges overlap
    edges.forEach(edge => {
      const srcCluster = Object.keys(communities).find(k => communities[k].includes(edge.source));
      const tgtCluster = Object.keys(communities).find(k => communities[k].includes(edge.target));

      if (srcCluster && tgtCluster && srcCluster !== tgtCluster) {
        // Merge targets into source
        communities[srcCluster].push(...communities[tgtCluster]);
        delete communities[tgtCluster];
      }
    });

    return communities;
  }
}

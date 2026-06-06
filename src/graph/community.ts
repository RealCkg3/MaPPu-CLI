/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UndirectedGraph } from "graphology";
import louvain from "graphology-communities-louvain";
import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import { ImportGraphBuilder } from "./import-graph";

export class CommunityDetector {
  private dbPath: string;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.dbPath = path.join(projectRoot, ".mappu", "mappu.db");
  }

  /**
   * Computes communities using the true Louvain modularity algorithm of graphology.
   * Persists results into the sqlite database 'communities' table, so detection
   * runs once and is loaded fast from the DB in future inquiries.
   */
  public runDetection(): void {
    const builder = new ImportGraphBuilder(this.projectRoot);
    const directedGraph = builder.getGraph();

    const undirected = new UndirectedGraph();

    // 1. Add all nodes to undirected graph
    directedGraph.forEachNode(node => {
      undirected.addNode(node);
    });

    // 2. Add all undirected edges (skipping direct self-loops and avoids duplicates)
    directedGraph.forEachEdge((_edge, _attributes, source, target) => {
      if (source !== target && !undirected.hasEdge(source, target)) {
        undirected.addEdge(source, target);
      }
    });

    // 3. Compute Louvain partitioning mapping: Record<filePath, number | string>
    const communities = louvain(undirected) as Record<string, string | number>;

    // 4. Save mapped clustering outputs directly to the DB communities store
    try {
      const db = new Database(this.dbPath);
      db.prepare(`
        CREATE TABLE IF NOT EXISTS communities (
          filePath TEXT PRIMARY KEY,
          communityId TEXT NOT NULL,
          FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE
        )
      `).run();

      db.transaction(() => {
        db.prepare("DELETE FROM communities").run();
        const insertStmt = db.prepare(`
          INSERT INTO communities (filePath, communityId)
          VALUES (?, ?)
        `);
        for (const [filePath, commId] of Object.entries(communities)) {
          insertStmt.run(filePath, `cluster_${commId}`);
        }
      })();

      db.close();
    } catch (err) {
      console.error("[CommunityDetector] Failed to persist detected Louvain communities to DB:", err);
    }
  }

  /**
   * Exposes cluster results grouping associated project files together.
   * Returns a Map matching of clusterId to file paths.
   */
  public getClusters(): Map<string, string[]> {
    const clusters = new Map<string, string[]>();

    try {
      const db = new Database(this.dbPath);
      // Ensure the table exists
      db.prepare(`
        CREATE TABLE IF NOT EXISTS communities (
          filePath TEXT PRIMARY KEY,
          communityId TEXT NOT NULL,
          FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE
        )
      `).run();

      const rows = db.prepare(`
        SELECT filePath, communityId FROM communities
      `).all() as { filePath: string; communityId: string }[];
      db.close();

      // If empty in DB, run a Louvain computation cycle now to initialize the database records
      if (rows.length === 0) {
        this.runDetection();
        return this.getClusters();
      }

      for (const row of rows) {
        const arr = clusters.get(row.communityId) || [];
        arr.push(row.filePath);
        clusters.set(row.communityId, arr);
      }
    } catch (err) {
      console.error("[CommunityDetector] Failed to query communities list from DB:", err);
    }

    return clusters;
  }

  /**
   * Legacy simulation method preserved for backward integration compatibility.
   */
  public detectCommunities(_nodes?: any[], _edges?: any[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    const clusters = this.getClusters();
    for (const [clusterId, paths] of clusters.entries()) {
      result[clusterId] = paths;
    }
    return result;
  }
}

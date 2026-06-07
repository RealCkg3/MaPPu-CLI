/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

export interface FileComplexityRecord {
  filePath: string;
  maxComplexity: number;
  totalComplexity: number;
  language: string;
}

export interface LanguageStat {
  language: string;
  count: number;
}

export interface StatsReport {
  totalFiles: number;
  totalLines: number;
  avgComplexity: number;
  maxComplexity: number;
  languageDistribution: LanguageStat[];
  topComplexFiles: FileComplexityRecord[];
  communityCount: number;
}

export class StatsEngine {
  /**
   * Return high-fidelity codebase metrics from SQLite indexed database schemas.
   */
  public getStats(projectRoot: string): StatsReport {
    const dbPath = path.join(projectRoot, ".mappu", "mappu.db");
    
    // Ensure the folder exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");

    try {
      // Ensure tables exist in case migration or schema is not fully ready
      db.prepare(`
        CREATE TABLE IF NOT EXISTS files (
          filePath TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          languages TEXT NOT NULL,
          scannedAt TEXT NOT NULL,
          hash TEXT NOT NULL DEFAULT '',
          line_count INTEGER NOT NULL DEFAULT 0
        )
      `).run();

      db.prepare(`
        CREATE TABLE IF NOT EXISTS symbols (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          kind TEXT NOT NULL,
          filePath TEXT NOT NULL,
          startLine INTEGER NOT NULL,
          endLine INTEGER NOT NULL,
          start_line INTEGER NOT NULL DEFAULT 1,
          end_line INTEGER NOT NULL DEFAULT 1,
          complexity INTEGER NOT NULL DEFAULT 0,
          param_count INTEGER NOT NULL DEFAULT 0,
          isExported INTEGER DEFAULT 0,
          FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE
        )
      `).run();

      db.prepare(`
        CREATE TABLE IF NOT EXISTS communities (
          filePath TEXT PRIMARY KEY,
          communityId TEXT NOT NULL,
          FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE
        )
      `).run();

      // 1. Fetch basic counts and sum of line_counts
      const fileAgg = db.prepare(`
        SELECT COUNT(*) as totalFiles, COALESCE(SUM(line_count), 0) as totalLines FROM files
      `).get() as { totalFiles: number; totalLines: number };

      // 2. AVG(complexity) and MAX(complexity) from symbols table
      const complexityAgg = db.prepare(`
        SELECT COALESCE(AVG(complexity), 0) as avgComplexity, COALESCE(MAX(complexity), 0) as maxComplexity FROM symbols
      `).get() as { avgComplexity: number; maxComplexity: number };

      // 3. COUNT(*) by language
      const languageDistribution = db.prepare(`
        SELECT languages as language, COUNT(*) as count FROM files GROUP BY languages
      `).all() as LanguageStat[];

      // 4. top 10 most complex files from symbols joined with files
      const topComplexFiles = db.prepare(`
        SELECT f.filePath, COALESCE(MAX(s.complexity), 0) as maxComplexity, COALESCE(SUM(s.complexity), 0) as totalComplexity, f.languages as language
        FROM files f
        JOIN symbols s ON f.filePath = s.filePath
        GROUP BY f.filePath
        ORDER BY totalComplexity DESC, maxComplexity DESC
        LIMIT 10
      `).all() as FileComplexityRecord[];

      // 5. Community count from communities table
      const commAgg = db.prepare(`
        SELECT COUNT(DISTINCT communityId) as communityCount FROM communities
      `).get() as { communityCount: number };

      return {
        totalFiles: fileAgg.totalFiles,
        totalLines: fileAgg.totalLines,
        avgComplexity: Number(complexityAgg.avgComplexity.toFixed(2)),
        maxComplexity: complexityAgg.maxComplexity,
        languageDistribution,
        topComplexFiles,
        communityCount: commAgg.communityCount
      };
    } finally {
      db.close();
    }
  }
}

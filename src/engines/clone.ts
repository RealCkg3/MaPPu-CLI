/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

export class CloneEngine {
  /**
   * Fast Rabin-Karp or sliding window hash duplicate code block detector,
   * coupled with SQLite based AST structural hash comparison query.
   */
  public detectDuplicates(
    files: { filePath: string; content: string }[],
    projectRoot: string = process.cwd()
  ): {
    filePathA: string;
    filePathB: string;
    startLineA: number;
    endLineA: number;
    startLineB: number;
    endLineB: number;
    duplicatedLines: number;
    preview: string;
    similarityKind: string;
    structHash?: string;
  }[] {
    const dbPath = path.join(projectRoot, ".mappu", "mappu.db");
    if (!fs.existsSync(dbPath)) {
      return this.slidingWindowFallback(files);
    }

    try {
      const db = new Database(dbPath);
      db.pragma("foreign_keys = ON");

      // Verify that struct_hash column exists to avoid SQL syntax error before the migration runs
      const tableInfo = db.prepare("PRAGMA table_info(chunks)").all() as any[];
      const structHashExists = tableInfo.some(col => col.name === "struct_hash");
      if (!structHashExists) {
        db.close();
        return this.slidingWindowFallback(files);
      }

      // SELECT struct_hash, COUNT(*) FROM chunks GROUP BY struct_hash HAVING COUNT(*) > 1
      const duplicateHashes = db.prepare(`
        SELECT struct_hash, COUNT(*) as cnt 
        FROM chunks 
        WHERE struct_hash IS NOT NULL AND struct_hash != ''
        GROUP BY struct_hash 
        HAVING COUNT(*) > 1
      `).all() as { struct_hash: string; cnt: number }[];

      if (duplicateHashes.length === 0) {
        db.close();
        return this.slidingWindowFallback(files);
      }

      // Group chunks matching duplicate hashes
      const placeHolders = duplicateHashes.map(() => "?").join(",");
      const duplicateChunks = db.prepare(`
        SELECT id, filePath, startLine, endLine, content, struct_hash 
        FROM chunks 
        WHERE struct_hash IN (${placeHolders})
      `).all(duplicateHashes.map(h => h.struct_hash)) as {
        id: string;
        filePath: string;
        startLine: number;
        endLine: number;
        content: string;
        struct_hash: string;
      }[];

      db.close();

      const groups = new Map<string, typeof duplicateChunks>();
      for (const chunk of duplicateChunks) {
        if (!groups.has(chunk.struct_hash)) {
          groups.set(chunk.struct_hash, []);
        }
        groups.get(chunk.struct_hash)!.push(chunk);
      }

      const duplicates: any[] = [];
      for (const [hash, chunksInGroup] of groups.entries()) {
        for (let i = 0; i < chunksInGroup.length; i++) {
          for (let j = i + 1; j < chunksInGroup.length; j++) {
            const chunkA = chunksInGroup[i];
            const chunkB = chunksInGroup[j];

            // Skip pairing a chunk with itself or identical lines in the same file
            if (chunkA.filePath === chunkB.filePath) {
              if (Math.abs(chunkA.startLine - chunkB.startLine) < 5) {
                continue;
              }
            }

            const cleanContentA = chunkA.content.replace(/\s+/g, "");
            const cleanContentB = chunkB.content.replace(/\s+/g, "");
            const isExact = cleanContentA === cleanContentB;

            const similarityKind = isExact 
              ? "Exact duplicate containing identical statement blocks" 
              : "Parameterized logic with renamed variables and signature labels";

            const linesA = chunkA.content.split("\n");
            const linesB = chunkB.content.split("\n");
            const duplicatedLines = Math.max(linesA.length, linesB.length);

            duplicates.push({
              filePathA: chunkA.filePath,
              filePathB: chunkB.filePath,
              startLineA: chunkA.startLine,
              endLineA: chunkA.endLine,
              startLineB: chunkB.startLine,
              endLineB: chunkB.endLine,
              duplicatedLines,
              preview: chunkA.content,
              similarityKind,
              structHash: hash
            });
          }
        }
      }

      return duplicates;
    } catch {
      return this.slidingWindowFallback(files);
    }
  }

  private slidingWindowFallback(files: { filePath: string; content: string }[]): any[] {
    const duplicates: any[] = [];
    const blockHashes: Record<string, { filePath: string; startLine: number; endLine: number }> = {};

    files.forEach(file => {
      const lines = file.content.split("\n");
      const size = 6;
      for (let idx = 0; idx <= lines.length - size; idx++) {
        const windowText = lines.slice(idx, idx + size).join("\n").trim();
        if (windowText.length > 80) { // skip empty/tiny blocks
          if (blockHashes[windowText] && blockHashes[windowText].filePath !== file.filePath) {
            duplicates.push({
              filePathA: blockHashes[windowText].filePath,
              filePathB: file.filePath,
              startLineA: blockHashes[windowText].startLine,
              endLineA: blockHashes[windowText].endLine,
              startLineB: idx + 1,
              endLineB: idx + size,
              duplicatedLines: size,
              preview: windowText,
              similarityKind: "Exact duplicate containing identical statement blocks"
            });
            break; // limit reporting per file
          } else {
            blockHashes[windowText] = {
              filePath: file.filePath,
              startLine: idx + 1,
              endLine: idx + size
            };
          }
        }
      }
    });

    return duplicates;
  }
}

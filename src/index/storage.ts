/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { initializeDatabase } from "./schema";
import { IndexRegistry, FileChunk } from "../mappu-core";
import { computeStructHash } from "../parser/hasher";

export class StorageManager {
  private db?: Database.Database;

  public open(projectRoot: string): Database.Database {
    const dotMappu = path.join(projectRoot, ".mappu");
    if (!fs.existsSync(dotMappu)) {
      fs.mkdirSync(dotMappu, { recursive: true });
    }
    const dbPath = path.join(dotMappu, "mappu.db");
    const db = initializeDatabase(dbPath);
    db.pragma("journal_mode = WAL");
    this.db = db;
    return db;
  }

  private ensureDb(): Database.Database {
    if (!this.db) {
      this.open(process.cwd());
    }
    return this.db!;
  }

  public insertFile(filePath: string, description: string, languages: string, scannedAt: string, hash: string = ""): void {
    const db = this.ensureDb();
    db.prepare(`
      INSERT OR REPLACE INTO files (filePath, description, languages, scannedAt, hash)
      VALUES (?, ?, ?, ?, ?)
    `).run(filePath, description, languages, scannedAt, hash);
  }

  public insertSymbol(id: string, name: string, kind: string, filePath: string, startLine: number, endLine: number, isExported: boolean | number): void {
    const db = this.ensureDb();
    const val = typeof isExported === "boolean" ? (isExported ? 1 : 0) : isExported;
    db.prepare(`
      INSERT OR REPLACE INTO symbols (id, name, kind, filePath, startLine, endLine, isExported)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, kind, filePath, startLine, endLine, val);
  }

  public insertImport(id: string, source: string, target: string): void {
    const db = this.ensureDb();
    db.prepare(`
      INSERT OR REPLACE INTO edges (id, source, target, type)
      VALUES (?, ?, ?, 'imports')
    `).run(id, source, target);
  }

  public insertCall(id: string, source: string, target: string): void {
    const db = this.ensureDb();
    db.prepare(`
      INSERT OR REPLACE INTO edges (id, source, target, type)
      VALUES (?, ?, ?, 'calls')
    `).run(id, source, target);
  }

  public insertChunk(id: string, filePath: string, startLine: number, endLine: number, summary: string, intentTags: string[], content: string): void {
    const db = this.ensureDb();
    const tagsStr = JSON.stringify(intentTags);
    db.prepare(`
      INSERT OR REPLACE INTO chunks (id, filePath, startLine, endLine, summary, intentTags, content)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, filePath, startLine, endLine, summary, tagsStr, content);
  }

  public getFileByPath(filePath: string): any {
    const db = this.ensureDb();
    return db.prepare(`SELECT * FROM files WHERE filePath = ?`).get(filePath);
  }

  public getSymbolsByFile(filePath: string): any[] {
    const db = this.ensureDb();
    return db.prepare(`SELECT * FROM symbols WHERE filePath = ?`).all(filePath);
  }

  public getAllFiles(): any[] {
    const db = this.ensureDb();
    return db.prepare(`SELECT * FROM files`).all();
  }

  public deleteFileData(filePath: string): void {
    const db = this.ensureDb();
    db.prepare(`DELETE FROM files WHERE filePath = ?`).run(filePath);
  }

  /**
   * Save handles bulk insertion within an SQLite transaction for maximum database performance.
   */
  public async save(projectRoot: string, registry: IndexRegistry, chunks: FileChunk[]): Promise<void> {
    const db = this.open(projectRoot);

    // Precompute hashes for files in registry
    const { hashFile } = await import("../parser/hasher");
    const hashesMap = new Map<string, string>();
    for (const f of registry.files || []) {
      try {
        const fullPath = path.resolve(projectRoot, f.filePath);
        const fileHash = await hashFile(fullPath);
        hashesMap.set(f.filePath, fileHash);
      } catch {
        hashesMap.set(f.filePath, "");
      }
    }

    db.transaction(() => {
      // Clear out existing data to perform fresh overwrite indexing
      db.prepare(`DELETE FROM files`).run();
      db.prepare(`DELETE FROM symbols`).run();
      db.prepare(`DELETE FROM edges`).run();
      db.prepare(`DELETE FROM chunks`).run();

      const stmtFile = db.prepare(`
        INSERT INTO files (filePath, description, languages, scannedAt, hash)
        VALUES (?, ?, ?, ?, ?)
      `);

      const stmtChunk = db.prepare(`
        INSERT INTO chunks (id, filePath, startLine, endLine, summary, intentTags, content, struct_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const stmtSymbol = db.prepare(`
        INSERT INTO symbols (id, name, kind, filePath, startLine, endLine, isExported)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const stmtEdge = db.prepare(`
        INSERT INTO edges (id, source, target, type)
        VALUES (?, ?, ?, ?)
      `);

      // 1. Insert files
      for (const f of registry.files || []) {
        const fileHash = f.hash || hashesMap.get(f.filePath) || "";
        stmtFile.run(
          f.filePath,
          f.description || `Source file of type ${f.languages}`,
          f.languages || "PlainText",
          registry.scannedAt,
          fileHash
        );

        // Save exports as symbols
        if (f.exports) {
          for (const exp of f.exports) {
            const symId = `sym_exp_${f.filePath}_${exp}`;
            stmtSymbol.run(symId, exp, "export", f.filePath, 1, 1, 1);
          }
        }

        // Save imports as edges
        if (f.imports) {
          for (const imp of f.imports) {
            const edgeId = `edge_imp_${f.filePath}_${imp}`;
            stmtEdge.run(edgeId, f.filePath, imp, "imports");
          }
        }
      }

      // 2. Insert chunks
      for (const c of registry.chunks || []) {
        const orig = chunks.find(ch => ch.id === c.id);
        const codeContent = orig ? orig.content : "";
        const linesCount = codeContent.split("\n").length;
        const startLine = c.startLine || (orig ? orig.startLine : 1);
        const endLine = c.endLine || (orig ? orig.endLine : startLine + linesCount);

        const sHash = (c as any).struct_hash || computeStructHash(codeContent);
        stmtChunk.run(
          c.id,
          c.filePath,
          startLine,
          endLine,
          c.summary || "",
          JSON.stringify(c.intentTags || []),
          codeContent,
          sHash
        );
      }
    })();
  }

  /**
   * Load retrieves entire index state from SQL tables.
   */
  public async load(projectRoot: string): Promise<{ registry: IndexRegistry; chunks: FileChunk[] } | null> {
    try {
      const db = this.open(projectRoot);

      const files = db.prepare(`SELECT * FROM files`).all() as any[];
      if (files.length === 0) {
        return null;
      }

      const dbChunks = db.prepare(`SELECT * FROM chunks`).all() as any[];
      const dbSymbols = db.prepare(`SELECT * FROM symbols`).all() as any[];
      const dbEdges = db.prepare(`SELECT * FROM edges`).all() as any[];

      // Reconstruct files format
      const registryFiles = files.map(f => {
        const fileImports = dbEdges
          .filter(e => e.source === f.filePath && e.type === "imports")
          .map(e => e.target);

        const fileExports = dbSymbols
          .filter(s => s.filePath === f.filePath && s.kind === "export")
          .map(s => s.name);

        return {
          filePath: f.filePath,
          description: f.description,
          exports: fileExports,
          imports: fileImports,
          languages: f.languages,
        };
      });

      // Reconstruct chunks format
      const registryChunks = dbChunks.map(c => {
        let parsedTags: string[] = [];
        try {
          parsedTags = JSON.parse(c.intentTags);
        } catch {
          parsedTags = [];
        }

        return {
          id: c.id,
          filePath: c.filePath,
          startLine: c.startLine,
          endLine: c.endLine,
          summary: c.summary,
          intentTags: parsedTags,
        };
      });

      const registry: IndexRegistry = {
        scannedAt: files[0]?.scannedAt || new Date().toISOString(),
        projectRoot,
        totalFiles: files.length,
        files: registryFiles,
        chunks: registryChunks,
      };

      const rawChunks: FileChunk[] = dbChunks.map(c => ({
        id: c.id,
        filePath: c.filePath,
        startLine: c.startLine,
        endLine: c.endLine,
        content: c.content,
        length: c.content.length,
      }));

      return { registry, chunks: rawChunks };
    } catch {
      return null;
    }
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from "path";
import { scanCodebase, chunkFiles } from "../mappu-core";
import { IndexBuilder } from "./builder";
import { StorageManager } from "./storage";
import { hashFile } from "../parser/hasher";
import { GoogleGenAI, Type } from "@google/genai";

export class IncrementalReindexer {
  private builder = new IndexBuilder();
  private storage = new StorageManager();

  /**
   * Performance diff partial reindexing. If file has a modified stat or hash, trigger index refresh.
   */
  public async reindexModified(projectRoot: string, filePaths?: string[]): Promise<{
    added: string[];
    changed: string[];
    deleted: string[];
  }> {
    const db = this.storage.open(projectRoot);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // 1. Load all existing file paths and hashes from DB
    const dbRecords = db.prepare("SELECT filePath, hash FROM files").all() as { filePath: string; hash: string }[];
    const dbFilesMap = new Map<string, string>();
    for (const record of dbRecords) {
      dbFilesMap.set(record.filePath, record.hash);
    }

    // 2. Scan current files
    const scanned = await scanCodebase(projectRoot);
    const currentFilesMap = new Map<string, string>();
    for (const f of scanned) {
      currentFilesMap.set(f.filePath, f.content);
    }

    // 3. Compute and identify added, changed, deleted
    const added: string[] = [];
    const changed: string[] = [];
    const deleted: string[] = [];

    const computedHashes = new Map<string, string>();

    for (const file of scanned) {
      const fullPath = path.resolve(projectRoot, file.filePath);
      let fHash = "";
      try {
        fHash = await hashFile(fullPath);
      } catch {
        fHash = "";
      }
      computedHashes.set(file.filePath, fHash);

      const oldHash = dbFilesMap.get(file.filePath);
      if (oldHash === undefined) {
        added.push(file.filePath);
      } else if (oldHash !== fHash) {
        changed.push(file.filePath);
      }
    }

    for (const dbFilePath of dbFilesMap.keys()) {
      if (!currentFilesMap.has(dbFilePath)) {
        deleted.push(dbFilePath);
      }
    }

    // 4. For deleted and changed: run DELETE FROM files WHERE filePath = ? (cascade takes care of cascade deletion)
    db.transaction(() => {
      const stmtDel = db.prepare("DELETE FROM files WHERE filePath = ?");
      for (const filePath of deleted) {
        stmtDel.run(filePath);
      }
      for (const filePath of changed) {
        stmtDel.run(filePath);
      }
    })();

    // 5. Index added and changed files fresh!
    const filesToBuild = scanned.filter(f => added.includes(f.filePath) || changed.includes(f.filePath));

    if (filesToBuild.length > 0) {
      const rawChunks = chunkFiles(filesToBuild);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const fPrompt = `
        We are doing high-performance incremental indexing on a codebase in a SQLite-powered cartography engine.
        Below are the new or modified files needing semantic mapping.
        Files:
        ${filesToBuild.map(f => `- PATH: ${f.filePath} (${f.content.split("\n").length} lines)`).join("\n")}

        Analyze these files and map their key semantic structures: imports, exports, and language details.
        Also, summarize what behaviors or intents are contained in these code chunks.
        Chunks needing semantic summaries:
        ${rawChunks.map(c => `ID: ${c.id}, FILE: ${c.filePath}, LINES: ${c.startLine}-${c.endLine}\n PREVIEW: ${c.content.substring(0, 150)}...\n---`).join("\n")}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: fPrompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are the Mappu Repository Analysis builder. Create structured index outputs.",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              files: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    filePath: { type: Type.STRING },
                    description: { type: Type.STRING },
                    languages: { type: Type.STRING },
                    exports: { type: Type.ARRAY, items: { type: Type.STRING } },
                    imports: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["filePath", "description", "languages"]
                }
              },
              chunks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    filePath: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    intentTags: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["id", "filePath", "summary", "intentTags"]
                }
              }
            },
            required: ["files", "chunks"]
          }
        }
      });

      const parsedJson = JSON.parse(response.text || "{}");

      // 6. Use transactions for bulk insertion
      db.transaction(() => {
        const stmtFile = db.prepare(`
          INSERT INTO files (filePath, description, languages, scannedAt, hash)
          VALUES (?, ?, ?, ?, ?)
        `);

        const stmtChunk = db.prepare(`
          INSERT INTO chunks (id, filePath, startLine, endLine, summary, intentTags, content)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const stmtSymbol = db.prepare(`
          INSERT INTO symbols (id, name, kind, filePath, startLine, endLine, isExported)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const stmtEdge = db.prepare(`
          INSERT INTO edges (id, source, target, type)
          VALUES (?, ?, ?, ?)
        `);

        const scannedAt = new Date().toISOString();

        for (const f of parsedJson.files || []) {
          const fHash = computedHashes.get(f.filePath) || "";
          stmtFile.run(
            f.filePath,
            f.description || `Source file of type ${f.languages}`,
            f.languages || "PlainText",
            scannedAt,
            fHash
          );

          if (f.exports) {
            for (const exp of f.exports) {
              const symId = `sym_exp_${f.filePath}_${exp}`;
              stmtSymbol.run(symId, exp, "export", f.filePath, 1, 1, 1);
            }
          }

          if (f.imports) {
            for (const imp of f.imports) {
              const edgeId = `edge_imp_${f.filePath}_${imp}`;
              stmtEdge.run(edgeId, f.filePath, imp, "imports");
            }
          }
        }

        for (const c of parsedJson.chunks || []) {
          const orig = rawChunks.find(rc => rc.id === c.id);
          const codeContent = orig ? orig.content : "";
          const linesCount = codeContent.split("\n").length;
          const startLine = c.startLine || (orig ? orig.startLine : 1);
          const endLine = c.endLine || (orig ? orig.endLine : startLine + linesCount);

          stmtChunk.run(
            c.id,
            c.filePath,
            startLine,
            endLine,
            c.summary || "",
            JSON.stringify(c.intentTags || []),
            codeContent
          );
        }
      })();
    }

    return { added, changed, deleted };
  }
}

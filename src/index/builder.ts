/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { scanCodebase, chunkFiles } from "../mappu-core";
import { IndexRegistry } from "../mappu-core";
import { StorageManager } from "./storage";
import { ParserFactory } from "../parser";
import { CommunityDetector } from "../graph/community";
import { Tokenizer } from "./tokenizer";
import { BM25SearchEngine } from "./bm25";
import * as crypto from "crypto";
import * as path from "path";
import * as os from "os";

// Pristine typed lightweight implementation of pLimit
function pLimit(concurrency: number) {
  const queue: Array<() => Promise<any>> = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const fn = queue.shift()!;
      fn();
    }
  };

  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    activeCount++;
    try {
      return await fn();
    } finally {
      next();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const task = () => run(fn).then(resolve, reject);
      if (activeCount < concurrency) {
        task();
      } else {
        queue.push(task);
      }
    });
  };
}

// Absolute robust resolution of file-level imports references
function resolveImportPath(currentFile: string, importStr: string, allFiles: Set<string>): string | null {
  if (!importStr) return null;

  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"];
  const dir = path.dirname(currentFile);

  if (importStr.startsWith(".") || importStr.startsWith("/")) {
    for (const ext of extensions) {
      let candidate = path.join(dir, importStr + ext);
      candidate = path.normalize(candidate).replace(/\\/g, "/");
      if (candidate.startsWith("/")) candidate = candidate.substring(1);
      if (candidate.startsWith("./")) candidate = candidate.substring(2);
      
      if (allFiles.has(candidate)) {
        return candidate;
      }
    }
  }

  const ending = importStr.startsWith(".") ? importStr : "/" + importStr;
  const normalizedEnding = path.normalize(ending).replace(/\\/g, "/");
  
  for (const file of allFiles) {
    if (file.endsWith(normalizedEnding) || file === importStr) {
      return file;
    }
  }

  return null;
}

export class IndexBuilder {
  private storage = new StorageManager();

  public async build(projectRoot: string, onProgress?: (msg: string) => void): Promise<IndexRegistry> {
    const bm25Engine = new BM25SearchEngine(projectRoot);
    if (onProgress) onProgress("Scanning directories with offline high-speed parser...");
    const filesScanned = await scanCodebase(projectRoot);
    if (onProgress) onProgress(`Scanned ${filesScanned.length} files in workspace. Generating hashes...`);

    // 1. Compute in-memory SHA256 hashes of scanned workspace files
    const scannedFilesMap = new Map<string, { content: string; hash: string }>();
    for (const file of filesScanned) {
      const hash = crypto.createHash("sha256").update(file.content).digest("hex");
      scannedFilesMap.set(file.filePath, { content: file.content, hash });
    }

    // 2. Load existing files from SQLite DB for incremental check
    const db = this.storage.open(projectRoot);
    db.pragma("foreign_keys = ON");

    const dbRecords = db.prepare("SELECT filePath, hash FROM files").all() as { filePath: string; hash: string }[];
    const dbHashes = new Map<string, string>();
    for (const rec of dbRecords) {
      dbHashes.set(rec.filePath, rec.hash);
    }

    // Identify changed/deleted files
    const filesToDelete = Array.from(dbHashes.keys()).filter(file => !scannedFilesMap.has(file) || dbHashes.get(file) !== scannedFilesMap.get(file)?.hash);
    const filesToParse = filesScanned.filter(file => !dbHashes.has(file.filePath) || dbHashes.get(file.filePath) !== scannedFilesMap.get(file.filePath)?.hash);

    // 3. Clear old records for deleted/modified files inside a transaction (enforces foreign keys cascades delete)
    if (filesToDelete.length > 0) {
      if (onProgress) onProgress(`Clearing old index data for ${filesToDelete.length} stale/deleted files...`);
      db.transaction(() => {
        const stmtDel = db.prepare("DELETE FROM files WHERE filePath = ?");
        for (const f of filesToDelete) {
          stmtDel.run(f);
        }
      })();
    }

    // 4. Parse changed or new files with parallel tasks
    const concurrency = os.cpus().length || 4;
    if (onProgress && filesToParse.length > 0) {
      onProgress(`Parsing ${filesToParse.length} changed files with concurrency pool of ${concurrency}...`);
    }

    const limit = pLimit(concurrency);
    const parsedResults: Array<{
      filePath: string;
      content: string;
      hash: string;
      language: string;
      symbols: any[];
      imports: any[];
      calls: any[];
      chunks: any[];
    }> = [];

    const parseTasks = filesToParse.map(f => limit(async () => {
      const ext = path.extname(f.filePath).toLowerCase();
      const fileData = scannedFilesMap.get(f.filePath)!;
      const parser = ParserFactory.getParserByExtension(ext);
      
      let language = "PlainText";
      let symbols: any[] = [];
      let imports: any[] = [];
      let calls: any[] = [];

      if (parser) {
        try {
          const parsedResult = parser.parse(f.filePath, fileData.content);
          if (parsedResult) {
            language = parsedResult.language || language;
            symbols = parsedResult.symbols || [];
            imports = parsedResult.imports || [];
            calls = parsedResult.calls || [];
          }
        } catch (err) {
          console.error(`[IndexBuilder] Error parsing AST for ${f.filePath}:`, err);
        }
      } else {
        // High fidelity fallback heuristics formatting
        if (ext === ".ts" || ext === ".tsx") language = "TypeScript";
        else if (ext === ".js" || ext === ".jsx") language = "JavaScript";
        else if (ext === ".py") language = "Python";
        else if (ext === ".rs") language = "Rust";
        else if (ext === ".go") language = "Go";
        else if (ext === ".html") language = "HTML";
        else if (ext === ".css") language = "CSS";
        else if (ext === ".json") language = "JSON";
        else if (ext === ".md") language = "Markdown";

        if (["TypeScript", "JavaScript"].includes(language)) {
          const exportRegex = /export\s+(const|class|function|interface|type|async\s+function)\s+([a-zA-Z0-9_]+)/g;
          let match;
          while ((match = exportRegex.exec(fileData.content)) !== null) {
            if (match[2]) {
              const symName = match[2];
              symbols.push({
                id: `${f.filePath}#${symName}`,
                name: symName,
                kind: "export",
                filePath: f.filePath,
                startLine: 1,
                endLine: 1,
                isExported: 1
              });
            }
          }
          const importRegex = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
          while ((match = importRegex.exec(fileData.content)) !== null) {
            if (match[1]) imports.push({ source: match[1], importedSymbols: [] });
          }
        } else if (language === "Python") {
          const defRegex = /def\s+([a-zA-Z0-9_]+)\s*\(/g;
          let match;
          while ((match = defRegex.exec(fileData.content)) !== null) {
            if (match[1]) {
              const symName = match[1];
              symbols.push({
                id: `${f.filePath}#${symName}`,
                name: symName,
                kind: "function",
                filePath: f.filePath,
                startLine: 1,
                endLine: 1,
                isExported: 1
              });
            }
          }
          const importRegex = /(?:import\s+|from\s+)([a-zA-Z0-9_\.]+)/g;
          while ((match = importRegex.exec(fileData.content)) !== null) {
            if (match[1]) imports.push({ source: match[1], importedSymbols: [] });
          }
        }
      }

      // Chunk file contents natively with offline heuristic summary matching
      const rawChunks = chunkFiles([f]);
      const chunksWithHeuristics = rawChunks.map(c => {
        let summary = `Procedural code segment of ${c.filePath} containing operational steps.`;
        const intentTags = ["logic execution"];

        const chunkText = c.content || "";
        if (c.filePath === "server.ts") {
          if (chunkText.includes("app.get") || chunkText.includes("app.post")) {
            summary = "Exposes REST API routing pathways and server response controls.";
            intentTags.push("REST API endpoints", "router configs");
          } else if (chunkText.includes("start(")) {
            summary = "Node Express bootstrapper listening on designated port configuration.";
            intentTags.push("server boot", "Vite middleware configuration");
          }
        } else if (chunkText.includes("class ")) {
          summary = "Contains object-oriented class blueprints definition logical structures.";
          intentTags.push("class configuration", "types definition");
        } else if (chunkText.includes("async ")) {
          summary = "Contains asynchronous execution sequence algorithms.";
          intentTags.push("async operations", "promises block");
        } else if (chunkText.includes("import ") || chunkText.includes("require")) {
          summary = "Includes and resolves external or local package module configurations.";
          intentTags.push("imports resolution", "dependency management");
        } else if (chunkText.includes("export ")) {
          summary = "Defines and exports public application interfaces.";
          intentTags.push("module exports", "public APIs");
        } else if (chunkText.includes("db.") || chunkText.includes("sql") || chunkText.includes("INSERT ") || chunkText.includes("SELECT ")) {
          summary = "Executes relational query operations on database tables.";
          intentTags.push("database queries", "data persistence");
        } else if (chunkText.includes("test(") || chunkText.includes("describe(") || chunkText.includes("expect(")) {
          summary = "Automated verification test suites validation rules.";
          intentTags.push("unit testing", "assertion block");
        } else if (chunkText.includes("interface ") || chunkText.includes("type ") || chunkText.includes("enum ")) {
          summary = "Declares TypeScript static data schemas and contracts.";
          intentTags.push("type signatures", "type definitions");
        }

        return {
          id: c.id,
          filePath: c.filePath,
          startLine: c.startLine,
          endLine: c.endLine,
          summary,
          intentTags,
          content: chunkText
        };
      });

      parsedResults.push({
        filePath: f.filePath,
        content: fileData.content,
        hash: fileData.hash,
        language,
        symbols,
        imports,
        calls,
        chunks: chunksWithHeuristics
      });
    }));

    await Promise.all(parseTasks);

    // 5. Build call graph & import graph relationships
    const allWorkspaceFiles = new Set(filesScanned.map(f => f.filePath));
    const dbSymbols = db.prepare("SELECT name, id, filePath FROM symbols WHERE isExported = 1").all() as { name: string; id: string; filePath: string }[];
    const allExportsMap = new Map<string, Array<{ id: string; filePath: string }>>();

    // Load existing database symbols as candidates
    for (const sym of dbSymbols) {
      if (!allExportsMap.has(sym.name)) {
        allExportsMap.set(sym.name, []);
      }
      allExportsMap.get(sym.name)!.push({ id: sym.id, filePath: sym.filePath });
    }

    // Merge in-memory newly parsed candidate exports
    for (const parsed of parsedResults) {
      const filePath = parsed.filePath;
      for (const sym of parsed.symbols) {
        if (sym.isExported) {
          const symId = sym.id || `${filePath}#${sym.name}`;
          if (!allExportsMap.has(sym.name)) {
            allExportsMap.set(sym.name, []);
          }
          const list = allExportsMap.get(sym.name)!;
          const filtered = list.filter(item => item.filePath !== filePath);
          filtered.push({ id: symId, filePath });
          allExportsMap.set(sym.name, filtered);
        }
      }
    }

    // Map targets for imports and calls
    const resolvedImportsList: Array<{ id: string; source: string; target: string }> = [];
    const resolvedCallsList: Array<{ id: string; source: string; target: string }> = [];

    for (const parsed of parsedResults) {
      const filePath = parsed.filePath;

      // Imports target resolution
      for (const imp of parsed.imports) {
        const resolvedTarget = resolveImportPath(filePath, imp.source, allWorkspaceFiles);
        if (resolvedTarget) {
          resolvedImportsList.push({
            id: `edge_imp_${filePath}_${resolvedTarget}`,
            source: filePath,
            target: resolvedTarget
          });
        } else {
          resolvedImportsList.push({
            id: `edge_imp_${filePath}_${imp.source}`,
            source: filePath,
            target: imp.source
          });
        }
      }

      // Calls target resolution
      for (const call of parsed.calls) {
        let callerId = filePath;
        const line = call.line;
        for (const sym of parsed.symbols) {
          if (sym.startLine <= line && line <= sym.endLine) {
            callerId = sym.id || `${filePath}#${sym.name}`;
            break;
          }
        }

        const cleanedCallee = call.callee.split(".").pop() || call.callee;
        const candidates = allExportsMap.get(cleanedCallee) || [];
        
        let targetId = cleanedCallee;
        if (candidates.length > 0) {
          const localCandidate = candidates.find(item => item.filePath === filePath);
          if (localCandidate) {
            targetId = localCandidate.id;
          } else {
            const importedCaps = parsed.imports.map(i => resolveImportPath(filePath, i.source, allWorkspaceFiles));
            const importedMatch = candidates.find(item => importedCaps.includes(item.filePath));
            if (importedMatch) {
              targetId = importedMatch.id;
            } else {
              targetId = candidates[0].id;
            }
          }
        }

        resolvedCallsList.push({
          id: `edge_call_${callerId}_${targetId}_${line}`,
          source: callerId,
          target: targetId
        });
      }
    }

    // 6. Bulk Insert symbols/imports/calls/chunks to DB inside one single Transaction
    if (parsedResults.length > 0) {
      if (onProgress) onProgress(`Writing ${parsedResults.length} parsed records to SQLite DB under one massive transaction...`);
      
      db.transaction(() => {
        const stmtFile = db.prepare(`
          INSERT INTO files (filePath, description, languages, scannedAt, hash)
          VALUES (?, ?, ?, ?, ?)
        `);

        const stmtSymbol = db.prepare(`
          INSERT INTO symbols (id, name, kind, filePath, startLine, endLine, isExported)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const stmtEdge = db.prepare(`
          INSERT INTO edges (id, source, target, type)
          VALUES (?, ?, ?, ?)
        `);

        const stmtChunk = db.prepare(`
          INSERT INTO chunks (id, filePath, startLine, endLine, summary, intentTags, content)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const scannedAt = new Date().toISOString();

        for (const parsed of parsedResults) {
          const filePath = parsed.filePath;

          let description = `Local source code module file of language ${parsed.language}.`;
          if (filePath === "server.ts") {
            description = "Core Application entry and REST API backend server router.";
          } else if (filePath.includes("engines/")) {
            description = "Mappu static analysis code metrics processing engine module.";
          } else if (filePath.includes("cli/")) {
            description = "Command-Line Interface utility parser and interactive execution wrappers.";
          } else if (filePath === "package.json") {
            description = "Ecosystem package dependencies, assets scripts, metadata configs.";
          }

          stmtFile.run(filePath, description, parsed.language, scannedAt, parsed.hash);

          // Insert Symbols
          for (const sym of parsed.symbols) {
            const symId = sym.id || `${filePath}#${sym.name}`;
            stmtSymbol.run(
              symId,
              sym.name,
              sym.kind || "export",
              filePath,
              sym.startLine || 1,
              sym.endLine || 1,
              sym.isExported ? 1 : 0
            );
          }

          // Insert Chunks
          for (const chunk of parsed.chunks) {
            stmtChunk.run(
              chunk.id,
              filePath,
              chunk.startLine,
              chunk.endLine,
              chunk.summary,
              JSON.stringify(chunk.intentTags),
              chunk.content
            );
          }

          // Compute & Insert BM25 terms for file and its chunks
          bm25Engine.buildIndex(parsed.chunks, db);
        }

        // Insert imports edges
        const filteredImports = resolvedImportsList.filter(item => parsedResults.some(pr => pr.filePath === item.source));
        for (const imp of filteredImports) {
          stmtEdge.run(imp.id, imp.source, imp.target, "imports");
        }

        // Insert calls edges
        const filteredCalls = resolvedCallsList.filter(item => parsedResults.some(pr => pr.filePath.split("#")[0] === item.source.split("#")[0]));
        for (const call of filteredCalls) {
          stmtEdge.run(call.id, call.source, call.target, "calls");
        }
      })();
    }

    // 7. Run community detection over fully updated import graph in database
    if (onProgress) onProgress("Running offline graph communities partition detection...");
    try {
      const detector = new CommunityDetector(projectRoot);
      detector.runDetection();
    } catch (err: any) {
      console.error("[IndexBuilder] Community detection Louvain run failing:", err);
    }

    // 8. Reconstruct latest complete IndexRegistry from Database and return it
    const registryResult = await this.storage.load(projectRoot);
    if (!registryResult) {
      throw new Error("Failed to load freshly constructed SQLite index registry.");
    }

    if (onProgress) onProgress("Pristine Index constructed and persisted in storage successfully!");
    return registryResult.registry;
  }
}


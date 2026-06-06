/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStoredIndex } from "../mappu-core";
import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

export class DeadCodeEngine {
  /**
   * Performs advanced control flow reachability analysis in the call-graph and imports graph.
   * Leverages entry-point files, decorators detection, and BFS propagation to label dead modules,
   * dead functions, and dead exports.
   */
  public analyzeReachability(projectRoot: string): { filePath: string; isReachable: boolean; referencesCount: number }[] {
    const dbPath = path.join(projectRoot, ".mappu", "mappu.db");
    if (!fs.existsSync(dbPath)) {
      const emptyResults = [] as any;
      emptyResults.deadFiles = [];
      emptyResults.deadFunctions = [];
      emptyResults.deadExports = [];
      return emptyResults;
    }

    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");

    // Load files, symbols, and edges
    const files = db.prepare("SELECT filePath FROM files").all() as { filePath: string }[];
    const symbols = db.prepare("SELECT id, name, kind, filePath, isExported, startLine, endLine FROM symbols").all() as any[];
    const edges = db.prepare("SELECT source, target, type FROM edges").all() as any[];
    const dbImports = db.prepare("SELECT filePath, target, imported_names FROM imports").all() as any[];

    db.close();

    // Setup file line loader helper for decorator discovery
    const fileCache = new Map<string, string[]>();
    const getFileLines = (fp: string): string[] => {
      if (fileCache.has(fp)) {
        return fileCache.get(fp)!;
      }
      try {
        const full = path.resolve(projectRoot, fp);
        if (fs.existsSync(full)) {
          const content = fs.readFileSync(full, "utf-8");
          const lines = content.split("\n");
          fileCache.set(fp, lines);
          return lines;
        }
      } catch {
        // Safe context fallback
      }
      fileCache.set(fp, []);
      return [];
    };

    // Decorator detector helper
    const isDecoratedWithRoute = (sym: any): boolean => {
      const lines = getFileLines(sym.filePath);
      if (!lines || lines.length === 0) return false;
      const startIdx = Math.max(0, sym.startLine - 4);
      const endIdx = Math.min(lines.length - 1, sym.startLine - 1);
      for (let i = startIdx; i <= endIdx; i++) {
        const line = (lines[i] || "").trim();
        if (line.match(/@\w*(route|get|post|put|delete|patch|controller)/i)) {
          return true;
        }
      }
      return false;
    };

    // Entry point detector helper
    const isEntryPointFile = (filePath: string): boolean => {
      const clean = filePath.toLowerCase();
      if (clean.endsWith("server.ts") || clean.endsWith("server.js") || clean.endsWith("server.tsx")) return true;
      if (clean.endsWith("cli.ts") || clean.includes("/cli/") || clean.startsWith("src/cli")) return true;
      if (clean.endsWith("main.ts") || clean.endsWith("main.tsx") || clean.endsWith("index.ts") || clean.endsWith("index.tsx") || clean.endsWith("app.tsx") || clean.endsWith("app.ts")) return true;
      if (clean.endsWith("index.html")) return true;
      if (clean.includes("test") || clean.includes("spec") || clean.includes("__tests__") || clean.includes("tests")) return true;
      return false;
    };

    // Build incoming relationship counts for files
    const refCounts: Record<string, number> = {};
    files.forEach(f => {
      refCounts[f.filePath] = 0;
    });
    edges.forEach((edge: any) => {
      if (edge.type === "imports") {
        refCounts[edge.target] = (refCounts[edge.target] || 0) + 1;
      }
    });

    // Build standard relationship maps
    const importsFrom = new Map<string, string[]>();
    const callsFrom = new Map<string, string[]>();

    edges.forEach((edge: any) => {
      if (edge.type === "imports") {
        const list = importsFrom.get(edge.source) || [];
        list.push(edge.target);
        importsFrom.set(edge.source, list);
      } else if (edge.type === "calls") {
        const list = callsFrom.get(edge.source) || [];
        list.push(edge.target);
        callsFrom.set(edge.source, list);
      }
    });

    // DFS/BFS Traversal Initial Setup
    const reachableFiles = new Set<string>();
    const reachableSymbols = new Set<string>();
    const queue: string[] = [];

    // Initialize queue with entry files and entry symbols
    files.forEach(f => {
      if (isEntryPointFile(f.filePath)) {
        queue.push(f.filePath);
      }
    });

    symbols.forEach(sym => {
      const isEntry = isEntryPointFile(sym.filePath);
      const isRouteDecorated = isDecoratedWithRoute(sym);
      if (isEntry || isRouteDecorated) {
        queue.push(sym.id);
      }
    });

    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      if (current.includes("#") || current.startsWith("sym_")) {
        // It's a symbol node (function-level / export-level)
        reachableSymbols.add(current);

        // A reachable symbol implies its declaring file container is reachable
        const sym = symbols.find(s => s.id === current);
        if (sym) {
          queue.push(sym.filePath);
        }

        // Add any called targets to the queue
        const callees = callsFrom.get(current) || [];
        callees.forEach(callee => {
          queue.push(callee);
        });
      } else {
        // It's a file path node
        reachableFiles.add(current);

        // Add any imported files to the queue
        const imports = importsFrom.get(current) || [];
        imports.forEach(imp => {
          queue.push(imp);

          // Find imported names to push specific symbol nodes as reachable roots
          const importDefs = dbImports.filter(d => d.filePath === current && d.target === imp);
          importDefs.forEach(def => {
            try {
              const names = JSON.parse(def.imported_names) as string[];
              names.forEach(name => {
                if (name === "*") {
                  // Namespace imports make all exports in target reachable
                  const targetExports = symbols.filter(s => s.filePath === imp && s.isExported === 1);
                  targetExports.forEach(te => queue.push(te.id));
                } else {
                  // Target specifier
                  const foundSym = symbols.find(s => s.filePath === imp && s.name === name);
                  if (foundSym) {
                    queue.push(foundSym.id);
                  } else {
                    queue.push(`${imp}#${name}`);
                  }
                }
              });
            } catch {
              // Graceful JSON fallback
            }
          });
        });

        // Add any direct file-scope call targets to the queue
        const fileCallees = callsFrom.get(current) || [];
        fileCallees.forEach(callee => {
          queue.push(callee);
        });
      }
    }

    // Classify dead segments
    const deadFiles: { filePath: string; referencesCount: number }[] = [];
    const deadFunctions: { name: string; kind: string; filePath: string; startLine: number; endLine: number }[] = [];
    const deadExports: { name: string; kind: string; filePath: string; startLine: number; endLine: number }[] = [];

    files.forEach(f => {
      if (!reachableFiles.has(f.filePath)) {
        deadFiles.push({
          filePath: f.filePath,
          referencesCount: refCounts[f.filePath] || 0
        });
      }
    });

    symbols.forEach(sym => {
      const nameLower = (sym.name || "").toLowerCase();
      if (nameLower === "default" || nameLower === "main") {
        return;
      }

      // We only diagnose reachable files for symbol-level deadness to avoid spamming 
      // symbol lists when the whole file itself is dead.
      if (reachableFiles.has(sym.filePath)) {
        if (!reachableSymbols.has(sym.id)) {
          const item = {
            name: sym.name,
            kind: sym.kind,
            filePath: sym.filePath,
            startLine: sym.startLine,
            endLine: sym.endLine
          };

          if (sym.isExported === 1) {
            deadExports.push(item);
          } else {
            // Internal function / method that is unreachable
            const isFunctionLike = ["function", "method", "fn", "async-function", "arrow", "class"].includes((sym.kind || "").toLowerCase());
            if (isFunctionLike) {
              deadFunctions.push(item);
            }
          }
        }
      }
    });

    // Format final files list status for compatible list visualization
    const results = files.map(f => ({
      filePath: f.filePath,
      isReachable: reachableFiles.has(f.filePath),
      referencesCount: refCounts[f.filePath] || 0
    })) as any;

    results.deadFiles = deadFiles;
    results.deadFunctions = deadFunctions;
    results.deadExports = deadExports;

    return results;
  }
}


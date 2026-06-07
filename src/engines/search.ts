/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStoredIndex, SearchResult } from "../mappu-core";
import { getLLMAdapter } from "../adapters/llm/factory";
import BM25 from "okapibm25";
import * as path from "path";
import * as fs from "fs";
import { StorageManager } from "../index/storage";
import { Tokenizer } from "../index/tokenizer";
import { ts, js, tsx, jsx, html, css } from "@ast-grep/napi";

function getParserForFile(filePath: string) {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts": return ts;
    case "tsx": return tsx;
    case "js": return js;
    case "jsx": return jsx;
    case "html": return html;
    case "css": return css;
    default: return null;
  }
}

export class SearchEngine {
  private tokenizer = new Tokenizer();

  /**
   * Performs BM25 relevance scoring and AST regex pattern mapping over local index chunks.
   */
  public async search(projectRoot: string, query: string, options: any = {}): Promise<SearchResult[]> {
    const indexWrap = getStoredIndex(projectRoot);
    if (!indexWrap) {
      throw new Error("No Mappu index found. Run 'mappu init' first.");
    }

    const storage = new StorageManager();
    let db: any;
    let registry = indexWrap.registry;
    let rawChunks = indexWrap.chunks;

    try {
      db = storage.open(projectRoot);
      const loaded = await storage.load(projectRoot);
      if (loaded) {
        registry = loaded.registry;
        rawChunks = loaded.chunks;
      }
    } catch {
      // Ignore database loading error and fall back to cache
    }

    // Parse qualifiers from query (e.g. symbol:function, path:src/ etc.)
    const { cleanQuery, qualifiers } = this.parseQualifiers(query);

    let matchedChunks: any[] = [];
    const keywords = this.tokenize(cleanQuery);

    if (db && keywords.length > 0) {
      try {
        const placeholders = keywords.map(() => "?").join(",");
        const rows = db.prepare(`
          SELECT DISTINCT filePath FROM bm25_terms WHERE term IN (${placeholders})
        `).all(...keywords) as { filePath: string }[];

        if (rows.length > 0) {
          const filePaths = rows.map(r => r.filePath);
          const chunkPlaceholders = filePaths.map(() => "?").join(",");
          matchedChunks = db.prepare(`
            SELECT * FROM chunks WHERE filePath IN (${chunkPlaceholders})
          `).all(...filePaths) as any[];
        }
      } catch (err) {
        matchedChunks = rawChunks;
      }
    } else {
      if (db) {
        try {
          matchedChunks = db.prepare(`SELECT * FROM chunks`).all() as any[];
        } catch {
          matchedChunks = rawChunks;
        }
      } else {
        matchedChunks = rawChunks;
      }
    }

    // If still empty because of keywords having zero hits in index, fallback to complete raw list
    if (matchedChunks.length === 0) {
      matchedChunks = rawChunks;
    }

    // Filter by pattern if specified or --pattern is passed
    const pattern = options.pattern || qualifiers.pattern;
    if (pattern) {
      matchedChunks = this.runPatternMatch(projectRoot, matchedChunks, pattern);
    }

    // Filter by qualifiers
    matchedChunks = this.applyQualifiers(matchedChunks, registry, qualifiers, options);

    // Compute BM25 scores
    let results = this.rankBM25(matchedChunks, cleanQuery);

    // Map to symbols for professional symbol-level view
    let finalResults = this.mapToSymbols(results, db, projectRoot);

    // Sort by score descending and limit before AI enrichment
    finalResults = finalResults.sort((a, b) => b.score - a.score);

    // If AI mode requested, enrich the top results via multimodel flow
    if (options.ai && finalResults.length > 0) {
      try {
        finalResults = await this.enrichWithAI(finalResults.slice(0, 5), cleanQuery);
      } catch {
        // Fall back gracefully if AI fails or rate limits
      }
    }

    const limit = options.limit || 10;
    return finalResults.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Splits query from key:value qualifiers
   */
  private parseQualifiers(query: string): { cleanQuery: string; qualifiers: Record<string, string> } {
    const qualifiers: Record<string, string> = {};
    const parts = query.split(/\s+/);
    const queryParts: string[] = [];

    parts.forEach(part => {
      if (part.includes(":")) {
        const [key, val] = part.split(":");
        if (key && val) {
          qualifiers[key.toLowerCase()] = val;
        }
      } else {
        queryParts.push(part);
      }
    });

    return {
      cleanQuery: queryParts.join(" "),
      qualifiers
    };
  }

  /**
   * AST-based structural search via @ast-grep/napi falling back to regex token matching
   */
  private runPatternMatch(projectRoot: string, chunks: any[], pattern: string): any[] {
    const filePaths = Array.from(new Set(chunks.map(c => c.filePath)));
    const matchedNodes: any[] = [];

    for (const filePath of filePaths) {
      try {
        const parser = getParserForFile(filePath);
        if (!parser) {
          const fileChunks = chunks.filter(c => c.filePath === filePath);
          const regexMatches = this.runRegexPatternMatch(fileChunks, pattern);
          matchedNodes.push(...regexMatches);
          continue;
        }

        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
        if (!fs.existsSync(fullPath)) continue;
        const fileContent = fs.readFileSync(fullPath, "utf8");

        const root = parser.parse(fileContent);
        const matches = root.root().findAll(pattern);
        if (matches && matches.length > 0) {
          for (const m of matches) {
            const range = m.range();
            const startLine = range.start.line + 1;
            const endLine = range.end.line + 1;
            matchedNodes.push({
              id: `ast_${filePath}_${range.start.index}`,
              filePath,
              startLine,
              endLine,
              summary: `AST Pattern Match: ${pattern}`,
              intentTags: "[]",
              content: m.text()
            });
          }
        }
      } catch (e) {
        const fileChunks = chunks.filter(c => c.filePath === filePath);
        const regexMatches = this.runRegexPatternMatch(fileChunks, pattern);
        matchedNodes.push(...regexMatches);
      }
    }

    return matchedNodes;
  }

  /**
   * Translates legacy structural qualifiers into robust regexes
   */
  private runRegexPatternMatch(chunks: any[], pattern: string): any[] {
    let escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, (match) => {
      if (match === "$") return "$";
      return "\\" + match;
    });

    escaped = escaped.replace(/\$[A-Z_]+/g, "([^\\s(),]+)");
    escaped = escaped.replace(/\$\.\.\./g, "(.*?)");
    escaped = escaped.replace(/\$_\s*/g, "([^}]*)");

    try {
      const regex = new RegExp(escaped, "s");
      return chunks.filter(c => regex.test(c.content || c.content));
    } catch {
      const cleanPattern = pattern.replace(/\$[A-Z_]+/g, "").replace(/\$\.\.\./g, "").trim();
      return chunks.filter(c => (c.content || "").includes(cleanPattern));
    }
  }

  /**
   * Apply qualifiers filtering (file, symbol type, language, complexity levels etc.)
   */
  private applyQualifiers(chunks: any[], registry: any, qualifiers: Record<string, string>, options: any): any[] {
    let filtered = chunks;

    const fileConstraint = options.file || qualifiers.path || qualifiers.file;
    if (fileConstraint) {
      const matchPath = fileConstraint.toLowerCase();
      filtered = filtered.filter(c => c.filePath.toLowerCase().includes(matchPath));
    }

    const typeConstraint = options.type || qualifiers.symbol || qualifiers.type;
    if (typeConstraint) {
      const targetType = typeConstraint.toLowerCase();
      filtered = filtered.filter(c => {
        const fileInfo = registry.files ? registry.files.find((f: any) => f.filePath === c.filePath) : null;
        const content = c.content || "";
        if (targetType === "fn" || targetType === "function" || targetType === "method") {
          return content.includes("function") || content.includes("=>") || content.includes("def ") || content.includes("async");
        }
        if (targetType === "class") {
          return content.includes("class ");
        }
        if (targetType === "interface" || targetType === "type") {
          return content.includes("interface ") || content.includes("type ");
        }
        return true;
      });
    }

    const langConstraint = options.lang || qualifiers.language || qualifiers.lang;
    if (langConstraint) {
      const targetLangs = langConstraint.toLowerCase().split(",");
      filtered = filtered.filter(c => {
        const ext = c.filePath.split(".").pop()?.toLowerCase();
        if (!ext) return false;
        const mappedLang = ext === "ts" || ext === "tsx" ? "ts" : ext === "js" || ext === "jsx" ? "js" : ext;
        return targetLangs.some((l: string) => mappedLang.includes(l) || l.includes(mappedLang));
      });
    }

    if (options.exported || qualifiers.is === "exported") {
      filtered = filtered.filter(c => (c.content || "").includes("export "));
    }

    if (options.async || qualifiers.is === "async") {
      filtered = filtered.filter(c => (c.content || "").includes("async "));
    }

    return filtered;
  }

  /**
   * Pure offline Okapi BM25 ranking algorithm
   */
  private rankBM25(chunks: any[], query: string): SearchResult[] {
    if (!query || query.trim().length === 0) {
      return chunks.map(c => ({
        filePath: c.filePath,
        startLine: c.startLine,
        endLine: c.endLine,
        snippet: c.content || "",
        score: 1.0,
        matchRationale: "Unscored default structural coverage match."
      }));
    }

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return chunks.map(c => ({
        filePath: c.filePath,
        startLine: c.startLine,
        endLine: c.endLine,
        snippet: c.content || "",
        score: 1.0,
        matchRationale: "Unscored default structural coverage match."
      }));
    }

    const documents = chunks.map(c => c.content || "");
    const scores = BM25(documents, queryTokens) as number[];
    const results: SearchResult[] = [];

    chunks.forEach((chunk, docIdx) => {
      let score = scores[docIdx] || 0;
      const content = chunk.content || "";

      if (content.toLowerCase().includes(query.toLowerCase())) {
        score += 3.0;
      }

      results.push({
        filePath: chunk.filePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        snippet: content,
        score: Math.min(10.0, Math.max(0.1, score)),
        matchRationale: `BM25 textual similarity index matches semantic terms [${queryTokens.slice(0, 3).join(", ")}].`
      });
    });

    return results
      .filter(r => r.score > 0.05)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Translates chunk level search results to symbol level search results.
   */
  private mapToSymbols(results: SearchResult[], db: any, projectRoot: string): SearchResult[] {
    if (!db) return results;

    const mappedResults: SearchResult[] = [];

    for (const res of results) {
      try {
        const symbols = db.prepare(`
          SELECT * FROM symbols 
          WHERE filePath = ? 
            AND startLine <= ? 
            AND endLine >= ?
        `).all(res.filePath, res.endLine, res.startLine) as any[];

        if (symbols && symbols.length > 0) {
          let bestSymbol = symbols[0];
          
          for (const sym of symbols) {
            const kind = sym.kind || "";
            if (kind === "function" || kind === "method" || kind === "class" || kind === "export") {
              bestSymbol = sym;
            }
          }

          const symbolFilePath = bestSymbol.filePath;
          const startLine = bestSymbol.startLine;
          const endLine = bestSymbol.endLine;

          let snippet = res.snippet;
          try {
            const fullPath = path.isAbsolute(symbolFilePath) ? symbolFilePath : path.join(projectRoot, symbolFilePath);
            if (fs.existsSync(fullPath)) {
              const fileContent = fs.readFileSync(fullPath, "utf8");
              const lines = fileContent.split("\n");
              const slicedLines = lines.slice(Math.max(0, startLine - 1), endLine);
              if (slicedLines.length > 0) {
                snippet = slicedLines.join("\n");
              }
            }
          } catch {
            // Graceful fallback
          }

          mappedResults.push({
            filePath: symbolFilePath,
            startLine,
            endLine,
            snippet,
            score: res.score,
            matchRationale: `Symbol match [${bestSymbol.name}] (${bestSymbol.kind}). ${res.matchRationale || ""}`
          });
        } else {
          mappedResults.push(res);
        }
      } catch (err) {
        mappedResults.push(res);
      }
    }

    return mappedResults;
  }

  /**
   * Tokenize with Tokenizer matching src/index/tokenizer.ts
   */
  private tokenize(text: string): string[] {
    return this.tokenizer.tokenize(text);
  }

  /**
   * AI enrichment overlay wrapper
   */
  private async enrichWithAI(results: SearchResult[], query: string): Promise<SearchResult[]> {
    const adapter = getLLMAdapter();
    const prompt = `
      Given the developer intent query: "${query}"
      Review these top matching code boundaries and enrich their 'matchRationale' with high-level architectural explanations.
      Matches:
      ${results.map((r, i) => `[ID: ${i}] File: ${r.filePath} (Lines ${r.startLine}-${r.endLine})\nSnippet:\n${r.snippet.substring(0, 200)}...\n`).join("\n")}
    `;

    const response = await adapter.generate(prompt, "You are the Mappu Search Enhancer. Enrich matching files search results with professional explanations.", {
      responseMimeType: "application/json",
      responseSchema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer" },
            matchRationale: { type: "string" },
            score: { type: "integer" }
          },
          required: ["index", "matchRationale", "score"]
        }
      }
    });

    const enrichments: any[] = JSON.parse(response || "[]");
    enrichments.forEach(e => {
      const target = results[e.index];
      if (target) {
        target.matchRationale = e.matchRationale;
        target.score = e.score;
      }
    });

    return results;
  }
}

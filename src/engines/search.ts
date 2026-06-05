/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { getStoredIndex, SearchResult } from "../mappu-core";

export class SearchEngine {
  /**
   * Performs BM25 relevance scoring and AST regex pattern mapping over local index chunks.
   */
  public async search(projectRoot: string, query: string, options: any = {}): Promise<SearchResult[]> {
    const indexWrap = getStoredIndex(projectRoot);
    if (!indexWrap) {
      throw new Error("No Mappu index found. Run 'mappu init' first.");
    }

    const { registry, chunks: rawChunks } = indexWrap;

    // Parse qualifiers from query (e.g. symbol:function, path:src/ etc.)
    const { cleanQuery, qualifiers } = this.parseQualifiers(query);

    let matchedChunks = rawChunks;

    // Filter by pattern if specified or --pattern is passed
    const pattern = options.pattern || qualifiers.pattern;
    if (pattern) {
      matchedChunks = this.runPatternMatch(rawChunks, pattern);
    }

    // Filter by qualifiers
    matchedChunks = this.applyQualifiers(matchedChunks, registry, qualifiers, options);

    // Compute BM25 scores
    let results = this.rankBM25(matchedChunks, cleanQuery);

    // If AI is configured and requested via options, enrich the top 3 results using Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (options.ai && apiKey && results.length > 0) {
      try {
        results = await this.enrichWithAI(results.slice(0, 5), cleanQuery, apiKey);
      } catch {
        // Fall back gracefully if AI fails or rate limits
      }
    }

    // Sort by score descending and apply limit
    const limit = options.limit || 10;
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
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
   * Structural matching fallback using robust string/regex token mapping
   */
  private runPatternMatch(chunks: any[], pattern: string): any[] {
    // Escape standard regex characters except variables starting with $
    let escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, (match) => {
      if (match === "$") return "$";
      return "\\" + match;
    });

    // Translate structural qualifiers like $NAME, $ANY, $CODE, $... into regex groups
    escaped = escaped.replace(/\$[A-Z_]+/g, "([^\\s(),]+)");
    escaped = escaped.replace(/\$\.\.\./g, "(.*?)");
    escaped = escaped.replace(/\$_\s*/g, "([^}]*)");

    try {
      const regex = new RegExp(escaped, "s");
      return chunks.filter(c => regex.test(c.content));
    } catch {
      // Graceful substring fallthrough if regex compile fails
      const cleanPattern = pattern.replace(/\$[A-Z_]+/g, "").replace(/\$\.\.\./g, "").trim();
      return chunks.filter(c => c.content.includes(cleanPattern));
    }
  }

  /**
   * Apply qualifiers filtering (file, symbol type, language, complexity levels etc.)
   */
  private applyQualifiers(chunks: any[], registry: any, qualifiers: Record<string, string>, options: any): any[] {
    let filtered = chunks;

    // Filter by File path Glob (or substring)
    const fileConstraint = options.file || qualifiers.path || qualifiers.file;
    if (fileConstraint) {
      const matchPath = fileConstraint.toLowerCase();
      filtered = filtered.filter(c => c.filePath.toLowerCase().includes(matchPath));
    }

    // Filter by type constraint
    const typeConstraint = options.type || qualifiers.symbol || qualifiers.type;
    if (typeConstraint) {
      const targetType = typeConstraint.toLowerCase();
      // Look up symbols matching kind inside registry
      filtered = filtered.filter(c => {
        const fileInfo = registry.files.find((f: any) => f.filePath === c.filePath);
        if (!fileInfo) return true;
        
        // Match standard function declaration style or keyword hints matching standard type boundaries
        if (targetType === "fn" || targetType === "function" || targetType === "method") {
          return c.content.includes("function") || c.content.includes("=>") || c.content.includes("def ") || c.content.includes("async");
        }
        if (targetType === "class") {
          return c.content.includes("class ");
        }
        if (targetType === "interface" || targetType === "type") {
          return c.content.includes("interface ") || c.content.includes("type ");
        }
        return true;
      });
    }

    // Filter by Language
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

    // Export rule filter
    if (options.exported || qualifiers.is === "exported") {
      filtered = filtered.filter(c => c.content.includes("export "));
    }

    // Async rule filter
    if (options.async || qualifiers.is === "async") {
      filtered = filtered.filter(c => c.content.includes("async "));
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
        snippet: c.content,
        score: 1.0,
        matchRationale: "Unscored default structural coverage match."
      }));
    }

    // Step 1: Token Pipeline
    const queryTokens = this.tokenize(query);
    const documentTokens = chunks.map(c => this.tokenize(c.content));

    // Step 2: Calculate average document length
    const totalLength = documentTokens.reduce((acc, doc) => acc + doc.length, 0);
    const avgdl = totalLength / (chunks.length || 1);

    // Step 3: Calculate document frequency (DF) for each query token
    const df: Record<string, number> = {};
    queryTokens.forEach(token => {
      df[token] = 0;
      documentTokens.forEach(doc => {
        if (doc.includes(token)) {
          df[token]++;
        }
      });
    });

    const k1 = 1.2;
    const b = 0.75;
    const results: SearchResult[] = [];

    chunks.forEach((chunk, docIdx) => {
      const doc = documentTokens[docIdx];
      const docLen = doc.length;
      let score = 0;

      queryTokens.forEach(token => {
        const tf = doc.filter(t => t === token).length;
        if (tf > 0) {
          // Compute Inverse Document Frequency (IDF) with safe flooring
          const idf = Math.log(1 + (chunks.length - df[token] + 0.5) / (df[token] + 0.5));
          // Compute BM25 formula score
          const termScore = idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgdl)));
          score += termScore;
        }
      });

      // If text contains query literally, award big score boost
      if (chunk.content.toLowerCase().includes(query.toLowerCase())) {
        score += 3.0;
      }

      results.push({
        filePath: chunk.filePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        snippet: chunk.content,
        score: Math.min(10.0, Math.max(0.1, score)),
        matchRationale: `BM25 textual similarity index matches semantic terms [${queryTokens.slice(0, 3).join(", ")}].`
      });
    });

    // Remove zero scores and sort
    return results
      .filter(r => r.score > 0.05)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Splits camelCase, snake_case, tokenized lowercase representations
   */
  private tokenize(text: string): string[] {
    const rawTerms = text.toLowerCase().split(/[^a-zA-Z0-9_\$]/).filter(Boolean);
    const tokens: string[] = [];

    rawTerms.forEach(term => {
      tokens.push(term);
      // Split camelCase
      const camelSplits = term.split(/(?=[A-Z])/).map(t => t.toLowerCase());
      if (camelSplits.length > 1) {
        tokens.push(...camelSplits);
      }
      // Split snake_case / kebab-case
      const snakeSplits = term.split(/[-_]/);
      if (snakeSplits.length > 1) {
        tokens.push(...snakeSplits);
      }
    });

    return Array.from(new Set(tokens));
  }

  /**
   * Gemini enhancement overlay wrapper
   */
  private async enrichWithAI(results: SearchResult[], query: string, apiKey: string): Promise<SearchResult[]> {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Given the developer intent query: "${query}"
      Review these top matching code boundaries and enrich their 'matchRationale' with high-level architectural explanations.
      Matches:
      ${results.map((r, i) => `[ID: ${i}] File: ${r.filePath} (Lines ${r.startLine}-${r.endLine})\nSnippet:\n${r.snippet.substring(0, 200)}...\n`).join("\n")}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are the Mappu Search Enhancer. Enrich matching files search results with professional explanations.",
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
      }
    });

    const enrichments: any[] = JSON.parse(response.text || "[]");
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

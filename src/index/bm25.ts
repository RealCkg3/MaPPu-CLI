import BM25, { BMDocument } from "okapibm25";
import { Tokenizer } from "./tokenizer";
import { StorageManager } from "./storage";

export class BM25SearchEngine {
  private tokenizer = new Tokenizer();
  private storage = new StorageManager();
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  private getDb(): any {
    return this.storage.open(this.projectRoot);
  }

  /**
   * Splits camelCase, snake_case, tokenized lowercase representations
   */
  public tokenize(text: string): string[] {
    const rawTokens = this.tokenizer.tokenize(text);
    const refined: string[] = [];
    
    for (const t of rawTokens) {
      refined.push(t);
      // Extra check for camelCase split
      const splitCamel = t.replace(/([a-z])([A-Z])/g, "$1 $2").split(" ");
      if (splitCamel.length > 1) {
        refined.push(...splitCamel.map(x => x.toLowerCase()));
      }
    }
    
    return Array.from(new Set(refined)).filter(t => t.length > 1);
  }

  /**
   * Populates the bm25_terms table with pre-computed term frequencies.
   */
  public buildIndex(chunks: any[], db?: any): void {
    const activeDb = db || this.getDb();

    const run = () => {
      const stmtBm25 = activeDb.prepare(`
        INSERT OR REPLACE INTO bm25_terms (id, term, filePath, frequency)
        VALUES (?, ?, ?, ?)
      `);

      for (const chunk of chunks) {
        const text = chunk.content || chunk.text || "";
        const terms = this.tokenize(text);
        const freqs: Record<string, number> = {};
        for (const term of terms) {
          freqs[term] = (freqs[term] || 0) + 1;
        }

        const filePath = chunk.filePath || "";
        for (const [term, freq] of Object.entries(freqs)) {
          const bm25Id = `term_${chunk.id || filePath}_${term}`;
          stmtBm25.run(bm25Id, term, filePath, freq);
        }
      }
    };

    if (activeDb.inTransaction) {
      run();
    } else {
      activeDb.transaction(run)();
    }
  }

  /**
   * Searches the database index via okapibm25, loading only relevant documents into memory.
   */
  public search(query: string, limit: number = 10): any[] {
    const keywords = this.tokenize(query);
    if (keywords.length === 0) return [];

    const db = this.getDb();

    // Query distinct file paths containing candidate keywords from SQL to avoid loading entire corpus
    const placeholders = keywords.map(() => "?").join(",");
    const rows = db.prepare(`
      SELECT DISTINCT filePath FROM bm25_terms WHERE term IN (${placeholders})
    `).all(...keywords) as { filePath: string }[];

    if (rows.length === 0) return [];

    const matchingFilePaths = rows.map(r => r.filePath).filter(Boolean);
    if (matchingFilePaths.length === 0) return [];

    // Retrieve matching chunks
    const chunkPlaceholders = matchingFilePaths.map(() => "?").join(",");
    const chunks = db.prepare(`
      SELECT * FROM chunks WHERE filePath IN (${chunkPlaceholders})
    `).all(...matchingFilePaths) as any[];

    if (chunks.length === 0) return [];

    const documents = chunks.map(c => c.content || "");
    const scores = BM25(documents, keywords) as number[];

    const scored = chunks.map((chunk, index) => {
      let score = scores[index] || 0;
      // Award query literal exact match boost (similar to standard search pattern)
      if (chunk.content.toLowerCase().includes(query.toLowerCase())) {
        score += 3.0;
      }
      
      let parsedTags: string[] = [];
      try {
        parsedTags = JSON.parse(chunk.intentTags || "[]");
      } catch {
        parsedTags = [];
      }

      return {
        id: chunk.id,
        filePath: chunk.filePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        content: chunk.content,
        summary: chunk.summary,
        intentTags: parsedTags,
        score
      };
    });

    return scored
      .filter(s => s.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Backwards-compatible legacy rftRank method
   */
  public rftRank(query: string, docs: { id: string; text: string }[]): { id: string; score: number }[] {
    const keywords = this.tokenize(query);
    if (keywords.length === 0 || docs.length === 0) {
      return docs.map(d => ({ id: d.id, score: 0 }));
    }

    const documents = docs.map(d => d.text);
    const scores = BM25(documents, keywords) as number[];

    return docs
      .map((d, i) => ({ id: d.id, score: scores[i] || 0 }))
      .sort((a, b) => b.score - a.score);
  }
}

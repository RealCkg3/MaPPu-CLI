/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tokenizer } from "./tokenizer";

export class BM25SearchEngine {
  private tokenizer = new Tokenizer();

  /**
   * Fast lexical relevance ranking algorithm (Best Match 25).
   */
  public rftRank(query: string, docs: { id: string; text: string }[]): { id: string; score: number }[] {
    const qTokens = this.tokenizer.tokenize(query);
    const results: { id: string; score: number }[] = [];

    const k1 = 1.5;
    const b = 0.75;
    
    // IDF Calculation
    const N = docs.length;
    let avgDocLen = 0;
    const docLens: Record<string, number> = {};
    const tf: Record<string, Record<string, number>> = {};
    const docFreqs: Record<string, number> = {};

    docs.forEach(doc => {
      const tokens = this.tokenizer.tokenize(doc.text);
      docLens[doc.id] = tokens.length;
      avgDocLen += tokens.length;

      tf[doc.id] = {};
      const uniqueTokens = new Set(tokens);
      tokens.forEach(t => {
        tf[doc.id][t] = (tf[doc.id][t] || 0) + 1;
      });

      uniqueTokens.forEach(t => {
        docFreqs[t] = (docFreqs[t] || 0) + 1;
      });
    });

    avgDocLen = N > 0 ? avgDocLen / N : 1;

    docs.forEach(doc => {
      let score = 0;
      const dl = docLens[doc.id];

      qTokens.forEach(token => {
        const df = docFreqs[token] || 0;
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1.0);
        const termFreq = tf[doc.id][token] || 0;

        const numerator = termFreq * (k1 + 1);
        const denominator = termFreq + k1 * (1 - b + b * (dl / avgDocLen));
        score += idf * (numerator / denominator);
      });

      results.push({ id: doc.id, score });
    });

    return results.sort((a, b) => b.score - a.score);
  }
}

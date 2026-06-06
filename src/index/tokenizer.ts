/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class Tokenizer {
  private static readonly STOP_WORDS = new Set([
    "the", "and", "for", "from", "import", "export", "return"
  ]);

  /**
   * Splits camelCase, snake_case, PascalCase, dots, slashes, hyphens, and removes stop words.
   */
  public tokenize(text: string): string[] {
    if (!text) return [];

    // 1. Split camelCase/PascalCase boundaries
    let formatted = text
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");

    // 2. Split on: underscores, dots, slashes, hyphens
    formatted = formatted.replace(/[_\.\/\-]/g, " ");

    // 3. Clean up other punctuation/symbols to prevent merging
    formatted = formatted.replace(/[^a-zA-Z0-9\s]/g, " ");

    // 4. Lowercase and split on whitespace
    const rawTerms = formatted.toLowerCase().split(/\s+/);

    // 5. Filter out short tokens (under 2 characters) and common stop words
    return rawTerms.filter(t => t.length >= 2 && !Tokenizer.STOP_WORDS.has(t));
  }
}


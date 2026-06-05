/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class Tokenizer {
  /**
   * Splits camelCase and snake_case strings into individual words.
   */
  public tokenize(text: string): string[] {
    if (!text) return [];
    
    // Convert camelCase to space separated words
    let formatted = text.replace(/([a-z])([A-Z])/g, "$1 $2");
    // Convert snake_case to spaces
    formatted = formatted.replace(/[_-]/g, " ");
    
    // Normalize and retrieve terms
    return formatted
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(t => t.length > 1);
  }
}

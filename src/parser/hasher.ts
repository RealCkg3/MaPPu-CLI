/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as crypto from "crypto";

/**
 * Streams file content and computes its SHA-256 hash digest.
 * Safe for extremely large files by avoiding reading the entire content into memory.
 *
 * @param filePath Exact path to the file on disk.
 * @returns A promise resolving to the sha256 hex string.
 */
export function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("error", (err) => {
      reject(err);
    });

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
}

/**
 * Normalizes code content (comments stripped, identifiers with $VAR, literals with $LIT),
 * and computes SHA-256 hash representative of structural code AST.
 */
export function computeStructHash(content: string): string {
  let normalized = content;
  // 1. Strip multi line comments
  normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, "");
  // 2. Strip single line JS/TS style comments
  normalized = normalized.replace(/\/\/.*$/gm, "");
  // 3. Strip Python comments
  normalized = normalized.replace(/#.*$/gm, "");

  // 4. Replace strings with $LIT
  normalized = normalized.replace(/(["'`])(?:\\.|[^\\])*?\1/g, "$LIT");

  // 5. Replace floating point numbers and integer literals with $LIT
  normalized = normalized.replace(/\b\d+(\.\d+)?\b/g, "$LIT");
  normalized = normalized.replace(/\b0[xX][0-9a-fA-F]+\b/g, "$LIT");
  normalized = normalized.replace(/\b0[bB][01]+\b/g, "$LIT");

  // 6. Keywords to preserve
  const keywords = new Set([
    "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete",
    "do", "else", "export", "extends", "finally", "for", "function", "if", "import", "in",
    "instanceof", "new", "return", "super", "switch", "this", "throw", "try", "typeof", "var",
    "void", "while", "with", "yield", "let", "package", "private", "protected", "public",
    "static", "async", "await", "as", "from", "any", "string", "number", "boolean",
    "def", "elif", "except", "lambda", "pass", "None", "True", "False",
    "func", "go", "chan", "select", "defer", "map", "type", "struct", "interface",
    "fn", "pub", "impl", "trait", "mut", "use", "mod", "let", "match", "where", "self"
  ]);

  // 7. Replace other identifiers with $VAR
  normalized = normalized.replace(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g, (match) => {
    if (keywords.has(match) || match === "$LIT") {
      return match;
    }
    return "$VAR";
  });

  // 8. Collapse whitespace to serialize
  normalized = normalized.replace(/\s+/g, " ").trim();

  // 9. SHA-256 hash representative of structural code AST
  return crypto.createHash("sha256").update(normalized).digest("hex");
}


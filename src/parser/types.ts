/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedFile {
  filePath: string;
  description: string;
  languages: string;
  scannedAt: string;
  hash: string;
}

export interface ParsedSymbol {
  id: string;
  name: string;
  kind: string;
  filePath: string;
  startLine: number;
  endLine: number;
  isExported: number; // 0 or 1
}

export interface ParsedImport {
  id: string;
  source: string;
  target: string;
  type: "imports";
}

export interface ParsedCall {
  id: string;
  source: string;
  target: string;
  type: "calls";
}

export interface ParsedChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  summary: string;
  intentTags: string[];
  content: string;
}

/**
 * Parser result of a single scanned file before database ingestion.
 */
export interface ParserResult {
  filePath: string;
  language: string;
  symbols: ParsedSymbol[];
  imports: { source: string; importedSymbols: string[] }[];
  calls: { callee: string; line: number }[];
}

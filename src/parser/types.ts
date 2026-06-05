/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappuSymbol } from "../types/symbol";

export interface ParsedImport {
  source: string;
  importedSymbols: string[];
}

export interface ParsedCall {
  callee: string;
  line: number;
}

export interface ParsedFile {
  filePath: string;
  language: string;
  symbols: MappuSymbol[];
  imports: ParsedImport[];
  calls: ParsedCall[];
}

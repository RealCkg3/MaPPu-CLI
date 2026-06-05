/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum SymbolKind {
  Function = "FUNCTION",
  Method = "METHOD",
  Class = "CLASS",
  Interface = "INTERFACE",
  Variable = "VARIABLE",
  Constant = "CONSTANT",
  Endpoint = "ENDPOINT",
}

export interface SymbolScope {
  startLine: number;
  endLine: number;
}

export interface MappuSymbol {
  id: string;
  name: string;
  kind: SymbolKind;
  filePath: string;
  scope: SymbolScope;
  isExported: boolean;
}

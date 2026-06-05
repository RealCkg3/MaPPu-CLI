/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParserResult } from "./types";
import { UniversalTreeSitterWrapper } from "./tree-sitter";

import * as tsParser from "./languages/typescript";
import * as jsParser from "./languages/javascript";
import * as pyParser from "./languages/python";
import * as rsParser from "./languages/rust";
import * as goParser from "./languages/go";

export class ParserFactory {
  private static wrapper = new UniversalTreeSitterWrapper();

  public static getParserByExtension(ext: string): { parse: (filePath: string, content: string) => ParserResult | null } | null {
    const rawExt = ext.replace(/^\./, "").toLowerCase();

    const tsExtensions = ["ts", "tsx"];
    const jsExtensions = ["js", "jsx"];
    const pyExtensions = ["py"];
    const rsExtensions = ["rs"];
    const goExtensions = ["go"];

    const allSupported = [...tsExtensions, ...jsExtensions, ...pyExtensions, ...rsExtensions, ...goExtensions];
    if (!allSupported.includes(rawExt)) {
      return null;
    }

    return {
      parse: (filePath: string, content: string): ParserResult | null => {
        try {
          if (tsExtensions.includes(rawExt)) {
            return tsParser.parse(filePath, content);
          }
          if (jsExtensions.includes(rawExt)) {
            return jsParser.parse(filePath, content);
          }

          let language = "unknown";
          if (pyExtensions.includes(rawExt)) {
            language = pyParser.languageId;
          } else if (rsExtensions.includes(rawExt)) {
            language = rsParser.languageId;
          } else if (goExtensions.includes(rawExt)) {
            language = goParser.languageId;
          }

          if (language === "unknown") {
            return null;
          }

          return this.wrapper.parseFile(filePath, content, language);
        } catch (error) {
          console.error(`[ParserFactory] Exception while parsing ${filePath}:`, error);
          return null;
        }
      }
    };
  }
}
export * from "./types";
export * from "./tree-sitter";

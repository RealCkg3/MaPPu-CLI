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

  public static getParserByExtension(ext: string): { parse: (filePath: string, content: string) => ParserResult } {
    const rawExt = ext.replace(/^\./, "").toLowerCase();

    return {
      parse: (filePath: string, content: string): ParserResult => {
        if (["ts", "tsx"].includes(rawExt)) {
          return tsParser.parse(filePath, content);
        }

        let language = "unknown";
        if (["js", "jsx"].includes(rawExt)) {
          language = jsParser.languageId;
        } else if (rawExt === "py") {
          language = pyParser.languageId;
        } else if (rawExt === "rs") {
          language = rsParser.languageId;
        } else if (rawExt === "go") {
          language = goParser.languageId;
        }

        return this.wrapper.parseFile(filePath, content, language);
      }
    };
  }
}
export * from "./types";
export * from "./tree-sitter";

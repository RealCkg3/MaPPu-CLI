/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parse as estreeParse, AST_NODE_TYPES } from "@typescript-eslint/typescript-estree";
import { ParserResult, ParsedSymbol } from "../types";
import { SymbolKind } from "../../types/symbol";

export const languageId = "typescript";

/**
 * Parses TS/TSX file content into structured parser elements using @typescript-eslint/typescript-estree.
 * Gracefully runs fallback regex parsers if a syntax error is encountered.
 *
 * @param filePath Path of the file.
 * @param content The text content of the file.
 * @returns Standard ParserResult.
 */
export function parse(filePath: string, content: string): ParserResult {
  const symbols: ParsedSymbol[] = [];
  const imports: { source: string; importedSymbols: string[] }[] = [];
  const calls: { callee: string; line: number }[] = [];

  // Extended result list for typescript specifics
  const typescriptSpecifics = {
    functions: [] as any[],
    classes: [] as any[],
    imports: [] as any[],
    calls: [] as any[]
  };

  try {
    const ast = estreeParse(content, {
      loc: true,
      range: true,
      jsx: true
    });

    const exportedNames = new Set<string>();

    // Pass 1: Collect exported names
    function findExports(node: any) {
      if (!node || typeof node !== "object") return;

      if (node.type === AST_NODE_TYPES.ExportNamedDeclaration) {
        if (node.declaration) {
          if (node.declaration.type === AST_NODE_TYPES.FunctionDeclaration && node.declaration.id) {
            exportedNames.add(node.declaration.id.name);
          } else if (node.declaration.type === AST_NODE_TYPES.ClassDeclaration && node.declaration.id) {
            exportedNames.add(node.declaration.id.name);
          } else if (node.declaration.type === AST_NODE_TYPES.VariableDeclaration) {
            for (const decl of node.declaration.declarations) {
              if (decl.id && decl.id.type === AST_NODE_TYPES.Identifier) {
                exportedNames.add(decl.id.name);
              }
            }
          }
        }
        if (node.specifiers) {
          for (const spec of node.specifiers) {
            if (spec.local && spec.local.type === AST_NODE_TYPES.Identifier) {
              exportedNames.add(spec.local.name);
            }
          }
        }
      } else if (node.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
        if (node.declaration) {
          if (node.declaration.id && node.declaration.id.type === AST_NODE_TYPES.Identifier) {
            exportedNames.add(node.declaration.id.name);
          } else {
            exportedNames.add("default");
          }
        }
      }

      for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) {
            findExports(item);
          }
        } else if (child && typeof child === "object" && typeof child.type === "string") {
          findExports(child);
        }
      }
    }

    findExports(ast);

    // Pass 2: Extract functions, classes, imports, etc.
    function walk(node: any, parent?: any, grandparent?: any) {
      if (!node || typeof node !== "object") return;

      const lineNum = node.loc ? node.loc.start.line : 1;
      const endLineNum = node.loc ? node.loc.end.line : 1;

      // Classify whether an item is exported directly or via set of names
      const isExportedNode = (n: any): boolean => {
        if (parent && (parent.type === AST_NODE_TYPES.ExportNamedDeclaration || parent.type === AST_NODE_TYPES.ExportDefaultDeclaration)) {
          return true;
        }
        if (grandparent && (grandparent.type === AST_NODE_TYPES.ExportNamedDeclaration || grandparent.type === AST_NODE_TYPES.ExportDefaultDeclaration)) {
          return true;
        }
        if (n.id && n.id.type === AST_NODE_TYPES.Identifier && exportedNames.has(n.id.name)) {
          return true;
        }
        return false;
      };

      // 1. Import statements
      if (node.type === AST_NODE_TYPES.ImportDeclaration) {
        const source = node.source ? node.source.value : "";
        const namedSpecs = (node.specifiers || []).filter((s: any) => s.type === AST_NODE_TYPES.ImportSpecifier);
        const namedImports = namedSpecs.map((s: any) => s.imported ? (s.imported.type === AST_NODE_TYPES.Identifier ? s.imported.name : s.imported.value) : "");
        const isDefault = (node.specifiers || []).some((s: any) => s.type === AST_NODE_TYPES.ImportDefaultSpecifier);

        imports.push({ source, importedSymbols: namedImports });
        typescriptSpecifics.imports.push({ source, namedImports, isDefault });
      }

      // Re-export as import dependency matcher
      if (node.type === AST_NODE_TYPES.ExportNamedDeclaration && node.source) {
        const source = node.source.value;
        const namedImports = (node.specifiers || []).map((s: any) => s.exported ? s.exported.name : "");
        imports.push({ source, importedSymbols: namedImports });
        typescriptSpecifics.imports.push({ source, namedImports, isDefault: false });
      } else if (node.type === AST_NODE_TYPES.ExportAllDeclaration && node.source) {
        const source = node.source.value;
        imports.push({ source, importedSymbols: ["*"] });
        typescriptSpecifics.imports.push({ source, namedImports: ["*"], isDefault: false });
      }

      // 2. Class declarations
      if (node.type === AST_NODE_TYPES.ClassDeclaration || node.type === AST_NODE_TYPES.ClassExpression) {
        const name = node.id ? node.id.name : "anonymous";
        const classMethods: string[] = [];

        if (node.body && node.body.body) {
          for (const member of node.body.body) {
            if (member.type === AST_NODE_TYPES.MethodDefinition || member.type === AST_NODE_TYPES.TSAbstractMethodDefinition) {
              if (member.key && member.key.type === AST_NODE_TYPES.Identifier) {
                classMethods.push(member.key.name);
              }
            } else if (member.type === AST_NODE_TYPES.PropertyDefinition && member.value && (member.value.type === AST_NODE_TYPES.ArrowFunctionExpression || member.value.type === AST_NODE_TYPES.FunctionExpression)) {
              if (member.key && member.key.type === AST_NODE_TYPES.Identifier) {
                classMethods.push(member.key.name);
              }
            }
          }
        }

        typescriptSpecifics.classes.push({ name, methods: classMethods });

        symbols.push({
          id: `${filePath}#${name}`,
          name,
          kind: SymbolKind.Class,
          filePath,
          startLine: lineNum,
          endLine: endLineNum,
          isExported: isExportedNode(node) ? 1 : 0
        });
      }

      // 3. Function Declarations
      if (node.type === AST_NODE_TYPES.FunctionDeclaration) {
        const name = node.id ? node.id.name : "anonymous";
        const paramsCount = node.params ? node.params.length : 0;
        const isAsync = node.async || false;
        let returnType = "void";
        if (node.returnType && node.returnType.range) {
          const rawType = content.substring(node.returnType.range[0], node.returnType.range[1]);
          returnType = rawType.replace(/^:\s*/, "").trim();
        }

        const isExported = isExportedNode(node);

        typescriptSpecifics.functions.push({
          name,
          startLine: lineNum,
          endLine: endLineNum,
          paramsCount,
          isAsync,
          isExported,
          returnType
        });

        symbols.push({
          id: `${filePath}#${name}`,
          name,
          kind: SymbolKind.Function,
          filePath,
          startLine: lineNum,
          endLine: endLineNum,
          isExported: isExported ? 1 : 0
        });
      }

      // Check Arrow functions/Function expressions assigned to variables
      if (node.type === AST_NODE_TYPES.VariableDeclarator && node.init && (node.init.type === AST_NODE_TYPES.ArrowFunctionExpression || node.init.type === AST_NODE_TYPES.FunctionExpression)) {
        if (node.id && node.id.type === AST_NODE_TYPES.Identifier) {
          const name = node.id.name;
          const paramsCount = node.init.params ? node.init.params.length : 0;
          const isAsync = node.init.async || false;
          let returnType = "void";
          if (node.init.returnType && node.init.returnType.range) {
            const rawType = content.substring(node.init.returnType.range[0], node.init.returnType.range[1]);
            returnType = rawType.replace(/^:\s*/, "").trim();
          }

          // VariableDeclaration (parent) grandparent is export
          const isExportedVar = (parent && parent.type === AST_NODE_TYPES.VariableDeclaration) ? isExportedNode(parent) : false;

          typescriptSpecifics.functions.push({
            name,
            startLine: lineNum,
            endLine: endLineNum,
            paramsCount,
            isAsync,
            isExported: isExportedVar,
            returnType
          });

          symbols.push({
            id: `${filePath}#${name}`,
            name,
            kind: SymbolKind.Function,
            filePath,
            startLine: lineNum,
            endLine: endLineNum,
            isExported: isExportedVar ? 1 : 0
          });
        }
      }

      // 4. Function calls
      if (node.type === AST_NODE_TYPES.CallExpression) {
        function getCalleeName(calleeNode: any): string {
          if (!calleeNode) return "";
          if (calleeNode.type === AST_NODE_TYPES.Identifier) {
            return calleeNode.name;
          } else if (calleeNode.type === AST_NODE_TYPES.MemberExpression) {
            const objName = getCalleeName(calleeNode.object);
            const propName = calleeNode.property && calleeNode.property.type === AST_NODE_TYPES.Identifier ? calleeNode.property.name : "";
            return objName ? `${objName}.${propName}` : propName;
          } else if (calleeNode.type === AST_NODE_TYPES.Super) {
            return "super";
          }
          return "";
        }

        const callee = getCalleeName(node.callee);
        if (callee) {
          calls.push({ callee, line: lineNum });
          typescriptSpecifics.calls.push({ callee, line: lineNum });
        }
      }

      // Traverse children with complete parent/grandparent linkage
      for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) {
            walk(item, node, parent);
          }
        } else if (child && typeof child === "object" && typeof child.type === "string") {
          walk(child, node, parent);
        }
      }
    }

    walk(ast);
  } catch (error) {
    // Syntax error fallback - use regex heuristics to avoid crashing
    const lines = content.split("\n");

    // Extract imports
    const importRegex = /import\s+([\s\S]*?)\s+from\s+['"](.*?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const source = match[2];
      const symbolsStr = match[1].replace(/[{}]/g, "").trim();
      const importedSymbols = symbolsStr ? symbolsStr.split(",").map(s => s.trim()) : [];
      imports.push({ source, importedSymbols });
      typescriptSpecifics.imports.push({ source, namedImports: importedSymbols, isDefault: true });
    }

    // Extract declarations/symbols (Classes, Functions, Methods)
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNum = index + 1;

      // Class Matcher
      if (trimmed.startsWith("class ") || trimmed.startsWith("export class ")) {
        const parts = trimmed.split(/class\s+/);
        if (parts[1]) {
          const className = parts[1].split(/[\s{<]/)[0].trim();
          symbols.push({
            id: `${filePath}#${className}`,
            name: className,
            kind: SymbolKind.Class,
            filePath,
            startLine: lineNum,
            endLine: lineNum + 15,
            isExported: trimmed.includes("export ") ? 1 : 0
          });
          typescriptSpecifics.classes.push({ name: className, methods: [] });
        }
      }

      // Function matcher
      if (trimmed.startsWith("function ") || trimmed.startsWith("export function ") || trimmed.startsWith("async function ") || trimmed.startsWith("export async function ")) {
        const nameMatch = trimmed.match(/(?:function)\s+([a-zA-Z0-9_]+)/);
        if (nameMatch && nameMatch[1]) {
          const funcName = nameMatch[1];
          symbols.push({
            id: `${filePath}#${funcName}`,
            name: funcName,
            kind: SymbolKind.Function,
            filePath,
            startLine: lineNum,
            endLine: lineNum + 10,
            isExported: trimmed.includes("export ") ? 1 : 0
          });
          typescriptSpecifics.functions.push({
            name: funcName,
            startLine: lineNum,
            endLine: lineNum + 10,
            paramsCount: 0,
            isAsync: trimmed.includes("async "),
            isExported: trimmed.includes("export "),
            returnType: "any"
          });
        }
      }

      // Method/Call matcher fallback
      if (trimmed.includes("this.") && trimmed.includes("(") && trimmed.includes(")")) {
        const callMatch = trimmed.match(/this\.([a-zA-Z0-9_]+)\(/);
        if (callMatch && callMatch[1]) {
          calls.push({ callee: `this.${callMatch[1]}`, line: lineNum });
          typescriptSpecifics.calls.push({ callee: `this.${callMatch[1]}`, line: lineNum });
        }
      }
    });
  }

  // Combine standard and extended types to satisfies all requirements beautifully!
  return Object.assign({
    filePath,
    language: "typescript",
    symbols,
    imports,
    calls
  }, typescriptSpecifics) as ParserResult;
}

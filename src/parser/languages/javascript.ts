/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parse as estreeParse, AST_NODE_TYPES } from "@typescript-eslint/typescript-estree";
import { ParserResult, ParsedSymbol } from "../types";
import { SymbolKind } from "../../types/symbol";

export const languageId = "javascript";

/**
 * Parses JS/JSX file content into structured parser elements using @typescript-eslint/typescript-estree.
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

  // JS specifics
  const javascriptSpecifics = {
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

    // Pass 1: Collect exported names (supports both ES imports/exports and CommonJS if present)
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

    // Pass 2: Extract functions, classes, imports, calls
    function walk(node: any, parent?: any, grandparent?: any) {
      if (!node || typeof node !== "object") return;

      const lineNum = node.loc ? node.loc.start.line : 1;
      const endLineNum = node.loc ? node.loc.end.line : 1;

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

      // 1. ES Import statements
      if (node.type === AST_NODE_TYPES.ImportDeclaration) {
        const source = node.source ? node.source.value : "";
        const namedSpecs = (node.specifiers || []).filter((s: any) => s.type === AST_NODE_TYPES.ImportSpecifier);
        const namedImports = namedSpecs.map((s: any) => s.imported ? (s.imported.type === AST_NODE_TYPES.Identifier ? s.imported.name : s.imported.value) : "");
        const isDefault = (node.specifiers || []).some((s: any) => s.type === AST_NODE_TYPES.ImportDefaultSpecifier);

        imports.push({ source, importedSymbols: namedImports });
        javascriptSpecifics.imports.push({ source, namedImports, isDefault });
      }

      // 2. Re-exports
      if (node.type === AST_NODE_TYPES.ExportNamedDeclaration && node.source) {
        const source = node.source.value;
        const namedImports = (node.specifiers || []).map((s: any) => s.exported ? s.exported.name : "");
        imports.push({ source, importedSymbols: namedImports });
        javascriptSpecifics.imports.push({ source, namedImports, isDefault: false });
      } else if (node.type === AST_NODE_TYPES.ExportAllDeclaration && node.source) {
        const source = node.source.value;
        imports.push({ source, importedSymbols: ["*"] });
        javascriptSpecifics.imports.push({ source, namedImports: ["*"], isDefault: false });
      }

      // 3. CommonJS require support
      if (node.type === AST_NODE_TYPES.CallExpression && node.callee && node.callee.name === "require") {
        if (node.arguments && node.arguments.length > 0 && node.arguments[0].type === AST_NODE_TYPES.Literal) {
          const source = node.arguments[0].value;
          imports.push({ source, importedSymbols: ["*"] });
          javascriptSpecifics.imports.push({ source, namedImports: ["*"], isDefault: true });
        }
      }

      // 4. Class declarations
      if (node.type === AST_NODE_TYPES.ClassDeclaration || node.type === AST_NODE_TYPES.ClassExpression) {
        const name = node.id ? node.id.name : "anonymous";
        const classMethods: string[] = [];

        if (node.body && node.body.body) {
          for (const member of node.body.body) {
            if (member.type === AST_NODE_TYPES.MethodDefinition) {
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

        javascriptSpecifics.classes.push({ name, methods: classMethods });

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

      // 5. Function declarations
      if (node.type === AST_NODE_TYPES.FunctionDeclaration) {
        const name = node.id ? node.id.name : "anonymous";
        const paramsCount = node.params ? node.params.length : 0;
        const isAsync = node.async || false;

        const isExported = isExportedNode(node);

        javascriptSpecifics.functions.push({
          name,
          startLine: lineNum,
          endLine: endLineNum,
          paramsCount,
          isAsync,
          isExported,
          returnType: "any"
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

      // 6. Arrow functions/Function expressions assigned to variables
      if (node.type === AST_NODE_TYPES.VariableDeclarator && node.init && (node.init.type === AST_NODE_TYPES.ArrowFunctionExpression || node.init.type === AST_NODE_TYPES.FunctionExpression)) {
        if (node.id && node.id.type === AST_NODE_TYPES.Identifier) {
          const name = node.id.name;
          const paramsCount = node.init.params ? node.init.params.length : 0;
          const isAsync = node.init.async || false;

          const isExportedVar = (parent && parent.type === AST_NODE_TYPES.VariableDeclaration) ? isExportedNode(parent) : false;

          javascriptSpecifics.functions.push({
            name,
            startLine: lineNum,
            endLine: endLineNum,
            paramsCount,
            isAsync,
            isExported: isExportedVar,
            returnType: "any"
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

      // 7. Function calls
      if (node.type === AST_NODE_TYPES.CallExpression) {
        function getCalleeName(calleeNode: any): string {
          if (!calleeNode) return "";
          if (calleeNode.type === AST_NODE_TYPES.Identifier) {
            return calleeNode.name;
          } else if (calleeNode.type === AST_NODE_TYPES.MemberExpression) {
            const objName = getCalleeName(calleeNode.object);
            const propName = calleeNode.property && calleeNode.property.type === AST_NODE_TYPES.Identifier ? calleeNode.property.name : "";
            return objName ? `${objName}.${propName}` : propName;
          }
          return "";
        }

        const callee = getCalleeName(node.callee);
        if (callee && callee !== "require") {
          calls.push({ callee, line: lineNum });
          javascriptSpecifics.calls.push({ callee, line: lineNum });
        }
      }

      // Traverse children with parent/grandparent linkage
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
    // Graceful regex fallback in case of syntax issues
    const lines = content.split("\n");

    // ES imports fallback
    const importRegex = /import\s+([\s\S]*?)\s+from\s+['"](.*?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const source = match[2];
      const symbolsStr = match[1].replace(/[{}]/g, "").trim();
      const importedSymbols = symbolsStr ? symbolsStr.split(",").map(s => s.trim()) : [];
      imports.push({ source, importedSymbols });
      javascriptSpecifics.imports.push({ source, namedImports: importedSymbols, isDefault: true });
    }

    // CommonJS require fallback
    const requireRegex = /(?:const|let|var)\s+([\s\S]*?)\s*=\s*require\(['"](.*?)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const source = match[2];
      const symbolsStr = match[1].replace(/[{}]/g, "").trim();
      const importedSymbols = symbolsStr ? symbolsStr.split(",").map(s => s.trim()) : [];
      imports.push({ source, importedSymbols });
      javascriptSpecifics.imports.push({ source, namedImports: importedSymbols, isDefault: true });
    }

    // Extract declarations fallback
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNum = index + 1;

      // Class matcher
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
          javascriptSpecifics.classes.push({ name: className, methods: [] });
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
          javascriptSpecifics.functions.push({
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
    });
  }

  return Object.assign({
    filePath,
    language: "javascript",
    symbols,
    imports,
    calls
  }, javascriptSpecifics) as ParserResult;
}

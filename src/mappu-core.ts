/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { getLLMAdapter } from "./adapters/llm/factory";

// Interfaces for Mappu Indexing Architecture
export interface FileChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  length: number;
}

export interface IndexRegistry {
  scannedAt: string;
  projectRoot: string;
  totalFiles: number;
  files: {
    filePath: string;
    description: string;
    exports: string[];
    imports: string[];
    languages: string;
    hash?: string;
  }[];
  chunks: {
    id: string;
    filePath: string;
    startLine: number;
    endLine: number;
    summary: string;
    intentTags: string[];
  }[];
}

import { scanFiles } from "./parser/scanner";

// Scans recursively with deep ignore patterns
export async function scanCodebase(projectRoot: string): Promise<{ filePath: string; content: string }[]> {
  const fileList: { filePath: string; content: string }[] = [];
  try {
    const scanned = await scanFiles(projectRoot);
    for (const f of scanned) {
      const fullPath = path.resolve(projectRoot, f.path);
      try {
        const stat = await fs.promises.stat(fullPath);
        if (stat.size < 200000) {
          const content = await fs.promises.readFile(fullPath, "utf-8");
          fileList.push({ filePath: f.path, content });
        }
      } catch {
        // skip unreadable files
      }
    }
  } catch {
    // Ignore error
  }
  return fileList;
}

// Splitting large files into logical snippet blocks (40-line sliding windows)
export function chunkFiles(scannedFiles: { filePath: string; content: string }[]): FileChunk[] {
  const chunks: FileChunk[] = [];
  let chunkCounter = 0;

  for (const file of scannedFiles) {
    const lines = file.content.split("\n");
    const chunkSize = 40;
    const overlap = 8;
    
    // For small files, create one single chunk
    if (lines.length <= chunkSize) {
      chunks.push({
        id: `chunk_${++chunkCounter}`,
        filePath: file.filePath,
        startLine: 1,
        endLine: lines.length,
        content: file.content,
        length: file.content.length,
      });
      continue;
    }

    let index = 0;
    while (index < lines.length) {
      const start = index;
      const end = Math.min(start + chunkSize, lines.length);
      const chunkLines = lines.slice(start, end);
      const chunkText = chunkLines.join("\n");

      chunks.push({
        id: `chunk_${++chunkCounter}`,
        filePath: file.filePath,
        startLine: start + 1,
        endLine: end,
        content: chunkText,
        length: chunkText.length,
      });

      if (end >= lines.length) break;
      index += chunkSize - overlap;
    }
  }

  return chunks;
}

// Local Static Indexer Fallback utility running 100% offline
export function runLocalStaticIndexer(scanned: { filePath: string; content: string }[], rawChunks: FileChunk[]): { files: any[]; chunks: any[] } {
  const files = scanned.map(f => {
    const ext = path.extname(f.filePath).toLowerCase();
    let language = "PlainText";
    if (ext === ".ts" || ext === ".tsx") language = "TypeScript";
    else if (ext === ".js" || ext === ".jsx") language = "JavaScript";
    else if (ext === ".py") language = "Python";
    else if (ext === ".rs") language = "Rust";
    else if (ext === ".go") language = "Go";
    else if (ext === ".html") language = "HTML";
    else if (ext === ".css") language = "CSS";
    else if (ext === ".json") language = "JSON";
    else if (ext === ".md") language = "Markdown";

    const exports: string[] = [];
    if (["TypeScript", "JavaScript"].includes(language)) {
      const exportRegex = /export\s+(const|class|function|interface|type|async\s+function)\s+([a-zA-Z0-9_]+)/g;
      let match;
      while ((match = exportRegex.exec(f.content)) !== null) {
        if (match[2]) exports.push(match[2]);
      }
    } else if (language === "Python") {
      const defRegex = /def\s+([a-zA-Z0-9_]+)\s*\(/g;
      let match;
      while ((match = defRegex.exec(f.content)) !== null) {
        if (match[1]) exports.push(match[1]);
      }
      const classRegex = /class\s+([a-zA-Z0-9_]+)\s*:/g;
      let classMatch;
      while ((classMatch = classRegex.exec(f.content)) !== null) {
        if (classMatch[1]) exports.push(classMatch[1]);
      }
    }

    const imports: string[] = [];
    if (["TypeScript", "JavaScript"].includes(language)) {
      const importRegex = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
      let match;
      while ((match = importRegex.exec(f.content)) !== null) {
        if (match[1]) imports.push(match[1]);
      }
    } else if (language === "Python") {
      const importRegex = /(?:import\s+|from\s+)([a-zA-Z0-9_\.]+)/g;
      let match;
      while ((match = importRegex.exec(f.content)) !== null) {
        if (match[1]) imports.push(match[1]);
      }
    }

    const cleanImports = imports.map(imp => path.basename(imp));

    let description = `Local source code module files of language ${language}.`;
    if (f.filePath === "server.ts") {
      description = "Core Application entry and REST API backend server router.";
    } else if (f.filePath.includes("engines/")) {
      description = "Mappu static analysis code metrics processing engine module.";
    } else if (f.filePath.includes("cli/")) {
      description = "Command-Line Interface utility parser and interactive execution wrappers.";
    } else if (f.filePath === "package.json") {
      description = "Ecosystem package dependencies, assets scripts, metadata configs.";
    }

    return {
      filePath: f.filePath,
      description,
      languages: language,
      exports,
      imports: cleanImports
    };
  });

  const chunks = rawChunks.map(c => {
    let summary = `Procedural code segment of ${c.filePath} containing operational steps.`;
    const intentTags = ["logic execution"];

    if (c.filePath === "server.ts") {
      if (c.content.includes("app.get") || c.content.includes("app.post")) {
        summary = "Exposes REST API routing pathways and server response controls.";
        intentTags.push("REST API endpoints", "router configs");
      } else if (c.content.includes("start(")) {
        summary = "Node Express bootstrapper listening on designated port configuration.";
        intentTags.push("server boot", "Vite middleware configuration");
      }
    } else if (c.content.includes("class ")) {
      summary = "Contains object-oriented class blueprints definition logical structures.";
      intentTags.push("class configuration", "types definition");
    } else if (c.content.includes("async ")) {
      summary = "Contains asynchronous execution sequence algorithms.";
      intentTags.push("async operations", "promises block");
    }

    return {
      id: c.id,
      filePath: c.filePath,
      summary,
      intentTags
    };
  });

  return { files, chunks };
}

// Build Local Index with intelligent model-guided summarizing mapping
export async function indexCodebase(projectRoot: string, onProgress?: (msg: string) => void): Promise<IndexRegistry> {
  const { IndexBuilder } = await import("./index/builder");
  const builder = new IndexBuilder();
  return builder.build(projectRoot, onProgress);
}

// Retrieve cached index securely from project root
export function getStoredIndex(projectRoot: string): { registry: IndexRegistry; chunks: FileChunk[] } | null {
  const dbPath = path.join(projectRoot, ".mappu", "mappu.db");

  if (!fs.existsSync(dbPath)) {
    return null;
  }

  try {
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    const files = db.prepare(`SELECT * FROM files`).all() as any[];
    if (files.length === 0) {
      db.close();
      return null;
    }

    const dbChunks = db.prepare(`SELECT * FROM chunks`).all() as any[];
    const dbSymbols = db.prepare(`SELECT * FROM symbols`).all() as any[];
    const dbEdges = db.prepare(`SELECT * FROM edges`).all() as any[];

    db.close();

    // Reconstruct files format
    const registryFiles = files.map(f => {
      const fileImports = dbEdges
        .filter(e => e.source === f.filePath && e.type === "imports")
        .map(e => e.target);

      const fileExports = dbSymbols
        .filter(s => s.filePath === f.filePath && s.kind === "export")
        .map(s => s.name);

      return {
        filePath: f.filePath,
        description: f.description,
        exports: fileExports,
        imports: fileImports,
        languages: f.languages,
      };
    });

    // Reconstruct chunks format
    const registryChunks = dbChunks.map(c => {
      let parsedTags: string[] = [];
      try {
        parsedTags = JSON.parse(c.intentTags);
      } catch {
        parsedTags = [];
      }

      return {
        id: c.id,
        filePath: c.filePath,
        startLine: c.startLine || 1,
        endLine: c.endLine || 1,
        summary: c.summary,
        intentTags: parsedTags,
      };
    });

    const registry: IndexRegistry = {
      scannedAt: files[0]?.scannedAt || new Date().toISOString(),
      projectRoot,
      totalFiles: files.length,
      files: registryFiles,
      chunks: registryChunks,
    };

    const rawChunks: FileChunk[] = dbChunks.map(c => ({
      id: c.id,
      filePath: c.filePath,
      startLine: c.startLine || 1,
      endLine: c.endLine || 1,
      content: c.content,
      length: c.content.length,
    }));

    return { registry, chunks: rawChunks };
  } catch {
    return null;
  }
}

// ----------------------
// ENGINE 1: INTENT SEARCH
// ----------------------
export interface SearchResult {
  filePath: string;
  startLine: number;
  endLine: number;
  snippet: string;
  score: number; // 1-10 hover confidence
  matchRationale: string;
}

export async function searchIntent(projectRoot: string, query: string): Promise<SearchResult[]> {
  const indexWrap = getStoredIndex(projectRoot);
  if (!indexWrap) {
    throw new Error("No Mappu index found. Run 'mappu init' first.");
  }

  const { registry, chunks: rawChunks } = indexWrap;
  const adapter = getLLMAdapter();

  // Combine query and context
  const searchContextPrompt = `
    Find files matches user developer behavioral intent in the project codebase.
    USER INTENT QUERY: "${query}"

    Codebase File Blueprint:
    ${registry.files.map(f => `- ${f.filePath}: ${f.description}`).join("\n")}

    Code Chunk Index:
    ${registry.chunks.map(c => `[ID: ${c.id}] FILE: ${c.filePath} (${c.startLine}-${c.endLine}) - Intent Tags: ${c.intentTags.join(", ")} - Summary: ${c.summary}`).join("\n")}

    Which chunks match the functional, logical, architectural, or behavioral intent of "${query}"? 
    Even if the exact text does not contain word fragments, analyze the deep meaning.
    Match up to 5 best chunks and score them from 1 to 10 (10 is extremely accurate). 
    Explain precisely why it matches.
  `;

  const responseText = await adapter.generate(searchContextPrompt, "You are Mappu Semantic Code Search Router. Analyze intent similarity across code files and return ranked JSON matches.", {
    responseMimeType: "application/json",
    responseSchema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          chunkId: { type: "string" },
          score: { type: "integer" },
          matchRationale: { type: "string", description: "A conversational explanation of why this file is logically matched with the user's intent." }
        },
        required: ["chunkId", "score", "matchRationale"]
      }
    }
  });

  const rawMatches: { chunkId: string; score: number; matchRationale: string }[] = JSON.parse(responseText || "[]");
  const results: SearchResult[] = [];

  for (const match of rawMatches) {
    // Locate actual code text
    const lookup = rawChunks.find(rc => rc.id === match.chunkId);
    if (lookup) {
      results.push({
        filePath: lookup.filePath,
        startLine: lookup.startLine,
        endLine: lookup.endLine,
        snippet: lookup.content,
        score: match.score,
        matchRationale: match.matchRationale
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ----------------------
// ENGINE 2: EXECUTION TRACING
// ----------------------
export interface TraceStep {
  step: number;
  filePath: string;
  blockName: string;
  lines: string;
  description: string;
  logicSnippet: string;
}

export interface TraceFlow {
  intent: string;
  nodesCount: number;
  overviewFlow: string;
  steps: TraceStep[];
}

export async function traceExecution(projectRoot: string, query: string): Promise<TraceFlow> {
  const indexWrap = getStoredIndex(projectRoot);
  if (!indexWrap) {
    throw new Error("No Mappu index found. Run 'mappu init' first.");
  }

  const { registry, chunks: rawChunks } = indexWrap;
  const adapter = getLLMAdapter();

  const tracePrompt = `
    User wishes to trace a call flow or procedural journey inside the repository.
    FLOW USER INTENT: "${query}"

    Use the project structure registry mapping and imports to trace step-by-step how execution passes from one place to another.
    FILES:
    ${registry.files.map(f => `- ${f.filePath}: imports [${f.imports.join(", ")}], exports [${f.exports.join(", ")}]. ${f.description}`).join("\n")}

    CHUNKS RECONSTRUCT:
    ${registry.chunks.map(c => `[ID: ${c.id}] ${c.filePath} (lines ${c.startLine}-${c.endLine}): ${c.summary}`).join("\n")}

    Generate a complete chronological trace showing how this requested intent flow would run pathwise.
    Be precise about which file, function, or block runs at each step of the chain. Use available code chunks data.
  `;

  const responseText = await adapter.generate(tracePrompt, "You are the Mappu Tracer. Trace sequence flows across code structures and express them in structured, readable trace blocks.", {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        intent: { type: "string" },
        overviewFlow: { type: "string", description: "A high-level summary paragraph showing the logic cascade." },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: { type: "integer" },
              filePath: { type: "string" },
              blockName: { type: "string", description: "The function name, routine, class method, or express middleware involved." },
              lines: { type: "string", description: "e.g. 'line 14-40'" },
              description: { type: "string", description: "Explanation of what is processed or calculated at this node." },
              logicSnippet: { type: "string", description: "The code fragment, import statement, or key evaluation line defining this step." }
            },
            required: ["step", "filePath", "blockName", "lines", "description"]
          }
        }
      },
      required: ["intent", "overviewFlow", "steps"]
    }
  });

  return JSON.parse(responseText || "{}");
}

// ----------------------
// ENGINE 3: SYSTEM DOCTOR
// ----------------------
export interface DiagnosticsIssue {
  severity: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  affectedFiles: string[];
  remediationSnippet: string;
}

export interface DoctorReport {
  scannedAt: string;
  diagnosedIntent: string;
  overallScore: number; // 0-100 score of robustness
  summaryReview: string;
  issues: DiagnosticsIssue[];
}

export async function runDoctor(projectRoot: string, intent: string): Promise<DoctorReport> {
  const indexWrap = getStoredIndex(projectRoot);
  if (!indexWrap) {
    throw new Error("No Mappu index found. Run 'mappu init' first.");
  }

  const { registry, chunks: rawChunks } = indexWrap;
  const adapter = getLLMAdapter();

  const doctorPrompt = `
    Analyze the codebase with focus on high-safety, logic alignment, or architectural validation.
    DO NOT construct simulation. Build a precise gap-analysis review of the real structures against the intent.
    DIAGNOSIS INTENT FOCUS: "${intent}"

    Codebase schemas:
    ${registry.files.map(f => `- ${f.filePath}: ${f.description}`).join("\n")}

    Code chunks:
    ${registry.chunks.map(c => `[ID: ${c.id}] ${c.filePath}: ${c.summary} (tags: ${c.intentTags.join(",")})`).join("\n")}

    Review for functional logic holes, dangling dependencies, unprotected execution logic, missing layers (e.g. no error catch, no schema verification, unprotected API pathways).
    Highlight real risks or missing best-practice abstractions for "${intent}".
  `;

  const responseText = await adapter.generate(doctorPrompt, "You are the Mappu Doctor Engine. Rigorously diagnose structural risks, security gaps, and logical discrepancies. Provide elegant remediation.", {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        diagnosedIntent: { type: "string" },
        overallScore: { type: "integer", description: "Robusness index from 0 (broken/unsecure) to 100 (flawless production grade)" },
        summaryReview: { type: "string" },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["high", "medium", "low"] },
              category: { type: "string", description: "e.g., 'Error Handling', 'Validation Gap', 'Security Check'" },
              title: { type: "string" },
              description: { type: "string" },
              affectedFiles: { type: "array", items: { type: "string" } },
              remediationSnippet: { type: "string", description: "Pristine standard code block solving this diagnostic issue." }
            },
            required: ["severity", "category", "title", "description", "affectedFiles"]
          }
        }
      },
      required: ["diagnosedIntent", "overallScore", "summaryReview", "issues"]
    }
  });

  return JSON.parse(responseText || "{}");
}

// ----------------------
// ENGINE 4: ARCHITECTURE REFACTOR
// ----------------------
export interface RefactorStep {
  step: number;
  filePath: string;
  action: "modify" | "create" | "delete";
  explanation: string;
  targetContent: string;
  replacementContent: string;
}

export interface RefactorPlan {
  directive: string;
  strategyOverview: string;
  expectedOutcomes: string;
  steps: RefactorStep[];
}

export async function refactorCodebase(projectRoot: string, directive: string): Promise<RefactorPlan> {
  const indexWrap = getStoredIndex(projectRoot);
  if (!indexWrap) {
    throw new Error("No Mappu index found. Run 'mappu init' first.");
  }

  const { registry, chunks: rawChunks } = indexWrap;
  const adapter = getLLMAdapter();

  const refactorPrompt = `
    Analyze the codebase files & chunks and generate a pristine, safe, concrete refactoring plan to implement the following goal:
    GOAL DIRECTIVE: "${directive}"

    DO NOT actually modify the files. Generate a highly structured implementation recipe file path by file path.

    Workspace blueprint:
    ${registry.files.map(f => `- PATH: ${f.filePath}. Purpose: ${f.description}`).join("\n")}

    Snippet chunks available:
    ${registry.chunks.slice(0, 15).map(c => `[ID: ${c.id}] FILE: ${c.filePath} (${c.startLine}-${c.endLine}): ${c.summary}`).join("\n")}

    For your proposed steps, find matching code in the snippets or propose concrete code templates. Ensure replacementContent is beautifully integrated.
  `;

  const responseText = await adapter.generate(refactorPrompt, "You are the Mappu Refactor Architect. Formulate precise code refactoring recipes. Each step must specify targetContent (what to find) and replacementContent (the modern clean replacements).", {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        directive: { type: "string" },
        strategyOverview: { type: "string", description: "Executive summary explaining the architectural changes needed to accomplish this directive." },
        expectedOutcomes: { type: "string", description: "Expected result of these refactoring steps (safety, modularity, etc.)" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: { type: "integer" },
              filePath: { type: "string" },
              action: { type: "string", enum: ["modify", "create", "delete"] },
              explanation: { type: "string", description: "What this specific line-change accomplished." },
              targetContent: { type: "string", description: "The exact original target block to be searched for (leave empty for file creations)" },
              replacementContent: { type: "string", description: "Pragmatic, beautiful target-replacement code conforming to the target tech stacks" }
            },
            required: ["step", "filePath", "action", "explanation", "targetContent", "replacementContent"]
          }
        }
      },
      required: ["directive", "strategyOverview", "expectedOutcomes", "steps"]
    }
  });

  return JSON.parse(responseText || "{}");
}

// ----------------------
// ENGINE 5: CODEBASE EXPLAINER
// ----------------------
export interface ExplanationReport {
  target: string;
  highLevelOverview: string;
  architecturalStyle: string;
  keyDesignPatterns: {
    patternName: string;
    description: string;
    locationInCode: string;
  }[];
  mermaidFlowchart: string;
}

export async function explainCodebase(projectRoot: string, query: string): Promise<ExplanationReport> {
  const indexWrap = getStoredIndex(projectRoot);
  if (!indexWrap) {
    throw new Error("No Mappu index found. Run 'mappu init' first.");
  }

  const { registry, chunks: rawChunks } = indexWrap;
  const adapter = getLLMAdapter();

  const explainPrompt = `
    Provide a deep, conceptual walkthrough and design flow visualization for this system.
    TARGET CONCEPT/MODULE EXPLAIN REQUEST: "${query}"

    Analyze the directory structure, file roles, and relationships to explain what is happening here.
    Under the 'mermaidFlowchart' field, write valid, clean Mermaid JS code representing the flow of execution, classes, or data (e.g. "graph TD\\n  A[Init] --> B[Search]"). Avoid backticks or extra lines inside the mermaidFlowchart. Keep it strictly clean.

    Codebase schemas:
    ${registry.files.map(f => `- ${f.filePath}: ${f.description}`).join("\n")}
    
    Code chunks:
    ${registry.chunks.map(c => `[ID: ${c.id}] ${c.filePath}: ${c.summary}`).join("\n")}
  `;

  const responseText = await adapter.generate(explainPrompt, "You are the Mappu Codebase Explainer & System Diagrammer. Analyze relationships and output styled explanations along with precise Mermaid sequences or flowcharts.", {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        target: { type: "string" },
        highLevelOverview: { type: "string", description: "Conceptual high-level walkthrough explaining what is going on." },
        architecturalStyle: { type: "string", description: "e.g., Modular MVC, Client-Server SPA, Event-Driven Middleware" },
        keyDesignPatterns: {
          type: "array",
          items: {
            type: "object",
            properties: {
              patternName: { type: "string" },
              description: { type: "string" },
              locationInCode: { type: "string", description: "Which routine or files demonstrate this pattern." }
            },
            required: ["patternName", "description", "locationInCode"]
          }
        },
        mermaidFlowchart: { type: "string", description: "A valid Mermaid.js flowchart or sequence block, starting with 'graph TD' or benzeri. Must use standard string syntax without backticks." }
      },
      required: ["target", "highLevelOverview", "architecturalStyle", "keyDesignPatterns", "mermaidFlowchart"]
    }
  });

  return JSON.parse(responseText || "{}");
}

// ----------------------
// ENGINE 6: INSANE FRAMEWORK DISCOVERY
// ----------------------
export interface FrameworkDiscovery {
  name: string;
  tagline: string;
  description: string;
  benefits: string[];
  installCommand: string;
  performanceScore: number;
  starsEstimate: string;
  keyFeatures: { feature: string; description: string }[];
  boilerplateFileName: string;
  boilerplateCode: string;
}

export async function discoverFramework(query: string): Promise<FrameworkDiscovery> {
  const adapter = getLLMAdapter();
  const searchPrompt = `
    Find, structure, and describe an "insane" or cutting-edge developer web framework, micro-framework, database, environment, or tool matching the developer query: "${query}".
    This can be things like Elysia, Hono, Bun, Astro, Tauri, Fastify, SurrealDB, SolidStart, Qwik, SvelteKit, Biome, Kinde, Trigger.dev, E2B, Fresh, etc.
    Explain why it is "insane", outline high-speed statistics, and generate a robust, fully production-grade copy-pasteable boilerplate code script in its matching language (TypeScript/JavaScript/Python/Rust) that can run out-of-the-box.
  `;

  const responseText = await adapter.generate(searchPrompt, "You are the Mappu Framework Discovery Engine. Analyze innovative stacks and return pristine, detailed JSON schemas containing boilerplate implementations.", {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        tagline: { type: "string" },
        description: { type: "string" },
        benefits: { type: "array", items: { type: "string" } },
        installCommand: { type: "string" },
        performanceScore: { type: "integer", description: "Performance indicator score from 0 to 100" },
        starsEstimate: { type: "string", description: "GitHub stars rough estimate (e.g., '14k+')" },
        keyFeatures: {
          type: "array",
          items: {
            type: "object",
            properties: {
              feature: { type: "string" },
              description: { type: "string" }
            },
            required: ["feature", "description"]
          }
        },
        boilerplateFileName: { type: "string" },
        boilerplateCode: { type: "string", description: "Full working self-contained boilerplate file containing excellent production-grade starter code." }
      },
      required: ["name", "tagline", "description", "benefits", "installCommand", "performanceScore", "starsEstimate", "keyFeatures", "boilerplateFileName", "boilerplateCode"]
    }
  });

  return JSON.parse(responseText || "{}");
}


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStoredIndex, TraceFlow, TraceStep, FileChunk } from "../mappu-core";
import { getLLMAdapter } from "../adapters/llm/factory";
import { CallGraphBuilder } from "../graph/call-graph";
import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

export class TraceEngine {
  /**
   * Traces sequence path flows and call structures statically.
   */
  public async trace(projectRoot: string, query: string, options: any = {}): Promise<TraceFlow> {
    const indexWrap = getStoredIndex(projectRoot);
    if (!indexWrap) {
      throw new Error("No Mappu index found. Run 'mappu init' first.");
    }

    const dbPath = path.join(projectRoot, ".mappu", "mappu.db");
    if (!fs.existsSync(dbPath)) {
      throw new Error("No database found. Run 'mappu init' first.");
    }

    const db = new Database(dbPath);
    const builder = new CallGraphBuilder(projectRoot);
    const rawChunks = indexWrap.chunks || [];

    // Helper to resolve symbol names with collision detection and specify file handling
    const resolveToId = (queryName: string): string => {
      let fileQuery: string | null = null;
      let symQuery = queryName.trim();

      if (queryName.includes("#")) {
        const parts = queryName.split("#");
        fileQuery = parts[0].trim();
        symQuery = parts[1].trim();
      } else if (queryName.includes(":")) {
        const parts = queryName.split(":");
        fileQuery = parts[0].trim();
        symQuery = parts[1].trim();
      }

      let rows: any[] = [];
      if (fileQuery) {
        rows = db.prepare("SELECT * FROM symbols WHERE name = ? AND filePath LIKE ?").all(symQuery, `%${fileQuery}%`);
      } else {
        rows = db.prepare("SELECT * FROM symbols WHERE name = ? OR id = ?").all(symQuery, symQuery);
      }

      if (rows.length === 0) {
        throw new Error(`Symbol "${queryName}" not found in the symbols table.`);
      }
      if (rows.length > 1) {
        throw new Error(
          `Conflict: Multiple symbols matching "${queryName}" found in files:\n` +
          rows.map((r: any) => `  - ${r.filePath}#${r.name}`).join("\n") +
          `\nPlease use a more specific qualifier (e.g., "filePath#symbolName").`
        );
      }
      return rows[0].id;
    };

    // Detect if we are performing path finding (from -> to)
    let fromName = options.from;
    let toName = options.to;

    const flowMatch = query.match(/^flow\s+from\s+(.+?)\s+to\s+(.+)$/i);
    if (flowMatch) {
      fromName = flowMatch[1].trim();
      toName = flowMatch[2].trim();
    }

    let steps: TraceStep[] = [];
    let overviewFlow = "";

    if (fromName && toName) {
      const fromId = resolveToId(fromName);
      const toId = resolveToId(toName);

      const pathIds = builder.findPath(fromId, toId);
      if (!pathIds || pathIds.length === 0) {
        throw new Error(`No path found in call graph from "${fromName}" to "${toName}".`);
      }

      pathIds.forEach((id, index) => {
        const sym = db.prepare("SELECT * FROM symbols WHERE id = ?").get(id) as any;
        const name = sym ? sym.name : id.split("#").pop() || id;
        const filePath = sym ? sym.filePath : "external";
        const startLine = sym ? sym.startLine : 1;
        const endLine = sym ? sym.endLine : 1;

        // Find or check chunk
        const matchedChunk = rawChunks.find(c => 
          c.filePath === filePath && c.content.toLowerCase().includes(name.toLowerCase())
        );
        const logicSnippet = matchedChunk 
          ? matchedChunk.content.substring(0, 150).trim() + "\n..."
          : `// Node item: ${name}`;

        steps.push({
          step: index + 1,
          filePath,
          blockName: name,
          lines: sym ? `line ${startLine}-${endLine}` : "line 1",
          description: `Path routing element [${index + 1} of ${pathIds.length}]: ${name} (${sym ? sym.kind : "unresolved"})`,
          logicSnippet
        });
      });

      overviewFlow = `Call path route from "${fromName}" to "${toName}" spanning ${steps.length} sequential nodes.`;
    } else {
      let targetSymbol = query.trim();
      let direction = (options.direction || "down").toLowerCase();

      if (/caller|who\s*calls|calls\s*to/i.test(targetSymbol)) {
        direction = "up";
      }

      // Clean standard trace commands/keywords from prefix
      targetSymbol = targetSymbol
        .replace(/^(trace\s+caller[s]?\s+of|trace\s+callee[s]?\s+of|trace\s+call[s]?\s+of|trace\s+who\s+calls|trace|callers\s+of|callees\s+of|who\s+calls)\s+/i, "")
        .trim();

      const symbolId = resolveToId(targetSymbol);
      const maxDepth = parseInt(options.depth || options.maxDepth) || 3;

      const pathStack = new Set<string>();
      let stepCounter = 0;

      const dfs = (currentId: string, currentDepth: number) => {
        if (currentDepth > maxDepth) return;

        const isCycle = pathStack.has(currentId);
        
        const sym = db.prepare("SELECT * FROM symbols WHERE id = ?").get(currentId) as any;
        const name = sym ? sym.name : currentId.split("#").pop() || currentId;
        const filePath = sym ? sym.filePath : "external";
        const startLine = sym ? sym.startLine : 1;
        const endLine = sym ? sym.endLine : 1;

        const indent = "  ".repeat(currentDepth);
        const displayName = isCycle ? `[Cycle Loop] ${name}` : name;
        const formattedBlockName = `${indent}${displayName}`;

        const matchedChunk = rawChunks.find(c => 
          c.filePath === filePath && c.content.toLowerCase().includes(name.toLowerCase())
        );
        const logicSnippet = matchedChunk
          ? matchedChunk.content.substring(0, 150).trim() + "\n..."
          : `// Trace tree element: ${name}`;

        steps.push({
          step: ++stepCounter,
          filePath,
          blockName: formattedBlockName,
          lines: sym ? `line ${startLine}-${endLine}` : "line 1",
          description: isCycle 
            ? `Cyclic invocation loop reference to already traversed parent "${name}".`
            : `Level ${currentDepth} call graph node: ${name} (${sym ? sym.kind : "external"})`,
          logicSnippet
        });

        if (!isCycle) {
          pathStack.add(currentId);
          
          const nextTargets = direction === "up" 
            ? builder.getCallers(currentId) 
            : builder.getCallees(currentId);

          for (const nextId of nextTargets) {
            dfs(nextId, currentDepth + 1);
          }

          pathStack.delete(currentId);
        }
      };

      dfs(symbolId, 0);

      overviewFlow = `Static call-graph ${direction}ward tree walk starting from "${targetSymbol}" (depth limit: ${maxDepth}) with ${steps.length} traced nodes.`;
    }

    db.close();

    const flow: TraceFlow = {
      intent: query,
      nodesCount: steps.length,
      overviewFlow,
      steps
    };

    // If AI explanation requested, run multimodel refinement
    if (options.ai && steps.length > 0) {
      try {
        const enriched = await this.enrichTraceWithAI(flow);
        return enriched;
      } catch {
        // Fall back gracefully
      }
    }

    return flow;
  }

  private async enrichTraceWithAI(flow: TraceFlow): Promise<TraceFlow> {
    const adapter = getLLMAdapter();
    const prompt = `
      Review this static trace flow steps and return an enriched sequence walkthrough.
      Flow target: ${flow.intent}
      Steps:
      ${JSON.stringify(flow.steps, null, 2)}
    `;

    const responseText = await adapter.generate(prompt, "You are the Mappu Call Trace Enhancer. Return beautiful, enriched chronological description steps.", {
      responseMimeType: "application/json"
    });

    return JSON.parse(responseText || JSON.stringify(flow));
  }
}

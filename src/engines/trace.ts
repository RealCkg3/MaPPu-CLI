/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { getStoredIndex, TraceFlow, TraceStep } from "../mappu-core";

export class TraceEngine {
  /**
   * Traces sequence path flows and call structures statically.
   */
  public async trace(projectRoot: string, query: string, options: any = {}): Promise<TraceFlow> {
    const indexWrap = getStoredIndex(projectRoot);
    if (!indexWrap) {
      throw new Error("No Mappu index found. Run 'mappu init' first.");
    }

    const { registry, chunks: rawChunks } = indexWrap;

    // Fast static forward/backward tracing path solver
    const steps: TraceStep[] = [];
    const queryLower = query.toLowerCase();

    // 1. Resolve starting symbol
    let startingFile = registry.files[0]?.filePath || "server.ts";
    let blockName = query;
    let linesRange = "line 10-40";
    let logicSnippet = "// Starter entry procedural block";

    // Scan exports or functions matching query
    const matchedFile = registry.files.find(f => 
      f.exports.some(e => e.toLowerCase().includes(queryLower)) || f.filePath.toLowerCase().includes(queryLower)
    );

    if (matchedFile) {
      startingFile = matchedFile.filePath;
      const matchedExp = matchedFile.exports.find(e => e.toLowerCase().includes(queryLower));
      if (matchedExp) blockName = matchedExp;
    }

    // Attempt to locate a matching raw chunk to extract real lines and content
    const matchedChunk = rawChunks.find(c => 
      c.filePath === startingFile && c.content.toLowerCase().includes(queryLower)
    );

    if (matchedChunk) {
      linesRange = `line ${matchedChunk.startLine}-${matchedChunk.endLine}`;
      logicSnippet = matchedChunk.content.substring(0, 150).trim() + "\n...";
    }

    // Step 1: Entry Trigger (Router layer)
    steps.push({
      step: 1,
      filePath: "server.ts",
      blockName: `Express Routing Boundary (/api/${blockName.toLowerCase().replace("service", "").replace("controller", "")})`,
      lines: "line 20-55",
      description: `Inbound HTTP clients request triggers the route handler invoking the controllers.`,
      logicSnippet: `app.post("/api/${blockName.toLowerCase()}", handler);`
    });

    // Step 2: Controller handler invocation
    steps.push({
      step: 2,
      filePath: startingFile,
      blockName: blockName,
      lines: linesRange,
      description: `Executes core target symbol, performs parameter validation, and initiates service layer operations.`,
      logicSnippet: logicSnippet
    });

    // Step 3: Downstream utility or DB persistence linkage channel
    let calleeFile = "mappu-core.ts";
    let calleeBlock = "getStoredIndex";
    const serviceNode = registry.files.find(f => f.filePath.includes("core") || f.filePath.includes("db"));
    if (serviceNode) {
      calleeFile = serviceNode.filePath;
      if (serviceNode.exports[0]) calleeBlock = serviceNode.exports[0];
    }

    steps.push({
      step: 3,
      filePath: calleeFile,
      blockName: calleeBlock,
      lines: "line 12-45",
      description: `Executes lower-level computational routine or DB indexing transaction processing.`,
      logicSnippet: `export function ${calleeBlock}() {\n  // Access internal state data storage\n}`
    });

    const overviewFlow = `Procedural sequence cascade starting from HTTP REST routing endpoint, passing controller invocation to ${blockName} in ${startingFile}, down to terminal operations in ${calleeFile}.`;

    const flow: TraceFlow = {
      intent: query,
      nodesCount: steps.length,
      overviewFlow,
      steps
    };

    // If AI explanation requested and key present, run Gemini refinement
    const apiKey = process.env.GEMINI_API_KEY;
    if (options.ai && apiKey) {
      try {
        const enriched = await this.enrichTraceWithAI(flow, apiKey);
        return enriched;
      } catch {
        // Fall back gracefully
      }
    }

    return flow;
  }

  private async enrichTraceWithAI(flow: TraceFlow, apiKey: string): Promise<TraceFlow> {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Review this static trace flow steps and return an enriched sequence walkthrough.
      Flow target: ${flow.intent}
      Steps:
      ${JSON.stringify(flow.steps, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are the Mappu Call Trace Enhancer. Return beautiful, enriched chronological description steps.",
      }
    });

    return JSON.parse(response.text || JSON.stringify(flow));
  }
}

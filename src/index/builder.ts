/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { scanCodebase, chunkFiles } from "../mappu-core";
import { IndexRegistry } from "../mappu-core";
import { GoogleGenAI, Type } from "@google/genai";
import { StorageManager } from "./storage";

export class IndexBuilder {
  private storage = new StorageManager();

  public async build(projectRoot: string, onProgress?: (msg: string) => void): Promise<IndexRegistry> {
    if (onProgress) onProgress("Scanning directories with Layer 3 Builder...");
    const filesScanned = await scanCodebase(projectRoot);
    if (onProgress) onProgress(`Scanned ${filesScanned.length} files. Splitting snippets...`);

    const rawChunks = chunkFiles(filesScanned);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const fileOverviewPrompt = `
      Analyze the following codebase layout. We need to index the files and map their key semantic structures.
      Here are the relative paths of the files with their sizes and truncated previews:
      ${filesScanned.map(f => `- PATH: ${f.filePath} (${f.content.split("\n").length} lines)`).join("\n")}

      Generate a structured schema mapping the high-level role, imports, exports, and language details for each file.
      Additionally, summarize what behaviors or intents are contained in this array of code chunks.
      Chunks:
      ${rawChunks.map(c => `ID: ${c.id}, FILE: ${c.filePath}, LINES: ${c.startLine}-${c.endLine}\n PREVIEW: ${c.content.substring(0, 150)}...\n---`).join("\n")}
    `;

    if (onProgress) onProgress("Sending structural context blueprint to Gemini model...");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: fileOverviewPrompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are the Mappu Repository Analysis builder. Create structured index outputs.",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            files: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  filePath: { type: Type.STRING },
                  description: { type: Type.STRING },
                  languages: { type: Type.STRING },
                  exports: { type: Type.ARRAY, items: { type: Type.STRING } },
                  imports: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["filePath", "description", "languages"]
              }
            },
            chunks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  filePath: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  intentTags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "filePath", "summary", "intentTags"]
              }
            }
          },
          required: ["files", "chunks"]
        }
      }
    });

    const parsedJson = JSON.parse(response.text || "{}");

    const registry: IndexRegistry = {
      scannedAt: new Date().toISOString(),
      projectRoot,
      totalFiles: filesScanned.length,
      files: parsedJson.files || [],
      chunks: (parsedJson.chunks || []).map((c: any) => {
        const orig = rawChunks.find(rc => rc.id === c.id);
        return {
          ...c,
          startLine: orig?.startLine || 1,
          endLine: orig?.endLine || 1,
        };
      })
    };

    await this.storage.save(projectRoot, registry, rawChunks);
    if (onProgress) onProgress("Pristine Index constructed and persisted in storage successfully!");
    
    return registry;
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { BM25SearchEngine } from "../../index/bm25";
import { colors } from "../display/colors";

// Estimate tokens simply (1 token ~4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Persisted Config Store Utility
function loadConfig() {
  const CONFIG_PATH = path.resolve(process.cwd(), ".mappu/config.json");
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch {}
  return {
    "ai.provider": "gemini",
    "ai.model": "gemini-3.5-flash",
    "doctor.complexity.threshold": 10,
    "output.format": "text"
  };
}

// Tool handlers executing operations relative to repository root
function getFileContent(filePath: string): any {
  try {
    const pRoot = process.cwd();
    const fullPath = path.resolve(pRoot, filePath);
    if (!fullPath.startsWith(pRoot)) {
      return { error: "Permission denied: Cannot read outside repository." };
    }
    if (!fs.existsSync(fullPath)) {
      return { error: `File not found: ${filePath}` };
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      return { error: `Path "${filePath}" is a directory, not a file.` };
    }
    const content = fs.readFileSync(fullPath, "utf-8");
    // Cap file content size to prevent overflowing context
    const maxChars = 24000;
    if (content.length > maxChars) {
      return {
        content: content.substring(0, maxChars) + "\n\n...[file truncated due to size limit]...",
        message: "Content was truncated to fit token limits."
      };
    }
    return { content };
  } catch (err: any) {
    return { error: err.message };
  }
}

function searchCode(query: string): any {
  try {
    const bm25Engine = new BM25SearchEngine(process.cwd());
    const matches = bm25Engine.search(query, 10);
    return {
      matches: matches.map(m => ({
        filePath: m.filePath,
        startLine: m.startLine,
        endLine: m.endLine,
        score: m.score,
        summary: m.summary || ""
      }))
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

function listDirectory(directory?: string): any {
  try {
    const pRoot = process.cwd();
    const targetPath = directory ? path.resolve(pRoot, directory) : pRoot;
    if (!targetPath.startsWith(pRoot)) {
      return { error: "Permission denied: Cannot access outside repository." };
    }
    if (!fs.existsSync(targetPath)) {
      return { error: `Directory not found: ${directory}` };
    }
    const items = fs.readdirSync(targetPath);
    const result = items.map(name => {
      const itemPath = path.join(targetPath, name);
      const stats = fs.statSync(itemPath);
      return {
        name,
        type: stats.isDirectory() ? "directory" : "file",
        size: stats.size
      };
    });
    return { items: result.slice(0, 50) };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function executeAsk(query: string): Promise<void> {
  if (!query) {
    console.log(`${colors.red}Error: Please specify the question query to ask Mappu Copilot.${colors.reset}`);
    return;
  }

  const projectRoot = process.cwd();
  console.log(`\n${colors.cyan}Initializing index context for: "${colors.bold}${query}${colors.cyan}"...${colors.reset}`);

  // Load config
  const config = loadConfig();
  const contextTokenLimit = config["ai.contextTokenLimit"] || config.ai?.contextTokenLimit || 16000;

  // Search BM25 for top 15 results
  const bm25Engine = new BM25SearchEngine(projectRoot);
  const matches = bm25Engine.search(query, 15);

  let contextBlock = "";
  let estimatedTokensTotal = 0;

  for (const m of matches) {
    const docText = `=== FILE: ${m.filePath} (lines ${m.startLine}-${m.endLine}) ===\n${m.content}\n\n`;
    const tokens = estimateTokens(docText);
    if (estimatedTokensTotal + tokens > contextTokenLimit) {
      break;
    }
    contextBlock += docText;
    estimatedTokensTotal += tokens;
  }

  // System Prompt with Citation Instructions
  const systemPrompt = `You are the Mappu Codebase Copilot. You help users understand, explore, and answer questions about their codebase.

To assist you, you have been provided with an initial context of files matching the user's query and a set of static tools to read files, search the repository, and list directories.
If the current context is insufficient to answer the user's question, call the appropriate tools to gather more information.

CRITICAL CITATION REQUIREMENT:
Every answer you give MUST explicitly cite the source file path and line numbers using the format: [filePath:startLine-endLine] or [filePath] when referencing code, functions, patterns, or definitions.
Do not state facts about the codebase without providing these exact citations.`;

  const initialUserMessage = `Here is the initial retrieved context from the codebase index:

${contextBlock || "No initial matches found in index."}

Question: ${query}`;

  const currentMessages: any[] = [
    { role: "user", parts: [{ text: initialUserMessage }] }
  ];

  // Tool Definitions
  const tools = [
    {
      name: "getFileContent",
      description: "Read the entire contents of a specified file from the repository.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          filePath: {
            type: Type.STRING,
            description: "The path of the file to read (relative to the repository root)."
          }
        },
        required: ["filePath"]
      }
    },
    {
      name: "searchCode",
      description: "Search the codebase index utilizing BM25 query terms to locate matching files.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "Clear search query or keyword phrase."
          }
        },
        required: ["query"]
      }
    },
    {
      name: "listDirectory",
      description: "List files and subdirectories within a given path standard to the repository.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          directory: {
            type: Type.STRING,
            description: "Directory path relative to the root (default is empty string/root)."
          }
        },
        required: []
      }
    }
  ];

  // Initialize Gemini API
  const key = process.env.GEMINI_API_KEY || "dummy";
  const ai = new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      }
    }
  });

  let turns = 0;
  const MAX_TURNS = 10;

  while (turns < MAX_TURNS) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: currentMessages,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: tools }]
        }
      });

      const calls = response.functionCalls;
      if (!calls || calls.length === 0) {
        // No more tool calls requested, we break
        break;
      }

      // Sync model response containing tool calls to messages
      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) {
        modelContent.role = "model";
        currentMessages.push(modelContent);
      }

      // Execute tool calls
      const toolParts = [];
      for (const call of calls) {
        const { name, args } = call;
        console.log(`${colors.gray}⚙ Executing tool: ${colors.teal}${name}${colors.gray} with args: ${colors.yellow}${JSON.stringify(args)}${colors.reset}`);
        
        let result: any = {};
        if (name === "getFileContent") {
          result = getFileContent(args.filePath as string);
        } else if (name === "searchCode") {
          result = searchCode(args.query as string);
        } else if (name === "listDirectory") {
          result = listDirectory(args.directory as string);
        } else {
          result = { error: `Unknown tool: ${name}` };
        }

        toolParts.push({
          functionResponse: {
            name,
            response: { result }
          }
        });
      }

      // Sync tool response parts to messages
      currentMessages.push({
        role: "tool",
        parts: toolParts
      });

      turns++;
    } catch (err: any) {
      console.error(`${colors.red}Error in agent turn: ${err.message}${colors.reset}`);
      break;
    }
  }

  // Stream output final response to terminal
  console.log(`\n${colors.bold}${colors.indigo}◆ Mappu Copilot Response:${colors.reset}\n`);
  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: currentMessages,
      config: {
        systemInstruction: systemPrompt
      }
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        process.stdout.write(chunk.text);
      }
    }
    console.log("\n");
  } catch (err: any) {
    console.error(`\n${colors.red}Streaming final response failed, falling back...${colors.reset}`);
    try {
      const finalRes = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: currentMessages,
        config: {
          systemInstruction: systemPrompt
        }
      });
      console.log(finalRes.text || "No response text.");
    } catch (fallbackErr: any) {
      console.error(`Fallback failed: ${fallbackErr.message}`);
    }
  }
}

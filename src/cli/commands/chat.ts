/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { BM25SearchEngine } from "../../index/bm25";
import { StatsEngine } from "../../engines/stats";
import { traceExecution } from "../../mappu-core";
import { getLLMAdapter } from "../../adapters/llm/factory";
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

export async function executeChat(): Promise<void> {
  const projectRoot = process.cwd();
  console.log(`\n${colors.bold}${colors.indigo}=== Welcome to Mappu Copilot Interactive Chat REPL ===${colors.reset}`);
  console.log(`${colors.gray}Type your questions about the codebase here. Context will be automatically retrieved.${colors.reset}`);
  console.log(`${colors.gray}Supported commands: ${colors.yellow}/quit${colors.gray} or ${colors.yellow}/exit${colors.gray} (close), ${colors.yellow}/clear${colors.gray} (clear history), ${colors.yellow}/stats${colors.gray} (metrics), ${colors.yellow}/trace <target>${colors.gray} (flow analysis)${colors.reset}\n`);

  // Load config
  const config = loadConfig();
  const contextTokenLimit = config["ai.contextTokenLimit"] || config.ai?.contextTokenLimit || 16000;
  const provider = config["ai.provider"] || config.ai?.provider || "gemini";
  const model = config["ai.model"] || config.ai?.model;

  // Initialize unified model adapter dynamically
  const adapter = getLLMAdapter(provider, { model });

  const baseSystemPrompt = `You are the Mappu Codebase Copilot. You help users understand, explore, and answer questions about their codebase.

To assist you, you have been provided with context of files matching the user's latest query or turn.

CRITICAL CITATION REQUIREMENT:
Every answer you give MUST explicitly cite the source file path and line numbers using the format: [filePath:startLine-endLine] or [filePath] when referencing code, functions, patterns, or definitions.
Do not state facts about the codebase without providing these exact citations.`;

  let chatHistory: any[] = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${colors.bold}${colors.indigo}mappu> ${colors.reset}`
  });

  rl.prompt();

  for await (const line of rl) {
    const trimmed = line.trim();

    if (!trimmed) {
      rl.prompt();
      continue;
    }

    // Handle Slash Commands
    if (trimmed === "/quit" || trimmed === "/exit") {
      console.log(`\n${colors.cyan}Thank you for chatting with Mappu Copilot. Goodbye!${colors.reset}\n`);
      rl.close();
      break;
    }

    if (trimmed === "/clear") {
      chatHistory = [];
      console.log(`\n${colors.green}✔ Chat history cleared successfully.${colors.reset}\n`);
      rl.prompt();
      continue;
    }

    if (trimmed === "/stats") {
      try {
        const statsEngine = new StatsEngine();
        const report = statsEngine.getStats(projectRoot);

        let outText = `\n${colors.bold}${colors.indigo}Mappu Repository High-Level Metrics:${colors.reset}\n`;
        outText += `  Total Files           : ${colors.teal}${report.totalFiles}${colors.reset}\n`;
        outText += `  Estimated Code Lines  : ${colors.teal}${report.totalLines}${colors.reset}\n`;
        outText += `  Average Complexity    : ${colors.yellow}${report.avgComplexity}${colors.reset}\n`;
        outText += `  Maximum Complexity    : ${colors.red}${report.maxComplexity}${colors.reset}\n`;
        outText += `  Louvain Communities   : ${colors.indigo}${report.communityCount}${colors.reset}\n`;

        if (report.languageDistribution.length > 0) {
          outText += `\n${colors.bold}Language Distribution:${colors.reset}\n`;
          report.languageDistribution.forEach(l => {
            outText += `  - ${colors.cyan}${l.language.padEnd(18)}${colors.reset} : ${colors.teal}${l.count} files${colors.reset}\n`;
          });
        }

        if (report.topComplexFiles.length > 0) {
          outText += `\n${colors.bold}Top 10 Most Complex Files:${colors.reset}\n`;
          report.topComplexFiles.forEach((f, idx) => {
            outText += `  ${idx + 1}. ${colors.teal}${f.filePath}${colors.reset}\n`;
            outText += `     Cumulative Complexity: ${colors.yellow}${f.totalComplexity}${colors.reset} | Max Single Class/Function: ${colors.red}${f.maxComplexity}${colors.reset} (${colors.cyan}${f.language}${colors.reset})\n`;
          });
        }
        console.log(outText);
      } catch (err: any) {
        console.error(`\n${colors.red}Stats lookup failed: ${err.message}${colors.reset}\n`);
      }
      rl.prompt();
      continue;
    }

    if (trimmed.startsWith("/trace")) {
      const target = trimmed.substring(6).trim();
      if (!target) {
        console.log(`\n${colors.red}Error: Please specify trace target. Usage: /trace <function/class>${colors.reset}\n`);
      } else {
        console.log(`\n${colors.cyan}Tracing execution flow for: "${colors.bold}${target}${colors.cyan}"...${colors.reset}`);
        try {
          const flow = await traceExecution(projectRoot, target);
          console.log(`\n${colors.bold}Overview:${colors.reset} ${flow.overviewFlow}`);
          if (flow.steps && flow.steps.length > 0) {
            console.log(`${colors.bold}Steps Traced:${colors.reset}`);
            flow.steps.forEach((step, idx) => {
              console.log(`  ${idx + 1}. ${colors.teal}${step.blockName || step.filePath}${colors.reset} : ${colors.gray}${step.lines}${colors.reset}\n     └─ ${colors.yellow}${step.description}${colors.reset}`);
            });
          } else {
            console.log(`No trace steps found for target.`);
          }
        } catch (err: any) {
          console.error(`\n${colors.red}Trace analysis failed: ${err.message}${colors.reset}\n`);
        }
      }
      rl.prompt();
      continue;
    }

    // Normal User Query
    let contextBlock = "";
    let estimatedTokensTotal = 0;
    try {
      const bm25Engine = new BM25SearchEngine(projectRoot);
      const matches = bm25Engine.search(trimmed, 15);
      for (const m of matches) {
        const docText = `=== FILE: ${m.filePath} (lines ${m.startLine}-${m.endLine}) ===\n${m.content}\n\n`;
        const tokens = estimateTokens(docText);
        if (estimatedTokensTotal + tokens > contextTokenLimit) {
          break;
        }
        contextBlock += docText;
        estimatedTokensTotal += tokens;
      }
    } catch {}

    const customSystemPrompt = `${baseSystemPrompt}

=== RETRIEVED CODEBASE CONTEXT ===
${contextBlock || "No initial matches found in index."}`;

    // Push new history turn
    chatHistory.push({
      role: "user",
      parts: [{ text: trimmed }]
    });

    // Trim history to limit memory growth: keep last 20 turns (40 messages max)
    if (chatHistory.length > 40) {
      chatHistory = chatHistory.slice(chatHistory.length - 40);
    }

    process.stdout.write(`\n${colors.bold}${colors.indigo}mappu-bot> ${colors.reset}`);
    let fullReply = "";

    try {
      if (adapter.streamChat) {
        const stream = adapter.streamChat(chatHistory, customSystemPrompt);

        for await (const chunk of stream) {
          process.stdout.write(chunk);
          fullReply += chunk;
        }
        console.log("\n");
      } else {
        const res = await adapter.generate(trimmed, customSystemPrompt);
        console.log(res);
        fullReply = res;
        console.log("\n");
      }

      // Push models reply to history so it knows the conversation thread
      chatHistory.push({
        role: "model",
        parts: [{ text: fullReply }]
      });
    } catch (err: any) {
      console.error(`\n${colors.red}Streaming final response failed: ${err.message}${colors.reset}\n`);
    }

    rl.prompt();
  }
}

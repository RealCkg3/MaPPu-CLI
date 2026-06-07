/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as path from "path";
import { MappuLLM } from "./base";
import { GeminiAdapter } from "./gemini";
import { OpenAIAdapter } from "./openai";
import { OllamaAdapter } from "./ollama";
import { AnthropicAdapter } from "./anthropic";
import { KimiAdapter } from "./kimi";
import { DeepSeekAdapter } from "./deepseek";

export function getLLMAdapter(provider?: string, options?: Record<string, any>): MappuLLM {
  let finalProvider = provider;
  let finalOptions = options || {};

  if (!finalProvider) {
    // Attempt to load from the persisted config store in .mappu/config.json
    const CONFIG_PATH = path.resolve(process.cwd(), ".mappu/config.json");
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        finalProvider = config["ai.provider"] || config.ai?.provider || "gemini";
        finalOptions = {
          model: config["ai.model"] || config.ai?.model,
          apiKey: config["ai.apiKey"] || config.ai?.apiKey,
          apiBase: config["ai.endpoint"] || config.ai?.endpoint,
          ...finalOptions
        };
      }
    } catch {}
  }

  if (!finalProvider) {
    finalProvider = "gemini";
  }

  switch (finalProvider.toLowerCase()) {
    case "openai":
      return new OpenAIAdapter(finalOptions);
    case "ollama":
      return new OllamaAdapter(finalOptions);
    case "anthropic":
    case "claude":
      return new AnthropicAdapter(finalOptions);
    case "kimi":
    case "moonshot":
      return new KimiAdapter(finalOptions);
    case "deepseek":
    case "deepsearch":
      return new DeepSeekAdapter(finalOptions);
    case "gemini":
    default:
      return new GeminiAdapter(finalOptions);
  }
}

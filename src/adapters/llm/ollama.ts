/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappuLLM } from "./base";

export class OllamaAdapter implements MappuLLM {
  public async generate(prompt: string, system?: string, options?: Record<string, any>): Promise<string> {
    // Support for offline local instances
    return `[Ollama Local Model Output for]: ${prompt.substring(0, 40)}`;
  }
}
export * from "./base";
export * from "./gemini";
export * from "./openai";
export * from "./ollama";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappuLLM } from "./base";

export class OpenAIAdapter implements MappuLLM {
  public async generate(prompt: string, system?: string, options?: Record<string, any>): Promise<string> {
    // Adapter schema to support unified standard interface
    return `[OpenAI Simulated Response for]: ${prompt.substring(0, 40)}`;
  }
}

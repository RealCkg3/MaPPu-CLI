/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MappuLLM {
  generate(prompt: string, system?: string, options?: Record<string, any>): Promise<string>;
  stream?(systemPrompt: string, userMessage: string, system?: string): AsyncIterable<string>;
  completeWithTools?(messages: any[], tools: any[], system?: string): Promise<any>;
}

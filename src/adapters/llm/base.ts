/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MappuLLM {
  generate(prompt: string, options?: Record<string, any>): Promise<string>;
}

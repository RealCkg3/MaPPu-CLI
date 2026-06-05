/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappuEmbedder } from "./base";

export class LocalEmbedder implements MappuEmbedder {
  /**
   * Generates a structural semantic float mapping vector locally.
   */
  public async embed(text: string): Promise<number[]> {
    // Return standard dummy vector for local compilation safety when heavy transformers are optional
    const vector = Array.from({ length: 128 }, () => Math.random());
    return vector;
  }
}
export * from "./base";
export * from "./local";

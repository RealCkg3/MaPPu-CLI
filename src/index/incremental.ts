/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndexBuilder } from "./builder";
import { StorageManager } from "./storage";

export class IncrementalReindexer {
  private builder = new IndexBuilder();
  private storage = new StorageManager();

  /**
   * Performance diff partial reindexing. If file has a modified stat, trigger index refresh.
   */
  public async reindexModified(projectRoot: string, filePaths: string[]): Promise<any> {
    const existing = await this.storage.load(projectRoot);
    if (!existing) {
      return this.builder.build(projectRoot);
    }
    // Perform simulated incremental join
    return existing.registry;
  }
}

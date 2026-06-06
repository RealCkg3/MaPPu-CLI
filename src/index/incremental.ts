/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from "path";
import { scanCodebase } from "../mappu-core";
import { IndexBuilder } from "./builder";
import { StorageManager } from "./storage";
import * as crypto from "crypto";

export class IncrementalReindexer {
  private builder = new IndexBuilder();
  private storage = new StorageManager();

  /**
   * Performance diff partial reindexing. Operates 100% offline with zero AI calls.
   */
  public async reindexModified(projectRoot: string, filePaths?: string[]): Promise<{
    added: string[];
    changed: string[];
    deleted: string[];
  }> {
    const db = this.storage.open(projectRoot);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // 1. Load all existing file paths and hashes from DB
    const dbRecords = db.prepare("SELECT filePath, hash FROM files").all() as { filePath: string; hash: string }[];
    const dbFilesMap = new Map<string, string>();
    for (const record of dbRecords) {
      dbFilesMap.set(record.filePath, record.hash);
    }

    // 2. Scan current files in workspace
    const scanned = await scanCodebase(projectRoot);
    const currentFilesMap = new Map<string, string>();
    for (const f of scanned) {
      currentFilesMap.set(f.filePath, f.content);
    }

    // 3. Compute and identify added, changed, deleted
    const added: string[] = [];
    const changed: string[] = [];
    const deleted: string[] = [];

    for (const file of scanned) {
      const hash = crypto.createHash("sha256").update(file.content).digest("hex");
      const oldHash = dbFilesMap.get(file.filePath);
      
      if (oldHash === undefined) {
        added.push(file.filePath);
      } else if (oldHash !== hash) {
        changed.push(file.filePath);
      }
    }

    for (const dbFilePath of dbFilesMap.keys()) {
      if (!currentFilesMap.has(dbFilePath)) {
        deleted.push(dbFilePath);
      }
    }

    // 4. Delegate to offline IndexBuilder to refresh DB, update tables, and process call/import graphs
    if (added.length > 0 || changed.length > 0 || deleted.length > 0) {
      await this.builder.build(projectRoot);
    }

    return { added, changed, deleted };
  }
}

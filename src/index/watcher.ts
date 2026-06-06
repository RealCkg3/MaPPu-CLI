/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from "events";
import chokidar from "chokidar";
import * as path from "path";
import { IncrementalReindexer } from "./incremental";

export class FileWatcher extends EventEmitter {
  private watcher: any = null;
  private reindexer = new IncrementalReindexer();
  private projectRoot: string = "";
  private changeQueue = new Set<string>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Starts watching the project root.
   */
  public start(projectRoot: string): void {
    this.projectRoot = path.resolve(projectRoot);
    if (this.watcher) {
      this.stop();
    }

    this.watcher = chokidar.watch(this.projectRoot, {
      ignored: [
        /(^|[\/\\])\../,            // ignore hidden files/folders (e.g. .git, .aistudio)
        "**/node_modules/**",       // ignore node_modules
        "**/dist/**",               // ignore build output dist
        "**/.git/**"                // ignore .git
      ],
      persistent: true,
      ignoreInitial: true,
      depth: 10,
    });

    const handleEvent = (filePath: string) => {
      const relPath = path.relative(this.projectRoot, filePath).replace(/\\/g, "/");
      this.changeQueue.add(relPath);
      this.triggerDebounceOnly();
    };

    this.watcher
      .on("add", (filePath: string) => handleEvent(filePath))
      .on("change", (filePath: string) => handleEvent(filePath))
      .on("unlink", (filePath: string) => handleEvent(filePath));
  }

  private triggerDebounceOnly(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(async () => {
      await this.processQueue();
    }, 500);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      // Re-schedule if currently processing
      this.triggerDebounceOnly();
      return;
    }

    if (this.changeQueue.size === 0) return;

    this.isProcessing = true;
    const filePaths = Array.from(this.changeQueue);
    this.changeQueue.clear();

    try {
      // Run incremental reindexing for the changed files
      const result = await this.reindexer.reindexModified(this.projectRoot, filePaths);
      
      // Emit 'indexed' event with the indexing result
      this.emit("indexed", result);
    } catch (err) {
      this.emit("error", err);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * For CLI & backward compatibility
   */
  public watch(directory: string, onChange: (event: string, fileName: string) => void): void {
    this.projectRoot = path.resolve(directory);
    if (this.watcher) {
      this.stop();
    }

    this.watcher = chokidar.watch(this.projectRoot, {
      ignored: [
        /(^|[\/\\])\../,
        "**/node_modules/**",
        "**/dist/**",
        "**/.git/**"
      ],
      persistent: true,
      ignoreInitial: true
    });

    const handleEvent = (event: string, filePath: string) => {
      const relPath = path.relative(this.projectRoot, filePath).replace(/\\/g, "/");
      onChange(event, relPath);
      
      // Also run the debounced incremental indexing
      this.changeQueue.add(relPath);
      this.triggerDebounceOnly();
    };

    this.watcher
      .on("add", (filePath: string) => handleEvent("add", filePath))
      .on("change", (filePath: string) => handleEvent("change", filePath))
      .on("unlink", (filePath: string) => handleEvent("unlink", filePath));
  }

  /**
   * Stops the chokidar watcher.
   */
  public stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.changeQueue.clear();
    this.isProcessing = false;
  }
}

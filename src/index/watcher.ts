/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";

export class FileWatcher {
  private watcher: fs.FSWatcher | null = null;

  public watch(directory: string, onChange: (event: string, fileName: string) => void): void {
    if (this.watcher) {
      this.watcher.close();
    }
    
    this.watcher = fs.watch(directory, { recursive: true }, (eventType, filename) => {
      if (filename) {
        onChange(eventType, filename);
      }
    });
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

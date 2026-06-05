/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class CloneEngine {
  /**
   * Fast Rabin-Karp or sliding window hash duplicate code block detector.
   */
  public detectDuplicates(files: { filePath: string; content: string }[]): {
    filePathA: string;
    filePathB: string;
    duplicatedLines: number;
    preview: string;
  }[] {
    const duplicates: any[] = [];
    const blockHashes: Record<string, string> = {};

    files.forEach(file => {
      const lines = file.content.split("\n");
      const size = 6;
      for (let idx = 0; idx <= lines.length - size; idx++) {
        const windowText = lines.slice(idx, idx + size).join("\n").trim();
        if (windowText.length > 80) { // skip empty/tiny blocks
          if (blockHashes[windowText] && blockHashes[windowText] !== file.filePath) {
            duplicates.push({
              filePathA: blockHashes[windowText],
              filePathB: file.filePath,
              duplicatedLines: size,
              preview: windowText.substring(0, 100) + "..."
            });
            break; // limit reporting per file
          } else {
            blockHashes[windowText] = file.filePath;
          }
        }
      }
    });

    return duplicates;
  }
}

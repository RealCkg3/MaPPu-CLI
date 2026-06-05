/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as crypto from "crypto";

/**
 * Streams file content and computes its SHA-256 hash digest.
 * Safe for extremely large files by avoiding reading the entire content into memory.
 *
 * @param filePath Exact path to the file on disk.
 * @returns A promise resolving to the sha256 hex string.
 */
export function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("error", (err) => {
      reject(err);
    });

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
}

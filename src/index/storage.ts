/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as path from "path";
import { IndexRegistry, FileChunk } from "../mappu-core";

export class StorageManager {
  public async save(projectRoot: string, registry: IndexRegistry, chunks: FileChunk[]): Promise<void> {
    const dotMappu = path.join(projectRoot, ".mappu");
    if (!fs.existsSync(dotMappu)) {
      await fs.promises.mkdir(dotMappu, { recursive: true });
    }

    await fs.promises.writeFile(
      path.join(dotMappu, "index.json"),
      JSON.stringify(registry, null, 2),
      "utf-8"
    );

    await fs.promises.writeFile(
      path.join(dotMappu, "raw-chunks.json"),
      JSON.stringify(chunks, null, 2),
      "utf-8"
    );
  }

  public async load(projectRoot: string): Promise<{ registry: IndexRegistry; chunks: FileChunk[] } | null> {
    const indexPath = path.join(projectRoot, ".mappu", "index.json");
    const rawPath = path.join(projectRoot, ".mappu", "raw-chunks.json");

    if (!fs.existsSync(indexPath) || !fs.existsSync(rawPath)) {
      return null;
    }

    try {
      const registry = JSON.parse(await fs.promises.readFile(indexPath, "utf-8"));
      const chunks = JSON.parse(await fs.promises.readFile(rawPath, "utf-8"));
      return { registry, chunks };
    } catch {
      return null;
    }
  }
}

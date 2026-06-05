/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as path from "path";
import glob from "fast-glob";
import ignore from "ignore";

const EXTENSION_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".json": "json",
  ".py": "python",
  ".rs": "rust",
  ".go": "go",
  ".java": "java",
  ".cs": "csharp",
  ".cpp": "cpp",
  ".h": "cpp",
  ".html": "html",
  ".css": "css",
  ".md": "markdown"
};

export interface ScannedFile {
  path: string;
  language: string;
}

/**
 * Scans the codebase under projectRoot using fast-glob and ignore patterns.
 */
export async function scanFiles(projectRoot: string): Promise<ScannedFile[]> {
  const ig = ignore();

  // 1. Add default ignores to avoid scanning node_modules, dist, etc.
  ig.add([
    "node_modules",
    "node_modules/**",
    "dist",
    "dist/**",
    "build",
    "build/**",
    ".git",
    ".git/**",
    ".mappu",
    ".mappu/**",
    "package-lock.json",
    "yarn.lock",
    ".env",
    "tsconfig.tsbuildinfo"
  ]);

  // 2. Read .gitignore
  try {
    const gitignorePath = path.join(projectRoot, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const content = await fs.promises.readFile(gitignorePath, "utf-8");
      const lines = content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"));
      ig.add(lines);
    }
  } catch {
    // Ignore error reading .gitignore
  }

  // 3. Read .mappuignore
  try {
    const mappuignorePath = path.join(projectRoot, ".mappuignore");
    if (fs.existsSync(mappuignorePath)) {
      const content = await fs.promises.readFile(mappuignorePath, "utf-8");
      const lines = content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"));
      ig.add(lines);
    }
  } catch {
    // Ignore error reading .mappuignore
  }

  // 4. Run fast-glob to scan all files starting from projectRoot
  const entries = await glob("**/*", {
    cwd: projectRoot,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false // Prevents infinite loops
  });

  const scannedFiles: ScannedFile[] = [];

  for (const entry of entries) {
    const relativePath = entry;

    // Check if path is ignored by gitignore/mappuignore
    if (ig.ignores(relativePath)) {
      continue;
    }

    // Language detection by extension map
    const ext = path.extname(relativePath).toLowerCase();
    const language = EXTENSION_MAP[ext];
    if (language) {
      scannedFiles.push({
        path: relativePath,
        language
      });
    }
  }

  return scannedFiles;
}

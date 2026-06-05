import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/library.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: [
      "better-sqlite3",
      "tree-sitter",
      "graphology",
      "express",
      "react",
      "react-dom",
      "vite",
    ],
    outDir: "dist/lib",
  },
  {
    entry: {
      mappu: "src/cli.ts",
    },
    format: ["cjs"],
    sourcemap: true,
    clean: false, // Don't clean dist/lib when building cli
    external: [
      "better-sqlite3",
      "tree-sitter",
      "graphology",
      "express",
      "react",
      "react-dom",
      "vite",
    ],
    banner: {
      js: "#!/usr/bin/env node",
    },
    outDir: "dist/bin",
  },
]);

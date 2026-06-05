/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Engines
export { GitChurnEngine } from "./engines/git";
export { CloneEngine } from "./engines/clone";
export { DeadCodeEngine } from "./engines/dead-code";
export { DoctorEngine } from "./engines/doctor";
export { ScopeEngine } from "./engines/scope";
export { TestGapEngine } from "./engines/test-gap";
export { DiffEngine } from "./engines/diff";
export { SearchEngine } from "./engines/search";
export { ApiSurfaceEngine } from "./engines/api-surface";
export { SecurityEngine, SecuritySASTEngine } from "./engines/security";
export { BenchmarkEngine } from "./engines/benchmark";
export { TraceEngine } from "./engines/trace";
export { ExplainEngine } from "./engines/explain";
export { MapEngine } from "./engines/map";

// Core Indexing
export { IndexBuilder } from "./index/builder";
export { StorageManager } from "./index/storage";
export { BM25SearchEngine, BM25SearchEngine as BM25Index } from "./index/bm25";
export { FileWatcher } from "./index/watcher";
export { IncrementalReindexer } from "./index/incremental";
export { Tokenizer } from "./index/tokenizer";

// Types and Interfaces
export * from "./types";
export { SymbolKind } from "./types/symbol";
export type { SymbolScope, MappuSymbol } from "./types/symbol";
export type { CodeNode, CodeEdge, CallGraph, ImportGraph } from "./types/graph";
export type { MappuPlugin } from "./types/plugin";

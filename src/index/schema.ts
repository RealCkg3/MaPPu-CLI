/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

export const SQLiteSchema = {
  filesTable: `
    CREATE TABLE IF NOT EXISTS files (
      filePath TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      languages TEXT NOT NULL,
      scannedAt TEXT NOT NULL,
      hash TEXT NOT NULL DEFAULT '',
      line_count INTEGER NOT NULL DEFAULT 0
    )
  `,
  symbolsTable: `
    CREATE TABLE IF NOT EXISTS symbols (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      filePath TEXT NOT NULL,
      startLine INTEGER NOT NULL,
      endLine INTEGER NOT NULL,
      start_line INTEGER NOT NULL DEFAULT 1,
      end_line INTEGER NOT NULL DEFAULT 1,
      complexity INTEGER NOT NULL DEFAULT 0,
      param_count INTEGER NOT NULL DEFAULT 0,
      isExported INTEGER DEFAULT 0,
      FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `,
  importsTable: `
    CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY,
      filePath TEXT NOT NULL,
      target TEXT NOT NULL,
      imported_names TEXT NOT NULL,
      FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `,
  chunksTable: `
    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      filePath TEXT NOT NULL,
      startLine INTEGER NOT NULL DEFAULT 1,
      endLine INTEGER NOT NULL DEFAULT 1,
      summary TEXT NOT NULL,
      intentTags TEXT NOT NULL,
      content TEXT NOT NULL,
      struct_hash TEXT,
      FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `,
  edgesTable: `
    CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      type TEXT NOT NULL,
      FOREIGN KEY (source) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `,
  clonesTable: `
    CREATE TABLE IF NOT EXISTS clones (
      id TEXT PRIMARY KEY,
      fileA TEXT NOT NULL,
      fileB TEXT NOT NULL,
      lineA INTEGER NOT NULL,
      lineB INTEGER NOT NULL,
      similarity REAL NOT NULL,
      snippetA TEXT NOT NULL,
      snippetB TEXT NOT NULL,
      FOREIGN KEY (fileA) REFERENCES files(filePath) ON DELETE CASCADE,
      FOREIGN KEY (fileB) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `,
  securityFindingsTable: `
    CREATE TABLE IF NOT EXISTS security_findings (
      id TEXT PRIMARY KEY,
      file TEXT NOT NULL,
      line INTEGER NOT NULL,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      remediation TEXT NOT NULL,
      snippet TEXT NOT NULL,
      FOREIGN KEY (file) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `,
  gitChurnTable: `
    CREATE TABLE IF NOT EXISTS git_churn (
      filePath TEXT PRIMARY KEY,
      commitsCount INTEGER NOT NULL,
      linesAdded INTEGER NOT NULL,
      linesDeleted INTEGER NOT NULL,
      churnScore REAL NOT NULL,
      FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `,
  cochangeTable: `
    CREATE TABLE IF NOT EXISTS cochange (
      fileA TEXT NOT NULL,
      fileB TEXT NOT NULL,
      cochangeCount INTEGER NOT NULL,
      ratio REAL NOT NULL,
      PRIMARY KEY (fileA, fileB),
      FOREIGN KEY (fileA) REFERENCES files(filePath) ON DELETE CASCADE,
      FOREIGN KEY (fileB) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `,
  scopeRulesTable: `
    CREATE TABLE IF NOT EXISTS scope_rules (
      id TEXT PRIMARY KEY,
      "from" TEXT NOT NULL,
      "to" TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL
    )
  `,
  scopeViolationsTable: `
    CREATE TABLE IF NOT EXISTS scope_violations (
      id TEXT PRIMARY KEY,
      filePath TEXT NOT NULL,
      importedPath TEXT NOT NULL,
      ruleId TEXT NOT NULL,
      FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE,
      FOREIGN KEY (ruleId) REFERENCES scope_rules(id) ON DELETE CASCADE
    )
  `,
  benchmarkFindingsTable: `
    CREATE TABLE IF NOT EXISTS benchmark_findings (
      id TEXT PRIMARY KEY,
      file TEXT NOT NULL,
      line INTEGER NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      remediation TEXT NOT NULL,
      snippet TEXT NOT NULL,
      FOREIGN KEY (file) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `,
  testFilesTable: `
    CREATE TABLE IF NOT EXISTS test_files (
      filePath TEXT PRIMARY KEY,
      FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `,
  untestedSymbolsTable: `
    CREATE TABLE IF NOT EXISTS untested_symbols (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      filePath TEXT NOT NULL,
      FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `,
  traceStepsTable: `
    CREATE TABLE IF NOT EXISTS trace_steps (
      id TEXT PRIMARY KEY,
      step INTEGER NOT NULL,
      filePath TEXT NOT NULL,
      blockName TEXT NOT NULL,
      lines TEXT NOT NULL,
      description TEXT NOT NULL,
      logicSnippet TEXT NOT NULL,
      FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `,
  doctorIssuesTable: `
    CREATE TABLE IF NOT EXISTS doctor_issues (
      id TEXT PRIMARY KEY,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      affectedFiles TEXT NOT NULL,
      remediationSnippet TEXT NOT NULL
    )
  `,
  bm25TermsTable: `
    CREATE TABLE IF NOT EXISTS bm25_terms (
      id TEXT PRIMARY KEY,
      term TEXT NOT NULL,
      filePath TEXT NOT NULL,
      frequency INTEGER NOT NULL,
      FOREIGN KEY (filePath) REFERENCES files(filePath) ON DELETE CASCADE
    )
  `
};

export const SQLiteIndexes = [
  // symbols indexes
  'CREATE INDEX IF NOT EXISTS idx_symbols_filePath ON symbols(filePath)',
  'CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name)',

  // imports indexes
  'CREATE INDEX IF NOT EXISTS idx_imports_filePath ON imports(filePath)',
  'CREATE INDEX IF NOT EXISTS idx_imports_target ON imports(target)',

  // chunks indexes
  'CREATE INDEX IF NOT EXISTS idx_chunks_filePath ON chunks(filePath)',
  'CREATE INDEX IF NOT EXISTS idx_chunks_struct_hash ON chunks(struct_hash)',

  // edges indexes
  'CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source)',
  'CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target)',

  // clones indexes
  'CREATE INDEX IF NOT EXISTS idx_clones_fileA ON clones(fileA)',
  'CREATE INDEX IF NOT EXISTS idx_clones_fileB ON clones(fileB)',

  // cochange indexes
  'CREATE INDEX IF NOT EXISTS idx_cochange_fileA ON cochange(fileA)',
  'CREATE INDEX IF NOT EXISTS idx_cochange_fileB ON cochange(fileB)',

  // security_findings indexes
  'CREATE INDEX IF NOT EXISTS idx_security_findings_file ON security_findings(file)',

  // scope_violations indexes
  'CREATE INDEX IF NOT EXISTS idx_scope_violations_filePath ON scope_violations(filePath)',
  'CREATE INDEX IF NOT EXISTS idx_scope_violations_ruleId ON scope_violations(ruleId)',

  // benchmark_findings indexes
  'CREATE INDEX IF NOT EXISTS idx_benchmark_findings_file ON benchmark_findings(file)',

  // untested_symbols indexes
  'CREATE INDEX IF NOT EXISTS idx_untested_symbols_filePath ON untested_symbols(filePath)',

  // trace_steps indexes
  'CREATE INDEX IF NOT EXISTS idx_trace_steps_filePath ON trace_steps(filePath)',

  // bm25_terms indexes
  'CREATE INDEX IF NOT EXISTS idx_bm25_terms_term ON bm25_terms(term)',
  'CREATE INDEX IF NOT EXISTS idx_bm25_terms_filePath ON bm25_terms(filePath)'
];

export function initializeDatabase(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  // Create tables under transaction
  db.transaction(() => {
    for (const [name, query] of Object.entries(SQLiteSchema)) {
      db.prepare(query).run();
    }
    for (const indexQuery of SQLiteIndexes) {
      db.prepare(indexQuery).run();
    }
  })();
  
  // Migration helper for struct_hash column if table already exists
  try {
    const info = db.prepare("PRAGMA table_info(chunks)").all() as any[];
    const hasStructHash = info.some(col => col.name === "struct_hash");
    if (!hasStructHash && info.length > 0) {
      db.prepare("ALTER TABLE chunks ADD COLUMN struct_hash TEXT").run();
      db.prepare("CREATE INDEX IF NOT EXISTS idx_chunks_struct_hash ON chunks(struct_hash)").run();
    }
  } catch (e) {
    // Ignore migration errors if any
  }

  // Migration helper for line_count column if table already exists
  try {
    const info = db.prepare("PRAGMA table_info(files)").all() as any[];
    const hasLineCount = info.some(col => col.name === "line_count");
    if (!hasLineCount && info.length > 0) {
      db.prepare("ALTER TABLE files ADD COLUMN line_count INTEGER NOT NULL DEFAULT 0").run();
    }
  } catch (e) {
    // Ignore migration errors if any
  }

  return db;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import * as path from "path";
import * as fs from "fs";
import { indexCodebase, searchIntent, traceExecution, runDoctor, getStoredIndex, scanCodebase, refactorCodebase, explainCodebase, discoverFramework } from "./src/mappu-core.js";
import { DeadCodeEngine } from "./src/engines/dead-code.js";
import { CloneEngine } from "./src/engines/clone.js";
import { SecurityEngine, SecuritySASTEngine } from "./src/engines/security.js";
import { GitChurnEngine } from "./src/engines/git.js";
import { ScopeEngine } from "./src/engines/scope.js";
import { BenchmarkEngine } from "./src/engines/benchmark.js";
import { TestGapEngine } from "./src/engines/test-gap.js";
import { DiffEngine } from "./src/engines/diff.js";
import * as dotenv from "dotenv";
import { exec } from "child_process";

dotenv.config();

const app = express();
app.use(express.json());

const PROJECT_ROOT = path.resolve(".");

// Helper to run sandbox processes safely
function runSystemCommand(cmdLine: string): Promise<string> {
  return new Promise((resolve) => {
    // 8-second execution slice timeout for safety
    exec(cmdLine, { cwd: PROJECT_ROOT, timeout: 8000 }, (error, stdout, stderr) => {
      let result = "";
      if (stdout) {
        result += stdout;
      }
      if (stderr) {
        result += `\x1b[31m${stderr}\x1b[0m`;
      }
      if (error) {
        if (error.killed) {
          result += `\x1b[31m\n[Timeout Error]: Command execution terminated after exceeding safe sandbox constraints.\x1b[0m`;
        } else {
          result += `\x1b[31m\n[Runtime Exit]. Error: ${error.message}\x1b[0m`;
        }
      }
      resolve(result || "\x1b[90m[Command completed with standard output null]\x1b[0m\n");
    });
  });
}

// Helpers to restrict file views to project directory
function isSafePath(targetPath: string): boolean {
  const resolved = path.resolve(PROJECT_ROOT, targetPath);
  return resolved.startsWith(PROJECT_ROOT);
}

// ----------------------
// REST API ENDPOINTS
// ----------------------

// 1. Fetch indexing status of the repository
app.get("/api/mappu/status", (req, res) => {
  try {
    const data = getStoredIndex(PROJECT_ROOT);
    if (!data) {
      return res.json({ indexed: false });
    }
    const { registry } = data;
    return res.json({
      indexed: true,
      scannedAt: registry.scannedAt,
      totalFiles: registry.totalFiles,
      totalChunks: registry.chunks.length,
      files: registry.files
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Perform indexing (with progressive chunking logs inside return structure)
app.post("/api/mappu/init", async (req, res) => {
  try {
    const logs: string[] = [];
    const registry = await indexCodebase(PROJECT_ROOT, (msg) => {
      logs.push(msg);
    });
    res.json({
      success: true,
      logs,
      registry
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Command Intent Search
app.post("/api/mappu/search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing intent search query string." });
    }
    const results = await searchIntent(PROJECT_ROOT, query);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Trace System Calls Intent
app.post("/api/mappu/trace", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing call trace query string." });
    }
    const trace = await traceExecution(PROJECT_ROOT, query);
    res.json({ trace });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Run System Doctor diagnostics
app.post("/api/mappu/doctor", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing diagnostics focus context." });
    }
    const report = await runDoctor(PROJECT_ROOT, query);
    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5a. Plan codebase structural refactoring
app.post("/api/mappu/refactor", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing refactor directive query." });
    }
    const plan = await refactorCodebase(PROJECT_ROOT, query);
    res.json({ plan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5b. Generate AI conceptual explanation and Mermaid topology flow
app.post("/api/mappu/explain", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing explanation target query." });
    }
    const explanation = await explainCodebase(PROJECT_ROOT, query);
    res.json({ explanation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5c. Discover Insane Framework and Scaffold Boilerplate
app.post("/api/mappu/framework", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing framework query." });
    }
    const discovery = await discoverFramework(query);
    res.json({ discovery });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Secure workspace file content reader
app.get("/api/mappu/source", async (req, res) => {
  try {
    const filePath = req.query.file as string;
    if (!filePath) {
      return res.status(400).json({ error: "Missing file parameter query." });
    }
    if (!isSafePath(filePath)) {
      return res.status(403).json({ error: "Refused access: Out-of-bounds path traversal attempt." });
    }
    const fullPath = path.resolve(PROJECT_ROOT, filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "Target file does not exist on project workspace." });
    }
    const sourceCode = await fs.promises.readFile(fullPath, "utf-8");
    res.json({ content: sourceCode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6a. List Sandbox files
app.get("/api/mappu/sandbox-files", async (req, res) => {
  try {
    const sandboxDir = path.resolve(PROJECT_ROOT, "sandbox");
    if (!fs.existsSync(sandboxDir)) {
      return res.json({ files: [] });
    }
    const list: { filePath: string; size: number; lines: number; content: string }[] = [];
    async function scanDir(current: string) {
      const entries = await fs.promises.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          const rel = path.relative(PROJECT_ROOT, fullPath);
          const stat = await fs.promises.stat(fullPath);
          const content = await fs.promises.readFile(fullPath, "utf-8");
          list.push({
            filePath: rel,
            size: stat.size,
            lines: content.split("\n").length,
            content
          });
        }
      }
    }
    await scanDir(sandboxDir);
    res.json({ files: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6b. Write file securely under sandbox/ folder
app.post("/api/mappu/write-file", async (req, res) => {
  try {
    let { filePath, content } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "Missing filePath." });
    }
    // Clean path and ensure it's in sandbox
    let relativePath = filePath.trim();
    relativePath = relativePath.replace(/^[\\/]+/, "");
    
    // Ensure it goes to sandbox if no sandbox path prefix
    if (!relativePath.startsWith("sandbox/") && !relativePath.startsWith("sandbox\\")) {
      relativePath = path.join("sandbox", relativePath);
    }

    if (!isSafePath(relativePath)) {
      return res.status(403).json({ error: "Forbidden path traversal." });
    }

    const fullPath = path.resolve(PROJECT_ROOT, relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.writeFile(fullPath, content || "", "utf-8");
    res.json({ success: true, filePath: relativePath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6c. Purge sandbox file
app.post("/api/mappu/delete-file", async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "Missing filePath." });
    }
    if (!isSafePath(filePath) || (!filePath.startsWith("sandbox/") && !filePath.startsWith("sandbox\\"))) {
      return res.status(403).json({ error: "Forbidden access: Cannot delete core system files." });
    }
    const fullPath = path.resolve(PROJECT_ROOT, filePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6d. Helper to search files using pattern matching (grep/ripgrep simulator)
interface GrepResult {
  filePath: string;
  lineNumber: number;
  lineContent: string;
}

function runGrepSearch(pattern: string): GrepResult[] {
  const results: GrepResult[] = [];
  const lowercasePattern = pattern.toLowerCase().trim();
  if (!lowercasePattern) return [];

  const excludeDirs = ["node_modules", "dist", ".git", ".mappu", "package-lock.json"];
  const nonCodeExts = [".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".gz", ".tar"];

  function search(dir: string) {
    if (!fs.existsSync(dir)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(PROJECT_ROOT, fullPath);

        if (excludeDirs.some((ex) => relativePath.split(path.sep).includes(ex))) {
          continue;
        }

        if (entry.isDirectory()) {
          search(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (nonCodeExts.includes(ext)) continue;

          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const lines = content.split("\n");
            lines.forEach((line, index) => {
              if (line.toLowerCase().includes(lowercasePattern)) {
                results.push({
                  filePath: relativePath,
                  lineNumber: index + 1,
                  lineContent: line.trim()
                });
              }
            });
          } catch (err) {
            // Unrestricted fallback
          }
        }
      }
    } catch (e) {
      // Unrestricted fallback
    }
  }

  search(PROJECT_ROOT);
  return results;
}

app.post("/api/mappu/grep", (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing grep pattern query." });
    }
    const results = runGrepSearch(query);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6e. GitHub Integration & Importer
function parseGitHubUrl(urlStr: string) {
  try {
    const cleanUrl = urlStr.trim();
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
      const url = new URL(cleanUrl);
      if (url.hostname === "github.com") {
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
          const owner = parts[0];
          const repo = parts[1];
          let branch = "main";
          let filePath = "";
          
          if (parts[2] === "blob" && parts.length > 4) {
            branch = parts[3];
            filePath = parts.slice(4).join("/");
          } else if (parts[2] === "raw" && parts.length > 4) {
            branch = parts[3];
            filePath = parts.slice(4).join("/");
          } else if (parts[2] === "tree" && parts.length > 4) {
            branch = parts[3];
            filePath = parts.slice(4).join("/");
          }
          return { owner, repo, branch, filePath };
        }
      } else if (url.hostname === "raw.githubusercontent.com") {
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length >= 3) {
          return {
            owner: parts[0],
            repo: parts[1],
            branch: parts[2],
            filePath: parts.slice(3).join("/")
          };
        }
      }
    } else {
      const parts = cleanUrl.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return {
          owner: parts[0],
          repo: parts[1],
          branch: "main",
          filePath: parts.slice(2).join("/")
        };
      }
    }
  } catch (e) {
    // Ignore invalid link shapes
  }
  return null;
}

app.post("/api/mappu/github-fetch", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Missing URL parameter." });
    }

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return res.status(400).json({ error: "Failed to parse GitHub repository or file path. Please specify a URL like: https://github.com/user/repo/blob/main/path/file.py" });
    }

    const { owner, repo, branch, filePath } = parsed;

    if (!filePath) {
      // Directory listing context
      const apiUri = `https://api.github.com/repos/${owner}/${repo}/contents`;
      const response = await fetch(apiUri, {
        headers: { "User-Agent": "Mappu-Architect-Engine" }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("GitHub API rate limit exceeded. Please fetch direct raw files (e.g. paste direct raw path) which do not use API keys!");
        }
        throw new Error(`GitHub Directory API returned status ${response.status}: ${response.statusText}`);
      }

      const list = await response.json();
      return res.json({
        type: "directory",
        owner,
        repo,
        branch,
        files: Array.isArray(list) ? list.map((item: any) => ({
          name: item.name,
          path: item.path,
          type: item.type,
          downloadUrl: item.download_url,
          size: item.size
        })) : []
      });
    } else {
      // Specific file direct raw copy context
      const rawUri = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      const response = await fetch(rawUri);
      if (!response.ok) {
        throw new Error(`Failed of direct raw retrieval from ${rawUri} (Status Code ${response.status})`);
      }

      const content = await response.text();
      // Write into sandbox folder securely
      const baseName = path.basename(filePath);
      const targetSanPath = path.join("sandbox", baseName);
      const fullPath = path.resolve(PROJECT_ROOT, targetSanPath);
      
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      await fs.promises.writeFile(fullPath, content, "utf-8");
      
      return res.json({
        type: "file",
        owner,
        repo,
        branch,
        filePath,
        savedPath: targetSanPath,
        content
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET structured grep results
app.get("/api/mappu/grep", (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    if (!q) {
      return res.status(400).json({ error: "Missing query query parameter q." });
    }
    const results = runGrepSearch(q);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET structured reachability results
app.get("/api/mappu/dead", (req, res) => {
  try {
    const runner = new DeadCodeEngine();
    const results = runner.analyzeReachability(PROJECT_ROOT);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET duplicate code clones results
app.get("/api/mappu/clone", async (req, res) => {
  try {
    const runner = new CloneEngine();
    const files = await scanCodebase(PROJECT_ROOT);
    const results = runner.detectDuplicates(files);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET dynamic SAST defects
app.get("/api/mappu/security", async (req, res) => {
  try {
    const { category, severity, ai } = req.query;
    const runner = new SecurityEngine();
    const report = await runner.run(PROJECT_ROOT, {
      category: category as any,
      severity: severity as any,
      ai: ai === "true"
    });
    // Convert new SecurityFinding format to maintain 100% backward compatibility and add rich new properties
    const results = report.findings.map(f => ({
      filePath: f.file,
      line: f.line || 1,
      issue: f.message,
      recommendation: f.remediation || "Review code logic and isolate potential data exposure corridors.",
      severity: f.severity,
      category: f.category,
      rule: f.rule,
      snippet: f.snippet,
      source: f.source,
      cveId: f.cveId,
      cweId: f.cweId,
      epssScore: f.epssScore
    }));
    res.json({ results, summary: report.summary, scannedFiles: report.scannedFiles, duration: report.duration });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET git metrics hotspot
app.get("/api/mappu/git", async (req, res) => {
  try {
    const runner = new GitChurnEngine();
    const files = await scanCodebase(PROJECT_ROOT);
    const paths = files.map(f => f.filePath);
    const results = runner.listHotspots(paths);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET architectural boundary violations
app.get("/api/mappu/scope", (req, res) => {
  try {
    const runner = new ScopeEngine();
    const violations = runner.analyzeScope(PROJECT_ROOT);
    res.json({ violations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET performance benchmark traps
app.get("/api/mappu/benchmark", (req, res) => {
  try {
    const runner = new BenchmarkEngine();
    const findings = runner.analyzePerformance(PROJECT_ROOT);
    res.json({ findings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET test gap coverage analyzer
app.get("/api/mappu/test-gap", (req, res) => {
  try {
    const runner = new TestGapEngine();
    const report = runner.analyzeGaps(PROJECT_ROOT);
    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET staged/uncommitted pre-commit diff analyzer
app.get("/api/mappu/diff", async (req, res) => {
  try {
    const runner = new DiffEngine();
    const report = await runner.analyzeDiff(PROJECT_ROOT);
    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Seed Sandbox Templates
try {
  const sandboxDir = path.resolve(PROJECT_ROOT, "sandbox");
  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir, { recursive: true });
    
    fs.writeFileSync(path.join(sandboxDir, "auth-middleware.py"), `# JWT Custom Authentication Middleware
# Diagnoses safety checks, handles validation and secret key parsing
import jwt
import os

token_secret = os.environ.get("JWT_SECRET", "super-secret-key")

def authenticate_request(headers):
    auth_header = headers.get("Authorization")
    if not auth_header:
        raise ValueError("Missing authorization header in request")
    
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise ValueError("Header must start with Bearer token format")
        
    token = parts[1]
    try:
        payload = jwt.decode(token, token_secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token expired")
    except jwt.InvalidTokenError:
        raise Exception("Invalid token value")
`, "utf-8");

    fs.writeFileSync(path.join(sandboxDir, "weather-bot.ts"), `/**
 * Simple TypeScript Weather Bot API integration
 * Demonstrates async/await execution tracing, query parsing, and fallback values.
 */
interface WeatherResponse {
  city: string;
  temperature: number;
  conditions: string;
  cachedAt: number;
}

export async function fetchCityWeather(city: string): Promise<WeatherResponse> {
  if (!city) {
    throw new Error("Target city string cannot be empty");
  }

  console.log(\`[WeatherBot] Routing fetch call to external weather maps API for \${city}\`);
  try {
    // Simulated fetch call with standard fallback ranges
    const isSunny = Math.random() > 0.4;
    return {
      city: city.charAt(0).toUpperCase() + city.slice(1),
      temperature: Math.floor(Math.random() * 15) + 15, // 15-30 deg
      conditions: isSunny ? "Sunny" : "Scattered Clouds",
      cachedAt: Date.now()
    };
  } catch (error) {
    console.error("[WeatherBot] API Call failure, executing local error handling strategies");
    return {
      city,
      temperature: 20,
      conditions: "Sunny",
      cachedAt: Date.now()
    };
  }
}
`, "utf-8");
  }
} catch (e) {
  console.error("Failed to seed sandbox templates:", e);
}

// 7. Simulated Shell Endpoint (allows simulated execution of CLI instructions to return printed ansi content)
app.post("/api/mappu/shell", async (req, res) => {
  try {
    const { command, args } = req.body;
    const cmdClean = (command || "").trim().toLowerCase();
    
    if (cmdClean !== "mappu") {
      // Rebuild raw command to execute directly through child process safely
      const fullCmd = [command, ...args].join(" ");
      const result = await runSystemCommand(fullCmd);
      return res.json({ output: result });
    }

    const sub = args && args[0] ? args[0].toLowerCase() : "";
    const query = args && args.slice(1).join(" ");

    // Redirect to native internal engine routines to return beautiful colored console logs
    const indexWrap = getStoredIndex(PROJECT_ROOT);

    if (sub === "help" || !sub) {
      return res.json({
        output: `
\x1b[36m\x1b[1m Mappu Engine \x1b[90m- AI Intent Codebase Navigator & Code Tracer\x1b[2m (Mobile Optimized Console)\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  mappu <command> [arguments]   (Or run any standard command directly, e.g. "node sandbox/scaffold.js", "python3 sandbox/script.py", "ls sandbox", etc.)

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[38;5;43m\x1b[1minit\x1b[0m                  Scans workspace and builds semantic index at .mappu/index.json
  \x1b[38;5;43m\x1b[1msearch <query>\x1b[0m        Seeks files by developer behavioral intent (e.g., mappu search "token auth")
  \x1b[38;5;43m\x1b[1mtrace <query>\x1b[0m         Maps execution sequences/calls chronologically across folders
  \x1b[38;5;43m\x1b[1mdoctor <intent>\x1b[0m       Diagnoses holes, safety flaws, and unhandled logic chains
  \x1b[38;5;43m\x1b[1mrefactor <goal>\x1b[0m       Designs step-by-step modification recipes to reach architectural targets
  \x1b[38;5;43m\x1b[1mexplain <topic>\x1b[0m       Walks through modules, constructs patterns & dynamic Mermaid flowcharts
  \x1b[38;5;43m\x1b[1mmap\x1b[0m                   Renders structured directory tree with module purposes
  \x1b[38;5;43m\x1b[1mframework <query>\x1b[0m     \x1b[31m[INSANE]\x1b[0m Discovers modern frameworks, generates scaffolds & boilerplates
  \x1b[38;5;43m\x1b[1mdead\x1b[0m                  Evaluates import path graph to pinpoint isolated/dead modules
  \x1b[38;5;43m\x1b[1mclone\x1b[0m                 Seeks identical/duplicate code blocks (sliding window AST hashes)
  \x1b[38;5;43m\x1b[1msecurity\x1b[0m              Scans AST checking for high-risk injection flaws & defects
  \x1b[38;5;43m\x1b[1mgit\x1b[0m                   Gathers edit hotspots and code modifications churn density
  \x1b[38;5;43m\x1b[1msandbox\x1b[0m               \x1b[32m[PLAYGROUND]\x1b[0m Lists active workspace custom upload files
  \x1b[38;5;43m\x1b[1mcat <path>\x1b[0m             \x1b[32m[PLAYGROUND]\x1b[0m Reads code content of custom sandbox uploads
  \x1b[38;5;43m\x1b[1mrun <filename>\x1b[0m         \x1b[33m[EXECUTOR]\x1b[0m Auto-detects interpreter (node / python) and executes custom file
  \x1b[38;5;43m\x1b[1mrm <path>\x1b[0m              \x1b[32m[PLAYGROUND]\x1b[0m Erases specific custom upload from sandbox logs
  \x1b[38;5;43m\x1b[1mhelp\x1b[0m                  Displays help menu

\x1b[1mDIRECT COMMAND EXECUTION EXAMPLES:\x1b[0m
  $ ls -la sandbox
  $ python3 sandbox/weather-worker.py
  $ node sandbox/auth-routes.js
  $ mappu run weather-worker.py
`
      });
    }

    if (sub === "sandbox" || sub === "ls") {
      const sandboxDir = path.join(PROJECT_ROOT, "sandbox");
      if (!fs.existsSync(sandboxDir)) {
        return res.json({ output: "\x1b[33m[Sandbox Storage] Workspace sandbox directory is currently empty.\x1b[0m\n" });
      }
      const files = fs.readdirSync(sandboxDir);
      if (files.length === 0) {
        return res.json({ output: "\x1b[33mNo custom sandbox uploads found. Create mockup scripts inside Mappu playground tab!\x1b[0m" });
      }

      let out = `\x1b[36mListing Active Workspace Sandbox Storage Modules:\x1b[0m\n`;
      out += `\x1b[90m┌──────────────────────────────┬────────────┬─────────┐\x1b[0m\n`;
      out += `\x1b[90m│\x1b[0m \x1b[1mFILE PATH                     \x1b[0m\x1b[90m│\x1b[0m \x1b[1mSIZE       \x1b[0m\x1b[90m│\x1b[0m \x1b[1mLINES   \x1b[0m\x1b[90m│\x1b[0m\n`;
      out += `\x1b[90m├──────────────────────────────┼────────────┼─────────┤\x1b[0m\n`;
      files.forEach(f => {
        const full = path.join(sandboxDir, f);
        const stats = fs.statSync(full);
        const content = fs.readFileSync(full, "utf-8");
        const lines = content.split("\n").length;
        const namePad = f.padEnd(28).substring(0, 28);
        const sizePad = `${stats.size} B`.padEnd(10);
        const linesPad = `${lines}`.padEnd(7);
        out += `\x1b[90m│\x1b[0m \x1b[38;5;43m${namePad}\x1b[0m \x1b[90m│\x1b[0m ${sizePad} \x1b[90m│\x1b[0m ${linesPad} \x1b[90m│\x1b[0m\n`;
      });
      out += `\x1b[90m└──────────────────────────────┴────────────┴─────────┘\x1b[0m\n`;
      out += `Total: \x1b[1m${files.length} mock scripts\x1b[0m active. Run \x1b[32mmappu init\x1b[0m to catalog them!\n`;
      return res.json({ output: out });
    }

    if (sub === "cat") {
      if (!query) return res.json({ output: "\x1b[31mError: Provide path of file to display (e.g. mappu cat auth-middleware.py).\x1b[0m" });
      let cleanPath = query.trim().replace("sandbox/", "");
      const full = path.join(PROJECT_ROOT, "sandbox", cleanPath);
      
      if (!isSafePath(full) || !fs.existsSync(full)) {
        return res.json({ output: `\x1b[31mError: Safe bounds rule block, or file "${cleanPath}" does not exist in sandbox.\x1b[0m` });
      }
      
      const content = fs.readFileSync(full, "utf-8");
      let out = `\x1b[35m[CAT / VIEW] file: sandbox/${cleanPath}\x1b[0m\n`;
      out += `\x1b[90m──────────────────────────────────────────────────\x1b[0m\n`;
      out += content;
      if (!content.endsWith("\n")) out += "\n";
      out += `\x1b[90m──────────────────────────────────────────────────\x1b[0m\n`;
      return res.json({ output: out });
    }

    if (sub === "rm") {
      if (!query) return res.json({ output: "\x1b[31mError: Provide file path to delete from storage.\x1b[0m" });
      let cleanPath = query.trim().replace("sandbox/", "");
      const full = path.join(PROJECT_ROOT, "sandbox", cleanPath);
      
      if (!isSafePath(full) || !fs.existsSync(full)) {
        return res.json({ output: `\x1b[31mError: Access parameters bounds check, or file "${cleanPath}" missing.\x1b[0m` });
      }
      
      fs.unlinkSync(full);
      return res.json({ output: `\x1b[33m\x1b[1m✔ Core Purge complete: sandbox/${cleanPath} removed.\x1b[0m` });
    }

    if (sub === "init") {
      const logs: string[] = [];
      await indexCodebase(PROJECT_ROOT, (m) => logs.push(m));
      return res.json({
        output: `
\x1b[38;5;43mInitializing Mappu semantic parser in \x1b[1m${PROJECT_ROOT}\x1b[0m
${logs.map(l => ` \x1b[90m[Index]\x1b[0m ${l}`).join("\n")}

\x1b[32m\x1b[1m✔ Semantic Indexing Completed!\x1b[0m
  Index stored at: \x1b[3m.mappu/index.json\x1b[0m
`
      });
    }

    if (sub === "search") {
      if (!query) return res.json({ output: "\x1b[31mError: Please specify search intent query.\x1b[0m" });
      const results = await searchIntent(PROJECT_ROOT, query);
      if (!results.length) return res.json({ output: "\x1b[33mNo strong semantic matches identified for this intent.\x1b[0m" });
      
      let out = `\x1b[36mSearching codebase for intent: "${query}"...\x1b[0m\n\n`;
      results.forEach((match, index) => {
        out += `\x1b[1m${index + 1}. [File] \x1b[38;5;43m${match.filePath}\x1b[90m (Lines: ${match.startLine}-${match.endLine}) - Confidence: ${match.score}/10\x1b[0m\n`;
        out += `\x1b[38;5;99m   Rationale: ${match.matchRationale}\x1b[0m\n`;
        out += `\x1b[90m   ---[Code Snippet]---\x1b[0m\n`;
        out += match.snippet.split("\n").map(l => "   " + l).join("\n") + "\n";
        out += `\x1b[90m   --------------------\x1b[0m\n\n`;
      });
      return res.json({ output: out });
    }

    if (sub === "trace") {
      if (!query) return res.json({ output: "\x1b[31mError: Please specify the execution flow trigger context.\x1b[0m" });
      const flow = await traceExecution(PROJECT_ROOT, query);
      let out = `\x1b[36mMapping execution trace for: "${query}"...\x1b[0m\n`;
      out += `\n\x1b[38;5;43m\x1b[1mExecution Intent Roadmap:\x1b[0m\n`;
      out += ` \x1b[90m${flow.overviewFlow}\x1b[0m\n\n`;
      flow.steps.forEach((step) => {
        out += `  \x1b[38;5;43m\x1b[1m[Step ${step.step}]\x1b[0m in \x1b[38;5;99m${step.filePath}\x1b[0m (\x1b[3m${step.lines}\x1b[0m)\n`;
        out += `  └─> \x1b[1m${step.blockName}\x1b[0m: ${step.description}\n`;
        if (step.logicSnippet) out += `      \x1b[90mSnipped: ${step.logicSnippet}\x1b[0m\n`;
        out += "\n";
      });
      return res.json({ output: out });
    }

    if (sub === "doctor") {
      if (!query) return res.json({ output: "\x1b[31mError: Provide diagnostic focus intent (e.g. 'auth').\x1b[0m" });
      const report = await runDoctor(PROJECT_ROOT, query);
      let out = `\x1b[36mEvaluating architecture robustness for focus: "${query}"...\x1b[0m\n`;
      let scCol = "\x1b[32m";
      if (report.overallScore < 50) scCol = "\x1b[31m";
      else if (report.overallScore < 80) scCol = "\x1b[33m";

      out += `\n\x1b[1mMappu Doctor Report:\x1b[0m\n`;
      out += ` Diagnostic Score: ${scCol}\x1b[1m${report.overallScore}/100\x1b[0m\n`;
      out += ` Assessment: \x1b[38;5;99m${report.summaryReview}\x1b[0m\n\n`;

      if (report.issues.length === 0) {
        out += ` \x1b[32m✔ No critical design issues or logic discrepancies detected!\x1b[0m\n`;
      } else {
        report.issues.forEach((issue, idx) => {
          let sCol = "\x1b[32m";
          if (issue.severity === "high") sCol = "\x1b[31m";
          if (issue.severity === "medium") sCol = "\x1b[33m";
          out += `  \x1b[1m${idx + 1}. [Issue]\x1b[0m ${sCol}${issue.severity.toUpperCase()}\x1b[0m | \x1b[38;5;43m${issue.title}\x1b[0m\n`;
          out += `     Category: ${issue.category}\n`;
          out += `     Impacted: ${issue.affectedFiles.join(", ")}\n`;
          out += `     Description: ${issue.description}\n`;
          if (issue.remediationSnippet) {
            out += `     \x1b[32mRemediation:\x1b[0m\n` + issue.remediationSnippet.split("\n").map(l => "     " + l).join("\n") + "\n";
          }
          out += "\n";
        });
      }
      return res.json({ output: out });
    }

    if (sub === "map") {
      if (!indexWrap) {
        const scanned = await scanCodebase(PROJECT_ROOT);
        let out = `\x1b[33mIndex missing. Running fast tree scan of workspace:\x1b[0m\n`;
        scanned.forEach(f => {
          out += `  \x1b[38;5;43m📄 ${f.filePath}\x1b[0m (${f.content.split("\n").length} lines)\n`;
        });
        out += `\n\x1b[36mRun "mappu init" to populate rich AI documentation tags.\x1b[0m\n`;
        return res.json({ output: out });
      }
      let out = `\n\x1b[32m\x1b[1mIndexed Codebase Tree:\x1b[0m\n`;
      indexWrap.registry.files.forEach(f => {
        out += ` 📂 \x1b[38;5;43m${f.filePath}\x1b[0m\n`;
        out += `    \x1b[90mPurpose:\x1b[0m ${f.description}\n`;
        if (f.exports.length) out += `    \x1b[38;5;99mExports:\x1b[0m [ ${f.exports.join(", ")} ]\n`;
        if (f.imports.length) out += `    \x1b[90mImports:\x1b[0m [ ${f.imports.join(", ")} ]\n`;
        out += "\n";
      });
      return res.json({ output: out });
    }

    if (sub === "refactor") {
      if (!query) return res.json({ output: "\x1b[31mError: Please specify refactoring goal/directive.\x1b[0m" });
      const plan = await refactorCodebase(PROJECT_ROOT, query);
      let out = `\x1b[36mConstructing refactoring blueprints for direction: "${query}"...\x1b[0m\n`;
      out += `\n\x1b[1mArchitectural Blueprint Strategy:\x1b[0m\n`;
      out += ` \x1b[38;5;99m${plan.strategyOverview}\x1b[0m\n`;
      out += ` \x1b[90mExpected Outcomes: ${plan.expectedOutcomes}\x1b[0m\n\n`;

      plan.steps.forEach((step) => {
        const actionCol = step.action === "create" ? "\x1b[32m" : step.action === "delete" ? "\x1b[31m" : "\x1b[33m";
        out += `  \x1b[1m[Step ${step.step}]\x1b[0m ${actionCol}${step.action.toUpperCase()}\x1b[0m in \x1b[38;5;43m${step.filePath}\x1b[0m\n`;
        out += `  └─> \x1b[1mRationale:\x1b[0m ${step.explanation}\n`;
        if (step.targetContent) {
          out += `      \x1b[90mSearch Target:\x1b[0m\n` + step.targetContent.split("\n").map(l => "      | " + l).join("\n") + "\n";
        }
        if (step.replacementContent) {
          out += `      \x1b[32mProposed Replacement:\x1b[0m\n` + step.replacementContent.split("\n").map(l => "      + " + l).join("\n") + "\n";
        }
        out += "\n";
      });
      return res.json({ output: out });
    }

    if (sub === "explain") {
      if (!query) return res.json({ output: "\x1b[31mError: Please specify concept or topic to explain.\x1b[0m" });
      const explanation = await explainCodebase(PROJECT_ROOT, query);
      let out = `\x1b[36mExplaining codebase architecture & flow for: "${query}"...\x1b[0m\n`;
      out += `\n\x1b[1mHigh-Level Overview:\x1b[0m\n`;
      out += ` \x1b[38;5;99m${explanation.highLevelOverview}\x1b[0m\n\n`;
      out += `\x1b[1mArchitectural Style:\x1b[0m \x1b[38;5;43m${explanation.architecturalStyle}\x1b[0m\n\n`;
      
      out += `\x1b[1mCore Design Patterns Discovered:\x1b[0m\n`;
      explanation.keyDesignPatterns.forEach((p, index) => {
        out += `  \x1b[1m${index + 1}. ${p.patternName}\x1b[0m in \x1b[3m${p.locationInCode}\x1b[0m\n`;
        out += `     └─> ${p.description}\n\n`;
      });

      out += `\x1b[1mMermaid JS Structural Flow Diagram Source:\x1b[0m\n`;
      out += `\x1b[90m--------------------------------------------------\x1b[0m\n`;
      out += explanation.mermaidFlowchart + "\n";
      out += `\x1b[90m--------------------------------------------------\x1b[0m\n`;
      return res.json({ output: out });
    }

    if (sub === "framework" || sub === "stack" || sub === "scaffold") {
      if (!query) return res.json({ output: "\x1b[31mError: Please specify the framework query to research & discover.\x1b[0m" });
      const discovery = await discoverFramework(query);
      let out = `\x1b[36m\x1b[1mDISCOVERED INSANE FRAMEWORK:\x1b[0m \x1b[38;5;43m\x1b[1m${discovery.name}\x1b[0m\n`;
      out += `\x1b[38;5;99m${discovery.tagline}\x1b[0m\n\n`;
      out += `\x1b[1mDescription:\x1b[0m\n  ${discovery.description}\n\n`;
      out += `\x1b[1mInstallation:\x1b[0m\n  \x1b[33m$ ${discovery.installCommand}\x1b[0m\n\n`;
      out += `\x1b[1mPerformance Rating:\x1b[0m \x1b[32m${discovery.performanceScore}/100\x1b[0m\n`;
      out += `\x1b[1mGitHub Stars (Est):\x1b[0m \x1b[35m${discovery.starsEstimate}\x1b[0m\n\n`;
      out += `\x1b[1mKey Highlights:\x1b[0m\n`;
      discovery.benefits.forEach((benefit) => {
        out += `  \x1b[32m✔\x1b[0m ${benefit}\n`;
      });
      out += `\n\x1b[1mEcosystem Features:\x1b[0m\n`;
      discovery.keyFeatures.forEach((feat) => {
        out += `  • \x1b[1m${feat.feature}\x1b[0m: ${feat.description}\n`;
      });
      out += `\n\x1b[32m[SCAFFOLD / GENERATED BOILERPLATE] file: sandbox/${discovery.boilerplateFileName}\x1b[0m\n`;
      out += `\x1b[90m--------------------------------------------------\x1b[0m\n`;
      out += discovery.boilerplateCode + "\n";
      out += `\x1b[90m--------------------------------------------------\x1b[0m\n`;

      // Save it into sandbox for instant inspection!
      try {
        const sandboxDir = path.resolve(PROJECT_ROOT, "sandbox");
        if (!fs.existsSync(sandboxDir)) {
          fs.mkdirSync(sandboxDir, { recursive: true });
        }
        const fullPath = path.resolve(sandboxDir, discovery.boilerplateFileName);
        fs.writeFileSync(fullPath, discovery.boilerplateCode, "utf-8");
        out += `\n\x1b[32m\x1b[1m✔ Loaded into workspace sandbox! Use 'mappu cat ${discovery.boilerplateFileName}' or Sandbox tab to inspect!\x1b[0m\n`;
      } catch (e: any) {
        out += `\n\x1b[31m[Sandbox Sync Error]: ${e.message}\x1b[0m\n`;
      }
      return res.json({ output: out });
    }

    if (sub === "run" || sub === "exec" || sub === "execute") {
      if (!query) return res.json({ output: "\x1b[31mError: Provide standard file name to execute (e.g. mappu run weather-worker.py).\x1b[0m" });
      const cleanPath = query.trim().replace("sandbox/", "");
      const full = path.join(PROJECT_ROOT, "sandbox", cleanPath);
      if (!fs.existsSync(full)) {
        return res.json({ output: `\x1b[31mError: Sandbox file "${cleanPath}" does not exist.\x1b[0m` });
      }

      const ext = path.extname(full).toLowerCase();
      let runCmd = "";
      if (ext === ".py") {
        runCmd = `python3 "sandbox/${cleanPath}"`;
      } else if (ext === ".js" || ext === ".cjs") {
        runCmd = `node "sandbox/${cleanPath}"`;
      } else if (ext === ".ts" || ext === ".tsx") {
        runCmd = `npx tsx "sandbox/${cleanPath}"`;
      } else if (ext === ".sh") {
        runCmd = `bash "sandbox/${cleanPath}"`;
      } else {
        return res.json({ output: `\x1b[31mError: Sandbox executor doesn't support extension "${ext}". Try a .py, .js, or .ts script file!\x1b[0m` });
      }

      let out = `\x1b[32m⚡ Running sandbox script:\x1b[0m \x1b[1msandbox/${cleanPath}\x1b[0m via \x1b[33m${runCmd}\x1b[0m...\n`;
      out += `\x1b[90m┌──────────────────────────────────────────────────────────────┐\x1b[0m\n`;
      const execOutput = await runSystemCommand(runCmd);
      out += execOutput;
      out += `\x1b[90m└──────────────────────────────────────────────────────────────┘\x1b[0m\n`;
      return res.json({ output: out });
    }

    if (sub === "grep" || sub === "rg" || sub === "ripgrep" || sub === "find") {
      if (!query) return res.json({ output: "\x1b[31mError: Provide search query (e.g. mappu grep client).\x1b[0m" });
      const results = runGrepSearch(query);
      let out = `\x1b[36mGrep / Ripgrep Pattern Matches for: \x1b[1m"${query}"\x1b[0m\n`;
      out += `\x1b[90m┌──────────────────────────────────────────────────────────────┐\x1b[0m\n`;
      if (results.length === 0) {
        out += `  \x1b[33mNo content matches found for "${query}" in workspace.\x1b[0m\n`;
      } else {
        results.forEach((match) => {
          const line = match.lineContent;
          const reg = new RegExp(`(${query})`, "gi");
          const highlightedLine = line.replace(reg, "\x1b[32m\x1b[1m$1\x1b[0m");
          out += `  \x1b[35m${match.filePath}\x1b[0m:\x1b[33m${match.lineNumber}\x1b[0m ${highlightedLine}\n`;
        });
      }
      out += `\x1b[90m└──────────────────────────────────────────────────────────────┘\x1b[0m\n`;
      out += `Total matches: \x1b[32m\x1b[1m${results.length} hits\x1b[0m across scanned scope.\n`;
      return res.json({ output: out });
    }

    if (sub === "dead") {
      const runner = new DeadCodeEngine();
      const results = runner.analyzeReachability(PROJECT_ROOT);
      if (results.length === 0) {
        return res.json({ output: "\x1b[33mNo modules indexed. Run 'mappu init' first.\x1b[0m\n" });
      }
      let out = `\x1b[36mRunning Control Flow Reachability AST Scanner...\x1b[0m\n`;
      out += `\x1b[90m┌──────────────────────────────────────────────────────────────┐\x1b[0m\n`;
      results.forEach(item => {
        const mark = item.isReachable ? "\x1b[32m[REACHABLE]\x1b[0m" : "\x1b[31m[DANGLING] \x1b[0m";
        out += `  ${mark} \x1b[38;5;43m${item.filePath.padEnd(45)}\x1b[0m References: ${item.referencesCount}\n`;
      });
      out += `\x1b[90m└──────────────────────────────────────────────────────────────┘\x1b[0m\n`;
      return res.json({ output: out });
    }

    if (sub === "clone") {
      const runner = new CloneEngine();
      const files = await scanCodebase(PROJECT_ROOT);
      const results = runner.detectDuplicates(files);
      let out = `\x1b[34mRunning Duplicate Code Block Clone Scan...\x1b[0m\n`;
      out += `\x1b[90m┌──────────────────────────────────────────────────────────────┐\x1b[0m\n`;
      if (results.length === 0) {
        out += `  \x1b[32mNo Redundant duplicate code pairs detected (sliding limit 6 lines).\x1b[0m\n`;
      } else {
        results.forEach(item => {
          out += `  \x1b[33m[Duplicate Group]\x1b[0m \x1b[1m${item.filePathA}\x1b[0m <--> \x1b[1m${item.filePathB}\x1b[0m (${item.duplicatedLines} lines)\n`;
          out += `  \x1b[90mPreview:\x1b[0m ${item.preview}\n\n`;
        });
      }
      out += `\x1b[90m└──────────────────────────────────────────────────────────────┘\x1b[0m\n`;
      return res.json({ output: out });
    }

    if (sub === "security") {
      try {
        const runner = new SecurityEngine();
        // Parse options from the raw arguments in shell API if any
        const catArg = args.find((a: string) => a.startsWith("--category="));
        const sevArg = args.find((a: string) => a.startsWith("--severity="));
        const ruleArg = args.find((a: string) => a.startsWith("--rule="));
        const aiFlag = args.includes("--ai");
        const options: any = {};
        if (catArg) options.category = catArg.split("=")[1];
        if (sevArg) options.severity = sevArg.split("=")[1];
        if (ruleArg) options.rule = ruleArg.split("=")[1];
        if (aiFlag) options.ai = true;

        const report = await runner.run(PROJECT_ROOT, options);
        const defects = report.findings;

        let out = `\x1b[36mRunning AST static security compliance scan...\x1b[0m\n\n`;
        out += `\x1b[1mSecurity Risk Finding Defect Matrix:\x1b[0m\n`;
        out += `Scanned Files Count: \x1b[1m${report.scannedFiles}\x1b[0m modules | Scanned Duration: \x1b[1m${report.duration}ms\x1b[0m\n`;
        out += `\n\x1b[1mSummary metrics:\x1b[0m\n`;
        out += `  Critical: \x1b[31m\x1b[1m${report.summary.critical}\x1b[0m | High: \x1b[31m${report.summary.high}\x1b[0m | Medium: \x1b[33m${report.summary.medium}\x1b[0m | Low: \x1b[36m${report.summary.low}\x1b[0m\n`;
        out += `  By Category: sast=${report.summary.byCategory.sast || 0}, ai=${report.summary.byCategory.ai || 0}, iac=${report.summary.byCategory.iac || 0}, secrets=${report.summary.byCategory.secrets || 0}, deps=${report.summary.byCategory.deps || 0}\n\n`;

        out += `\x1b[90m┌──────────────────────────────────────────────────────────────┐\x1b[0m\n`;
        if (defects.length === 0) {
          out += `  \x1b[32m✔ Standard compliance complete. No critical exposure signatures found.\x1b[0m\n`;
        } else {
          defects.forEach((d, idx) => {
            const sevColor = d.severity === "critical" || d.severity === "high" ? "\x1b[31m" : d.severity === "medium" ? "\x1b[33m" : "\x1b[36m";
            out += `  [${idx + 1}] [${sevColor}${d.severity.toUpperCase()}\x1b[0m] [\x1b[35m${d.category.toUpperCase()}\x1b[0m] \x1b[1m${d.file}${d.line ? `:${d.line}` : ""}\x1b[0m\n`;
            out += `      Rule: \x1b[90m${d.rule}\x1b[0m\n`;
            out += `      Defect: \x1b[33m${d.message}\x1b[0m\n`;
            if (d.snippet) {
              out += `      Snippet: \x1b[90m${d.snippet}\x1b[0m\n`;
            }
            if (d.remediation) {
              out += `      Remediation: \x1b[32m${d.remediation}\x1b[0m\n`;
            }
            out += `\n`;
          });
        }
        out += `\x1b[90m└──────────────────────────────────────────────────────────────┘\x1b[0m\n`;
        return res.json({ output: out });
      } catch (err: any) {
        return res.json({ output: `\x1b[31mSecurity scanner run failed: ${err.message}\x1b[0m` });
      }
    }

    if (sub === "git") {
      const runner = new GitChurnEngine();
      const files = await scanCodebase(PROJECT_ROOT);
      const paths = files.map(f => f.filePath);
      const results = runner.listHotspots(paths);
      let out = `\x1b[33mCalculating Git Revision Churn and Hotspot Matrices...\x1b[0m\n`;
      out += `\x1b[90m┌──────────────────────────────────────────────────────────────┐\x1b[0m\n`;
      results.forEach(item => {
        const barFilled = Math.round(item.churnScore / 10);
        const bar = "█".repeat(barFilled) + "░".repeat(10 - barFilled);
        out += `  \x1b[38;5;43m${item.filePath.padEnd(45)}\x1b[0m Commits: ${String(item.commitsCount).padEnd(3)} [${bar}] Churn: ${item.churnScore}%\n`;
      });
      out += `\x1b[90m└──────────────────────────────────────────────────────────────┘\x1b[0m\n`;
      return res.json({ output: out });
    }

    return res.json({ output: `\x1b[31mError: Subcommand "${sub}" not supported.\x1b[0m` });
  } catch (err: any) {
    res.json({ output: `\x1b[31mExecution Error: ${err.message}\x1b[0m` });
  }
});

// ----------------------
// BUILD / DEV SERVE VITE
// ----------------------
async function start() {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Mappu Server] Injecting Vite HMR development middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Mappu Server] Running in static production router environment...");
    // Express serves compressed React client assets
    const distPath = path.resolve(PROJECT_ROOT, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Mappu Server] Node Server successfully active on port ${PORT}`);
    console.log(`[Mappu Server] Development Environment URL: http://localhost:${PORT}`);
  });
}

start();

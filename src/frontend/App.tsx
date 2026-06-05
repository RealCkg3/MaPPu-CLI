/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from "react";
import {
  Terminal,
  Search,
  Compass,
  Cpu,
  Activity,
  Layers,
  FileCode,
  HelpCircle,
  Play,
  RotateCw,
  Clock,
  Shield,
  FileText,
  AlertTriangle,
  ChevronRight,
  Code,
  ArrowRight,
  Check,
  Eye,
  BookOpen,
  Info,
  Wrench,
  Plus,
  Trash2,
  Upload,
  FolderOpen,
  Download,
  Zap,
  Home,
  Settings,
  Award,
  GitCompare,
} from "lucide-react";

import {
  SearchResult,
  TraceStep,
  TraceFlow,
  DiagnosticsIssue,
  DoctorReport,
  RefactorStep,
  RefactorPlan,
  ExplanationReport,
  RegistryFile,
  IndexStatus,
  SandboxFile,
  GrepResult,
  GithubResult,
} from "../types";

import {
  SearchTab,
  TraceTab,
  DoctorTab,
  RefactorTab,
  ExplainTab,
  TopologyTab,
  SandboxTab,
  GrepTab,
  GithubTab,
  FrameworkTab,
  DeadTab,
  CloneTab,
  SecurityTab,
  GitTab,
  ScopeTab,
  BenchmarkTab,
  TestGapTab,
  DiffTab,
} from "./Webview";

export default function App() {
  // Tab states
  const [activeTab, setActiveTab ] = useState<"home" | "suite" | "sandbox" | "settings">("home");
  const [activeSuiteTab, setActiveSuiteTab] = useState<"trace" | "doctor" | "refactor" | "explain" | "grep" | "search" | "dead" | "clone" | "security" | "git" | "scope" | "benchmark" | "test-gap" | "diff">("search");
  const [activeSettingsTab, setActiveSettingsTab] = useState<"framework" | "github" | "topology">("framework");

  const switchTab = (
    mainTab: "home" | "suite" | "sandbox" | "settings",
    subSuite?: "trace" | "doctor" | "refactor" | "explain" | "grep" | "search" | "dead" | "clone" | "security" | "git",
    subSettings?: "framework" | "github" | "topology"
  ) => {
    setActiveTab(mainTab);
    if (subSuite) {
      setActiveSuiteTab(subSuite);
    }
    if (subSettings) {
      setActiveSettingsTab(subSettings);
    }
  };

  // Project health and status states
  const [status, setStatus] = useState<IndexStatus>({ indexed: false });
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingLogs, setIndexingLogs] = useState<string[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Grep Search Engine State Variables
  const [grepQuery, setGrepQuery] = useState("auth");
  const [grepResults, setGrepResults] = useState<{ filePath: string; lineNumber: number; lineContent: string }[]>([]);
  const [isGrepping, setIsGrepping] = useState(false);

  // GitHub Importer State Variables
  const [githubUrl, setGithubUrl] = useState("https://github.com/expressjs/express");
  const [githubResult, setGithubResult] = useState<{
    type: "directory" | "file";
    owner: string;
    repo: string;
    branch: string;
    files?: { name: string; path: string; type: string; downloadUrl: string; size: number }[];
    filePath?: string;
    savedPath?: string;
    content?: string;
  } | null>(null);
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [githubSearchFilter, setGithubSearchFilter] = useState("");

  // Sandbox playground and upload integration states
  const [sandboxFiles, setSandboxFiles] = useState<{ filePath: string; size: number; lines: number; content: string }[]>([]);
  const [isSandboxLoading, setIsSandboxLoading] = useState(false);
  const [newFileName, setNewFileName] = useState("sandbox/token-jwt.py");
  const [newFileContent, setNewFileContent] = useState(`# Custom code block
# Modify and index through CLI commands!
def check_claims(payload):
    if "admin" in payload.get("roles", []):
         return True
    return False
`);
  const [isSavingCustomFile, setIsSavingCustomFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileToEdit, setFileToEdit] = useState<{ filePath: string; content: string } | null>(null);

  // Terminal Simulator states
  const [terminalHistory, setTerminalHistory] = useState<{ cmd: string; output: string }[]>([
    {
      cmd: "mappu help",
      output: `
==============================================
   ███▄ ▄███▓ ▄▄▄       ██▓███   ███▄   █  █▓     ▓█████
   ▓██▒▀█▀ ██▒▒████▄    ▓██░  ██▒ ██ ▀█   █ ▓██▒    ▓█   ▀
   ▓██    ▓██░▒██  ▀█▄  ▓██░ ██▓▒▓██  ▀█ ██▒▒██░    ▒███
   ▒██    ▒██ ░██▄▄▄▄██ ▒██▄█▓▒ ░▓██▒  ▐▌██▒▒██░    ▒▓█  ▄
   ░██▒   ░██▒ ▓█   ▓██▒▒██▒ ░  ░▒██░   ▓██░░██████▒░▒████▒
==============================================
\x1b[36m\x1b[1m Mappu Engine \x1b[90m- AI Action-Codebase Tracer & Static Auditor\x1b[0m

\x1b[1m⚡ STATIC ANALYSIS ENGINES (Local & Fast):\x1b[0m
  \x1b[38;5;43mmap\x1b[0m                   Renders nested workspace structural architecture
  \x1b[38;5;43mdead\x1b[0m                  Locates dangling modules and inactive files
  \x1b[38;5;43mclone\x1b[0m                 Identifies code duplicate clusters
  \x1b[38;5;43msecurity\x1b[0m              Audits security logic flaws in AST
  \x1b[38;5;43mgit\x1b[0m                   Checks commit churn hotspots & code stats
  \x1b[38;5;43mwatch\x1b[0m                 Launches active directory files watcher

\x1b[36m\x1b[1m🧠 AI-POWERED COGNITIVE ENGINES (Gemini LLM):\x1b[0m
  \x1b[38;5;43minit\x1b[0m                  Scans workspace and builds semantic repository index
  \x1b[38;5;43msearch <query>\x1b[0m        Finds files based on developer intent query
  \x1b[38;5;43mtrace <query>\x1b[0m         Maps execution flow sequences chronologically
  \x1b[38;5;43mdoctor <intent>\x1b[0m       Diagnoses safety leaks, holes, & unhandled paths
  \x1b[38;5;43mrefactor <goal>\x1b[0m       Generates precise modification recipes
  \x1b[38;5;43mexplain <topic>\x1b[0m       Walks through modules & outputs Mermaid diagrams
`
    }
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Intent Finder Search states
  const [searchQuery, setSearchQuery] = useState("where server endpoints are declared");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Call Tracer states
  const [traceQuery, setTraceQuery] = useState("what triggers on post request indexing");
  const [traceFlow, setTraceFlow] = useState<TraceFlow | null>(null);
  const [isTracing, setIsTracing] = useState(false);

  // Diagnostics Doctor states
  const [doctorQuery, setDoctorQuery] = useState("security bounds and authentication checks");
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  // Architectural Refactoring states
  const [refactorQuery, setRefactorQuery] = useState("migrate all API responses to structured JSON error objects");
  const [refactorPlan, setRefactorPlan] = useState<RefactorPlan | null>(null);
  const [isRefactoring, setIsRefactoring] = useState(false);

  // Architecture Explainer states
  const [explainQuery, setExplainQuery] = useState("how the Mappu Core indexes data and queries Gemini");
  const [explainReport, setExplainReport] = useState<ExplanationReport | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Code inspection inspector state
  const [viewingFile, setViewingFile] = useState<{ path: string; code: string } | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Trigger loading initial status on mount
  useEffect(() => {
    fetchStatus();
    fetchSandboxFiles();
  }, []);

  useEffect(() => {
    // Scroll terminal to base automatically
    terminalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalHistory, isIndexing]);

  // Loading Sandbox items
  const fetchSandboxFiles = async () => {
    setIsSandboxLoading(true);
    try {
      const res = await fetch("/api/mappu/sandbox-files");
      if (res.ok) {
        const data = await res.json();
        setSandboxFiles(data.files || []);
      }
    } catch (err: any) {
      console.error("Failed to load sandbox files", err);
    } finally {
      setIsSandboxLoading(false);
    }
  };

  // Safe save handler
  const handleSaveCustomFile = async (customName: string, customContent: string) => {
    if (!customName.trim()) {
      setErrorBanner("Please specify a valid file name.");
      return;
    }
    setIsSavingCustomFile(true);
    try {
      const res = await fetch("/api/mappu/write-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: customName, content: customContent })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to write file.");
      
      // Flash log inside terminal
      setTerminalHistory(prev => [
        ...prev,
        {
          cmd: `cat > "${data.filePath}"`,
          output: `\x1b[32m✔ File written successfully!\x1b[0m\nStored at: \x1b[1m${data.filePath}\x1b[0m\nSize: ${customContent.length} bytes\nLines: ${customContent.split("\n").length}\n\nTip: Run \x1b[38;5;43mmappu init\x1b[0m to index this file!`
        }
      ]);
      
      // Reload sandbox file lists
      await fetchSandboxFiles();
      await fetchStatus();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setIsSavingCustomFile(false);
    }
  };

  // Safe delete handler
  const handleDeleteSandboxFile = async (filePath: string) => {
    if (!confirm(`Are you sure you want to delete ${filePath}?`)) return;
    try {
      const res = await fetch("/api/mappu/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete file.");

      setTerminalHistory(prev => [
        ...prev,
        {
          cmd: `rm "${filePath}"`,
          output: `\x1b[33m\x1b[1m✔ Successfully purged "${filePath}".\x1b[0m`
        }
      ]);

      await fetchSandboxFiles();
      await fetchStatus();
    } catch (err: any) {
      setErrorBanner(err.message);
    }
  };

  // Handle uploading drops or inputs
  const handleFileUpload = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        await handleSaveCustomFile(file.name, text);
      };
      reader.readAsText(file);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/mappu/status");
      if (!res.ok) throw new Error("Could not contact the backend servers.");
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setErrorBanner(err.message);
    }
  };

  // Run real-time Index generation
  const handleIndexCodebase = async () => {
    setIsIndexing(true);
    setIndexingLogs(["Command: mappu init started locally...", "Discovering workspace root directory..."]);
    try {
      const res = await fetch("/api/mappu/init", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed indexing files.");
      
      setIndexingLogs(data.logs || ["Codebase crawled successfully."]);
      await fetchStatus();
      
      // Append success indicator directly to Terminal
      setTerminalHistory(prev => [
        ...prev,
        {
          cmd: "mappu init",
          output: `\x1b[32m✔ Project indexed successfully!\x1b[0m\nProcessed Files: ${data.registry?.totalFiles}\nChunks Cached: ${data.registry?.chunks?.length}`
        }
      ]);
    } catch (err: any) {
      setIndexingLogs(p => [...p, `Error during compilation: ${err.message}`]);
      setErrorBanner(err.message);
    } finally {
      setIsIndexing(false);
    }
  };

  // Run Semantic Query Search
  const triggerIntentSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || searchQuery;
    if (!q.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch("/api/mappu/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Search error.");
      setSearchResults(data.results);
      
      setTerminalHistory(prev => [
        ...prev,
        {
          cmd: `mappu search "${q}"`,
          output: `\x1b[36mQuerying Mappu NLP routing database...\x1b[0m\nMatches Located: ${data.results?.length}\nTop Score: ${data.results[0]?.score || 0}/10`
        }
      ]);
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger Execution Call Tracer
  const triggerTraceLogs = async (overrideQuery?: string) => {
    const q = overrideQuery || traceQuery;
    if (!q.trim()) return;
    setIsTracing(true);
    try {
      const res = await fetch("/api/mappu/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Mapping sequence trace error.");
      setTraceFlow(data.trace);

      setTerminalHistory(prev => [
        ...prev,
        {
          cmd: `mappu trace "${q}"`,
          output: `\x1b[38;5;43mReconstructing AST call traces...\x1b[0m\nSteps extracted: ${data.trace?.steps?.length || 0}\nRoute Summary: ${data.trace?.overviewFlow?.substring(0, 80)}...`
        }
      ]);
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setIsTracing(false);
    }
  };

  // Trigger System Doctor analysis
  const triggerDoctorReview = async (overrideQuery?: string) => {
    const q = overrideQuery || doctorQuery;
    if (!q.trim()) return;
    setIsDiagnosing(true);
    try {
      const res = await fetch("/api/mappu/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Diagnostics failed.");
      setDoctorReport(data.report);

      setTerminalHistory(prev => [
        ...prev,
        {
          cmd: `mappu doctor "${q}"`,
          output: `\x1b[31m[Diagnostics Gate Launched]\x1b[0m\nOverall Robustness Score: ${data.report?.overallScore}%\nFlaws Identified: ${data.report?.issues?.length || 0}`
        }
      ]);
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Safe file content reader modal
  const viewFileContent = async (filePath: string) => {
    setIsLoadingFile(true);
    try {
      const res = await fetch(`/api/mappu/source?file=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not retrieve file content.");
      setViewingFile({ path: filePath, code: data.content });
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Trigger Refactor Blueprint Compiler
  const triggerRefactorPlan = async (overrideQuery?: string) => {
    const q = overrideQuery || refactorQuery;
    if (!q.trim()) return;
    setIsRefactoring(true);
    try {
      const res = await fetch("/api/mappu/refactor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Refactor plan failed.");
      setRefactorPlan(data.plan);

      setTerminalHistory(prev => [
        ...prev,
        {
          cmd: `mappu refactor "${q}"`,
          output: `\x1b[32m[Refactor Planner Initialized]\x1b[0m\nProposed Steps: ${data.plan?.steps?.length || 0}\nPlan Focus: ${data.plan?.directive}`
        }
      ]);
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setIsRefactoring(false);
    }
  };

  // Trigger Explainer diagrammer
  const triggerExplainer = async (overrideQuery?: string) => {
    const q = overrideQuery || explainQuery;
    if (!q.trim()) return;
    setIsExplaining(true);
    try {
      const res = await fetch("/api/mappu/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Explanation generator failed.");
      setExplainReport(data.explanation);

      setTerminalHistory(prev => [
        ...prev,
        {
          cmd: `mappu explain "${q}"`,
          output: `\x1b[36m[System Explainer Activated]\x1b[0m\nWalkthrough: ${data.explanation?.highLevelOverview?.substring(0, 50)}...\nDiagram type: ${data.explanation?.mermaidFlowchart?.substring(0, 40)}`
        }
      ]);
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setIsExplaining(false);
    }
  };

  // Trigger Structured Grep Core Search
  const triggerGrepSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || grepQuery;
    if (!q.trim()) return;
    setIsGrepping(true);
    try {
      const res = await fetch(`/api/mappu/grep?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Grep search failed.");
      setGrepResults(data.results || []);

      setTerminalHistory(prev => [
        ...prev,
        {
          cmd: `mappu grep "${q}"`,
          output: `\x1b[36m⚡ Ripgrep Core Content Scan Activated...\x1b[0m\nHits located across standard workspace: \x1b[32m\x1b[1m${data.results?.length || 0} occurrences\x1b[0m`
        }
      ]);
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setIsGrepping(false);
    }
  };

  // Trigger GitHub Fetch & Importer
  const triggerGithubFetch = async (overrideUrl?: string) => {
    const u = overrideUrl || githubUrl;
    if (!u.trim()) return;
    setIsFetchingGithub(true);
    try {
      const res = await fetch("/api/mappu/github-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "GitHub fetch process failed.");
      setGithubResult(data);

      setTerminalHistory(prev => [
        ...prev,
        {
          cmd: `mappu github-fetch "${u}"`,
          output: `\x1b[32m✔ GitHub endpoint fetch successful!\x1b[0m\nRepository Owner: \x1b[1m${data.owner}\x1b[0m\nRepo Name: \x1b[1m${data.repo}\x1b[0m\nDetected type: \x1b[38;5;43m${data.type.toUpperCase()}\x1b[0m${data.type === 'file' ? `\nSaved sandbox filepath: \x1b[35m${data.savedPath}\x1b[0m` : `\nIndexed entries list: ${data.files?.length || 0} sub-files`}`
        }
      ]);

      if (data.type === "file") {
        fetchSandboxFiles();
      }
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setIsFetchingGithub(false);
    }
  };

  // Submit string to the interactive CLI Simulator
  const handleTerminalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const raw = terminalInput.trim();
    if (!raw) return;

    setTerminalInput("");
    const parts = raw.split(" ");
    const command = parts[0];
    const args = parts.slice(1);

    setTerminalHistory(prev => [...prev, { cmd: raw, output: "\x1b[90mRunning in terminal shell...\x1b[0m" }]);

    try {
      const res = await fetch("/api/mappu/shell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, args })
      });
      const data = await res.json();
      
      setTerminalHistory(prev => {
        const copy = [...prev];
        if (copy.length > 0) {
          copy[copy.length - 1] = { cmd: raw, output: data.output };
        }
        return copy;
      });

      if (command.toLowerCase() === "mappu") {
        const cmdSub = args[0]?.toLowerCase();
        const queryStr = args.slice(1).join(" ");
        if (cmdSub === "init") {
          fetchStatus();
        } else if (cmdSub === "refactor" && queryStr) {
          setRefactorQuery(queryStr);
          switchTab("suite", "refactor");
          triggerRefactorPlan(queryStr);
        } else if (cmdSub === "explain" && queryStr) {
          setExplainQuery(queryStr);
          switchTab("suite", "explain");
          triggerExplainer(queryStr);
        } else if ((cmdSub === "grep" || cmdSub === "rg" || cmdSub === "ripgrep" || cmdSub === "find") && queryStr) {
          setGrepQuery(queryStr);
          switchTab("suite", "grep");
          triggerGrepSearch(queryStr);
        } else if (cmdSub === "github-fetch" && queryStr) {
          setGithubUrl(queryStr);
          switchTab("settings", undefined, "github");
          triggerGithubFetch(queryStr);
        }
      }
    } catch (err: any) {
      setTerminalHistory(prev => [
        ...prev,
        { cmd: raw, output: `\x1b[31mTerminal Connection failure: ${err.message}\x1b[0m` }
      ]);
    }
  };

  // Helper utility converting ANSI tags to styled divs
  const renderAnsiText = (text: string) => {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\x1b\[31m/g, '<span class="text-rose-400">')
      .replace(/\x1b\[32m/g, '<span class="text-emerald-400">')
      .replace(/\x1b\[33m/g, '<span class="text-amber-400">')
      .replace(/\x1b\[36m/g, '<span class="text-cyan-400">')
      .replace(/\x1b\[38;5;43m/g, '<span class="text-teal-400 font-semibold">')
      .replace(/\x1b\[38;5;99m/g, '<span class="text-indigo-400">')
      .replace(/\x1b\[90m/g, '<span class="text-slate-500">')
      .replace(/\x1b\[1m/g, '<span class="font-bold text-white">')
      .replace(/\x1b\[3m/g, '<span class="italic text-slate-300">')
      .replace(/\x1b\[0m/g, "</span>");

    return <div dangerouslySetInnerHTML={{ __html: html }} className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed select-text" />;
  };

  return (
    <div id="mappu-dashboard" className="min-h-screen bg-[#020202] text-slate-100 flex flex-col items-center justify-start font-sans relative overflow-x-hidden selection:bg-teal-500/35 selection:text-teal-100 select-none w-full">
      
      {/* Dynamic Ambient Background Glow Design */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-12 right-1/4 w-[500px] h-[300px] bg-teal-500/5 rounded-full blur-[130px] pointer-events-none" />

      {/* Primary Mobile App Frame Centered */}
      <div className="w-full max-w-2xl min-h-screen bg-[#07070a] border-x border-[#1a1a1e] flex flex-col relative pb-28 shadow-2xl">
        
        {/* Global Toast Alert banner */}
        {errorBanner && (
          <div className="bg-rose-950/90 border-b border-rose-500/30 text-rose-200 px-6 py-3 flex items-center justify-between gap-4 z-50 animate-slide-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-xs">
                <span className="font-bold">Interrupted:</span> {errorBanner}
              </p>
            </div>
            <button 
              onClick={() => setErrorBanner(null)} 
              className="text-xs font-mono px-2 py-1 bg-rose-900/60 border border-rose-800 rounded hover:bg-rose-800 transition"
            >
              Clear
            </button>
          </div>
        )}

        {/* Brand App Header */}
        <header className="border-b border-[#14151a] bg-[#07070a]/80 backdrop-blur-md px-5 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between gap-4">
            
            {/* Logo, title and tag */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/15">
                <Compass className="w-4.5 h-4.5 text-slate-950 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-extrabold tracking-tight text-white uppercase font-sans">Mappu</h1>
                  <span className="font-mono text-[8.5px] px-1.5 py-0.5 bg-amber-955/50 border border-amber-800/40 text-amber-300 rounded font-semibold">
                    APP V1.5
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-400 font-mono">Intent-Based Action Code Tracer</p>
              </div>
            </div>

            {/* Quick action button / Indicator */}
            <div className="flex items-center gap-1.5">
              {status.indexed ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/40 border border-emerald-800/25 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9.5px] font-mono text-emerald-400 font-bold uppercase">Ready</span>
                </div>
              ) : (
                <button
                  disabled={isIndexing}
                  onClick={handleIndexCodebase}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold rounded-full flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCw className={`w-3 h-3 ${isIndexing ? "animate-spin" : ""}`} />
                  Init App
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main responsive pages viewport wrapper */}
        <div className="flex-1 p-4 md:p-5 overflow-y-auto pb-4">

          {/* PAGE 1: DECK VIEW ON HOME PAGE */}
          {activeTab === "home" && (
            <div className="space-y-6 animate-fade-in text-[#f4f4f5]">
              
              {/* Slogan */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-[17px] font-black tracking-tight text-white">Command Decks</h2>
                  <span className="text-[9px] font-mono text-slate-500">{status.totalFiles || 0} modules indexed</span>
                </div>
                <p className="text-[11.5px] text-slate-400 font-normal leading-relaxed">
                  Select an AI action workspace deck to launch semantic scanning and operational automation.
                </p>
              </div>

              {/* Grid Decks */}
              <div className="grid grid-cols-1 gap-3">
                
                {/* DECK 1: CODEBASE GRAPH */}
                <div className="rounded-xl bg-[#0a0a0d] border border-slate-900 p-4 border-l-4 border-indigo-500/80 flex flex-col justify-between min-h-[120px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest">ACTIVE SPACE</span>
                    </div>
                    <h3 className="text-xs font-bold text-white mt-1">Codebase Semantic Index</h3>
                    <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans mt-0.5">
                      Completed mapping. High density token structures compiled for direct execution traces.
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-900">
                    <span className="text-[9px] font-mono text-slate-500">
                      Total Tokens: <span className="text-white font-bold">{status.totalChunks || 0}</span>
                    </span>
                    <button
                      onClick={() => switchTab("settings", undefined, "topology")}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded transition cursor-pointer"
                    >
                      View Map
                    </button>
                  </div>
                </div>

                {/* DECK 2: SHIELD AGENT */}
                <div className="rounded-xl bg-[#0a0a0d] border border-slate-900 p-4 border-l-4 border-rose-500/80 flex flex-col justify-between min-h-[120px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-widest">HEALTH AGENT</span>
                    </div>
                    <h3 className="text-xs font-bold text-white mt-1">System Diagnostic Doctor</h3>
                    <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans mt-0.5">
                      Performs deep edge checking, compliance validations, and maps potential structural leak points.
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-900">
                    <span className="text-[9px] font-mono text-slate-500">Diagnostics ready</span>
                    <button
                      onClick={() => switchTab("suite", "doctor")}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded transition cursor-pointer"
                    >
                      Diagnose Systems
                    </button>
                  </div>
                </div>

                {/* DECK 3: EXECUTED SCRIPTS SLIDES */}
                <div className="rounded-xl bg-[#0a0a0d] border border-slate-900 p-4 border-l-4 border-amber-500/80 flex flex-col justify-between min-h-[120px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest">SANDBOX EXECUTOR</span>
                    </div>
                    <h3 className="text-xs font-bold text-white mt-1">Script Runner & Playgrounds</h3>
                    <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans mt-0.5">
                      Direct sandbox storage playground for uploading, drag-and-dropping and running system code blocks.
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-900">
                    <span className="text-[9px] font-mono text-slate-500">
                      Sandbox Files: <span className="text-white font-bold">{sandboxFiles.length} uploaded</span>
                    </span>
                    <button
                      onClick={() => switchTab("sandbox")}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded transition cursor-pointer"
                    >
                      Launch Playground
                    </button>
                  </div>
                </div>

                {/* DECK 4: SCAFFOLDER DESIGNS */}
                <div className="rounded-xl bg-[#0a0a0d] border border-slate-900 p-4 border-l-4 border-emerald-500/80 flex flex-col justify-between min-h-[120px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                      <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest">SCAFFOLDER GATE</span>
                    </div>
                    <h3 className="text-xs font-bold text-white mt-1">Avant-Garde Framework Scaffolder</h3>
                    <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans mt-0.5">
                      Instant generation engine of Elysia, Hono, Bun, and Fastify microservices.
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-900">
                    <span className="text-[9px] font-mono text-slate-500">Framework scaffolds ready</span>
                    <button
                      onClick={() => switchTab("settings", undefined, "framework")}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded transition cursor-pointer"
                    >
                      Run Boilerplates
                    </button>
                  </div>
                </div>

              </div>

              {/* INTEGRATED MASTER SHELL DIRECTLY AT BASE OF HOME PAGE */}
              <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950 mt-4">
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950 border-b border-slate-900 text-[10px] font-mono font-bold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    Interactive master shell terminal
                  </span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  </div>
                </div>

                <div className="p-3 bg-[#030305] max-h-[160px] overflow-y-auto flex flex-col space-y-2.5 font-mono text-[10px]">
                  {terminalHistory.slice(-3).map((entry, index) => (
                    <div key={index} className="space-y-0.5">
                      <div className="flex items-center gap-1 text-slate-500">
                        <span className="text-amber-500 font-bold">$</span>
                        <span>{entry.cmd}</span>
                      </div>
                      <div className="pl-2 border-l border-slate-900 text-slate-300 select-text overflow-x-auto leading-normal whitespace-pre-wrap">
                        {renderAnsiText(entry.output)}
                      </div>
                    </div>
                  ))}
                  <div ref={terminalBottomRef} />
                </div>

                <form onSubmit={handleTerminalSubmit} className="p-2 bg-slate-950 flex items-center gap-1.5 border-t border-slate-900">
                  <span className="font-mono text-xs font-bold text-slate-600">$</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="Type console command or bash command directly..."
                    className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-[10px] font-mono text-amber-400 placeholder-slate-750"
                  />
                  <button type="submit" className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[9px] text-slate-400 hover:text-white font-mono transition cursor-pointer">
                    Execute
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* PAGE 2: EXPLORE / SUITE WORKSPACE */}
          {(activeTab === "suite") && (
            <div className="space-y-6 animate-fade-in text-slate-100">
              
              {/* Secondary top sub-tabs selector header categorized by architecture */}
              <div className="space-y-4">
                {/* AI-Powered Cognitive Section */}
                <div>
                  <div className="text-[9px] font-mono font-black tracking-widest text-teal-400 mb-2 uppercase flex items-center gap-1.5 pl-1 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                    🧠 AI-Powered Cognitive Engines (Gemini core)
                  </div>
                  <div className="flex border border-slate-900 bg-slate-950/60 p-1 rounded-xl gap-1 shrink-0 overflow-x-auto scrollbar-none select-none">
                    {(["search", "trace", "doctor", "explain", "refactor"] as const).map((tab) => {
                      let icon = <Layers className="w-3.5 h-3.5" />;
                      let label = tab.toUpperCase();
                      if (tab === "search") {
                        icon = <Search className="w-3.5 h-3.5" />;
                        label = "INTENT SEARCH";
                      } else if (tab === "trace") {
                        icon = <Layers className="w-3.5 h-3.5" />;
                        label = "EX-TRACER";
                      } else if (tab === "doctor") {
                        icon = <Shield className="w-3.5 h-3.5" />;
                        label = "DIAGNOSTICS";
                      } else if (tab === "refactor") {
                        icon = <Wrench className="w-3.5 h-3.5 mt-0.5" />;
                        label = "REFACTOR";
                      } else if (tab === "explain") {
                        icon = <BookOpen className="w-3.5 h-3.5 animate-pulse" />;
                        label = "EXPLAINER";
                      }

                      const isSelected = activeSuiteTab === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveSuiteTab(tab)}
                          className={`px-3 py-1.5 text-[10.5px] font-mono tracking-wide rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-bold ${
                            isSelected
                              ? "bg-slate-900 text-teal-400 border border-slate-800"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                          }`}
                        >
                          {icon}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Static Analysis Section */}
                <div>
                  <div className="text-[9px] font-mono font-black tracking-widest text-indigo-400 mb-2 uppercase flex items-center gap-1.5 pl-1 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    🛠 Local Static Scanners (Fast AST Scans)
                  </div>
                  <div className="flex border border-slate-900 bg-slate-950/60 p-1 rounded-xl gap-1 shrink-0 overflow-x-auto scrollbar-none select-none">
                    {(["grep", "dead", "clone", "security", "git", "scope", "benchmark", "test-gap", "diff"] as const).map((tab) => {
                      let icon = <Search className="w-3.5 h-3.5" />;
                      let label = "LIVE CODE RIPGREPPING";
                      if (tab === "dead") {
                        icon = <Trash2 className="w-3.5 h-3.5" />;
                        label = "DEAD CODE";
                      } else if (tab === "clone") {
                        icon = <Layers className="w-3.5 h-3.5" />;
                        label = "CLONES";
                      } else if (tab === "security") {
                        icon = <Shield className="w-3.5 h-3.5 text-rose-400" />;
                        label = "SAST SECURITY";
                      } else if (tab === "git") {
                        icon = <Clock className="w-3.5 h-3.5 text-amber-400" />;
                        label = "GIT CHURN";
                      } else if (tab === "scope") {
                        icon = <Compass className="w-3.5 h-3.5 text-indigo-400" />;
                        label = "LAYER SCOPE";
                      } else if (tab === "benchmark") {
                        icon = <Zap className="w-3.5 h-3.5 text-amber-500" />;
                        label = "PERFORMANCE";
                      } else if (tab === "test-gap") {
                        icon = <Award className="w-3.5 h-3.5 text-cyan-400" />;
                        label = "TEST GAP";
                      } else if (tab === "diff") {
                        icon = <GitCompare className="w-3.5 h-3.5 text-emerald-400" />;
                        label = "STAGE IMPACT";
                      }

                      const isSelected = activeSuiteTab === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveSuiteTab(tab)}
                          className={`px-3 py-1.5 text-[10.5px] font-mono tracking-wide rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-bold ${
                            isSelected
                              ? "bg-slate-900 text-indigo-400 border border-slate-800"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                          }`}
                        >
                          {icon}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Render dynamic sub-suite tabs based on selection */}
              <div className="space-y-4">
                {activeSuiteTab === "search" && (
                  <SearchTab
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchResults={searchResults}
                    isSearching={isSearching}
                    status={status}
                    triggerIntentSearch={triggerIntentSearch}
                    viewFileContent={viewFileContent}
                  />
                )}

                {activeSuiteTab === "trace" && (
                  <TraceTab
                    traceQuery={traceQuery}
                    setTraceQuery={setTraceQuery}
                    traceFlow={traceFlow}
                    isTracing={isTracing}
                    status={status}
                    triggerTraceLogs={triggerTraceLogs}
                    viewFileContent={viewFileContent}
                  />
                )}

                {activeSuiteTab === "doctor" && (
                  <DoctorTab
                    doctorQuery={doctorQuery}
                    setDoctorQuery={setDoctorQuery}
                    doctorReport={doctorReport}
                    isDiagnosing={isDiagnosing}
                    status={status}
                    triggerDoctorReview={triggerDoctorReview}
                    viewFileContent={viewFileContent}
                  />
                )}

                {activeSuiteTab === "refactor" && (
                  <RefactorTab
                    refactorQuery={refactorQuery}
                    setRefactorQuery={setRefactorQuery}
                    refactorPlan={refactorPlan}
                    isRefactoring={isRefactoring}
                    status={status}
                    triggerRefactorPlan={triggerRefactorPlan}
                    viewFileContent={viewFileContent}
                  />
                )}

                {activeSuiteTab === "explain" && (
                  <ExplainTab
                    explainQuery={explainQuery}
                    setExplainQuery={setExplainQuery}
                    explainReport={explainReport}
                    isExplaining={isExplaining}
                    status={status}
                    triggerExplainer={triggerExplainer}
                    viewFileContent={viewFileContent}
                  />
                )}

                {activeSuiteTab === "grep" && (
                  <GrepTab
                    grepQuery={grepQuery}
                    setGrepQuery={setGrepQuery}
                    grepResults={grepResults}
                    setGrepResults={setGrepResults}
                    isGrepping={isGrepping}
                    triggerGrepSearch={triggerGrepSearch}
                    viewFileContent={viewFileContent}
                  />
                )}

                {activeSuiteTab === "dead" && (
                  <DeadTab
                    status={status}
                    viewFileContent={viewFileContent}
                  />
                )}

                {activeSuiteTab === "clone" && (
                  <CloneTab
                    status={status}
                    viewFileContent={viewFileContent}
                  />
                )}

                {activeSuiteTab === "security" && (
                  <SecurityTab
                    status={status}
                    viewFileContent={viewFileContent}
                  />
                )}

                {activeSuiteTab === "git" && (
                  <GitTab
                    status={status}
                  />
                )}

                {activeSuiteTab === "scope" && (
                  <ScopeTab
                    status={status}
                    viewFileContent={viewFileContent}
                  />
                )}

                {activeSuiteTab === "benchmark" && (
                  <BenchmarkTab
                    status={status}
                    viewFileContent={viewFileContent}
                  />
                )}

                {activeSuiteTab === "test-gap" && (
                  <TestGapTab
                    status={status}
                    viewFileContent={viewFileContent}
                  />
                )}

                {activeSuiteTab === "diff" && (
                  <DiffTab
                    status={status}
                    viewFileContent={viewFileContent}
                  />
                )}
              </div>
            </div>
          )}

          {/* PAGE 3: SANDBOX PLAYGROUND */}
          {activeTab === "sandbox" && (
            <div className="space-y-6 animate-fade-in text-slate-100">
              <SandboxTab
                newFileName={newFileName}
                setNewFileName={setNewFileName}
                newFileContent={newFileContent}
                setNewFileContent={setNewFileContent}
                isSavingCustomFile={isSavingCustomFile}
                handleSaveCustomFile={handleSaveCustomFile}
                dragActive={dragActive}
                setDragActive={setDragActive}
                handleFileUpload={handleFileUpload}
                fetchSandboxFiles={fetchSandboxFiles}
                isSandboxLoading={isSandboxLoading}
                sandboxFiles={sandboxFiles}
                setDoctorQuery={setDoctorQuery}
                setActiveTab={(tab) => {
                  if (["trace", "doctor", "refactor", "explain", "grep", "search"].includes(tab)) {
                    switchTab("suite", tab as any);
                  } else {
                    switchTab(tab as any);
                  }
                }}
                setIsDiagnosing={setIsDiagnosing}
                setDoctorReport={setDoctorReport}
                setExplainQuery={setExplainQuery}
                setIsExplaining={setIsExplaining}
                setExplainReport={setExplainReport}
                setViewingFile={setViewingFile}
                handleDeleteSandboxFile={handleDeleteSandboxFile}
                isIndexing={isIndexing}
                setIsIndexing={setIsIndexing}
                setIndexingLogs={setIndexingLogs}
                fetchStatus={fetchStatus}
                setTerminalHistory={setTerminalHistory}
                setErrorBanner={setErrorBanner}
                setTerminalInput={setTerminalInput}
              />
            </div>
          )}

          {/* PAGE 4: SETTINGS & TOOLS */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fade-in text-slate-100">
              
              {/* Settings top navigation choices row */}
              <div className="flex border border-slate-905 bg-slate-950/60 p-1 rounded-xl gap-1 shrink-0 overflow-x-auto scrollbar-none select-none">
                {(["framework", "github", "topology"] as const).map((tab) => {
                  let icon = <Wrench className="w-3.5 h-3.5" />;
                  let label = tab.toUpperCase();
                  if (tab === "framework") {
                    icon = <Zap className="w-3.5 h-3.5 text-rose-400" />;
                    label = "BOILERPLATES";
                  } else if (tab === "github") {
                    icon = <Compass className="w-3.5 h-3.5 text-sky-400" />;
                    label = "GITHUB SUITE";
                  } else if (tab === "topology") {
                    icon = <FileCode className="w-3.5 h-3.5" />;
                    label = "TOPOLOGY";
                  }

                  const isSelected = activeSettingsTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveSettingsTab(tab)}
                      className={`px-3 py-1.5 text-[10.5px] font-mono tracking-wide rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-bold ${
                        isSelected
                          ? "bg-slate-900 text-teal-400 border border-slate-800"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic settings tabs details rendered directly */}
              <div className="space-y-4">
                {activeSettingsTab === "framework" && (
                  <FrameworkTab
                    status={status}
                    viewFileContent={async (path) => viewFileContent(path)}
                    handleSaveCustomFile={handleSaveCustomFile}
                    fetchSandboxFiles={fetchSandboxFiles}
                    onFrameworkScaffoldSuccess={(fileName) => {
                      setTerminalHistory(prev => [
                        ...prev,
                        { cmd: `mappu scaffold "${fileName}"`, output: `\x1b[32m✔ Scaffold completed successfully!\x1b[0m\nFile: \x1b[1msandbox/${fileName}\x1b[0m created on sandbox storage.` }
                      ]);
                    }}
                  />
                )}

                {activeSettingsTab === "github" && (
                  <GithubTab
                    githubUrl={githubUrl}
                    setGithubUrl={setGithubUrl}
                    githubResult={githubResult}
                    setGithubResult={setGithubResult}
                    isFetchingGithub={isFetchingGithub}
                    triggerGithubFetch={triggerGithubFetch}
                    githubSearchFilter={githubSearchFilter}
                    setGithubSearchFilter={setGithubSearchFilter}
                    viewFileContent={viewFileContent}
                    setDoctorQuery={setDoctorQuery}
                    setActiveTab={(tab) => {
                      if (["trace", "doctor", "refactor", "explain", "grep", "search"].includes(tab)) {
                        switchTab("suite", tab as any);
                      } else {
                        switchTab(tab as any);
                      }
                    }}
                    setIsDiagnosing={setIsDiagnosing}
                    setDoctorReport={setDoctorReport}
                    setExplainQuery={setExplainQuery}
                    setIsExplaining={setIsExplaining}
                    setExplainReport={setExplainReport}
                    setViewingFile={setViewingFile}
                  />
                )}

                {activeSettingsTab === "topology" && (
                  <TopologyTab
                    status={status}
                    viewFileContent={viewFileContent}
                  />
                )}
              </div>

            </div>
          )}

        </div>

        {/* PERSISTENT MOBILE BOTTOM TAB NAVIGATION BAR BAR */}
        <nav className="absolute bottom-0 left-0 right-0 h-16 bg-[#0a0a0e] border-t border-[#1a1a2e]/60 flex items-center justify-around px-2 z-40 shadow-xl">
          {[
            { id: "home", label: "Home", icon: <Home className="w-5 h-5" /> },
            { id: "explore", label: "Explore", icon: <Compass className="w-5 h-5" />, alias: "suite" },
            { id: "sandbox", label: "Sandbox", icon: <Cpu className="w-5 h-5" /> },
            { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
          ].map((item) => {
            const isSelected = activeTab === item.id || (item.alias && activeTab === item.alias);
            return (
              <button
                key={item.id}
                onClick={() => switchTab((item.alias || item.id) as any)}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95 cursor-pointer ${
                  isSelected ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-mono tracking-tight font-bold">{item.label}</span>
              </button>
            );
          })}
        </nav>

      </div>

      {/* Code Viewer Portal modal dialog split screen overlay */}
      {viewingFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-text">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            {/* Modal header bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-b border-slate-900">
              <div className="flex items-center gap-2 pr-4">
                <FileCode className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-white truncate break-all">
                  Inspect: {viewingFile.path}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    const blob = new Blob([viewingFile.code], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = viewingFile.path.split("/").pop() || "source.txt";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs font-mono px-2.5 py-1 bg-teal-955 border border-teal-850 text-teal-300 hover:text-white rounded hover:bg-teal-900 transition cursor-pointer flex items-center gap-1 font-bold"
                  title="Download reviewed source file directly!"
                >
                  <Download className="w-3 h-3 text-teal-400" />
                  Download File
                </button>
                <button
                  onClick={() => setViewingFile(null)}
                  className="text-xs font-mono px-2 py-1 bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Source Display segment code box layout */}
            <div className="p-4 flex-1 overflow-auto bg-slate-950 text-[11px] font-mono leading-normal text-slate-200">
              <pre className="text-left font-mono block whitespace-pre select-text">
                {viewingFile.code.split("\n").map((line, idx) => (
                  <div key={idx} className="table-row hover:bg-slate-900/40 w-full select-text">
                    <span className="table-cell text-right pr-4 text-slate-600 font-bold select-none text-[10px] bg-slate-950 sticky left-0 w-8 z-10">
                      {idx + 1}
                    </span>
                    <span className="table-cell pl-2 break-all whitespace-pre select-text">
                      {line || " "}
                    </span>
                  </div>
                ))}
              </pre>
            </div>
            
            {/* Safe modal footer banner */}
            <div className="px-5 py-3 bg-slate-950 border-t border-slate-900 flex items-center justify-between text-slate-500 font-mono text-[9px]">
              <span>WORKSPACE SECURE READER PATH RULES APPLIED</span>
              <span>Total Lines: {viewingFile.code.split("\n").length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Aesthetic minimalistic brand footer element */}
      <footer className="mt-8 border-t border-slate-900 bg-slate-950 py-6 px-6 relative z-10 text-center select-none w-full max-w-2xl">
        <p className="font-mono text-[9px] tracking-widest text-slate-600 uppercase flex items-center justify-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-slate-700 animate-pulse" /> MAPPU GROUNDED CORE • CRAFT TIME UTC 2026
        </p>
      </footer>
    </div>
  );
}

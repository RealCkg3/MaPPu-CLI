import * as React from "react";
import { useState } from "react";
import { FrameworkDiscovery, IndexStatus } from "../../types";
import { Cpu, Search, RotateCw, CheckCircle, Download, FolderOpen, AlertTriangle, ArrowRight, Play, Server, Layers, Percent, Zap } from "lucide-react";

interface FrameworkTabProps {
  status: IndexStatus;
  viewFileContent: (filePath: string) => Promise<void>;
  handleSaveCustomFile: (filePath: string, content: string) => void;
  fetchSandboxFiles: () => void;
  onFrameworkScaffoldSuccess?: (fileName: string) => void;
}

const CuratedPresets = [
  {
    name: "Elysia.js",
    query: "elysia",
    tech: "Bun & TypeScript",
    tagline: "Ultra-fast, end-to-end type safe HTTP framework for Bun.",
    speed: "99%",
    iconColor: "text-rose-400 border-rose-950/40 bg-rose-955/20"
  },
  {
    name: "Hono.js",
    query: "hono router",
    tech: "Edge TypeScript",
    tagline: "Ultrafast light standard web framework that runs on any JS runtime.",
    speed: "96%",
    iconColor: "text-amber-400 border-amber-955/30 bg-amber-955/10"
  },
  {
    name: "Astro Islands",
    query: "astro static site islands",
    tech: "Static & Islands",
    tagline: "Hyper-optimized multi-page framework delivering Zero JavaScript by default.",
    speed: "93%",
    iconColor: "text-indigo-400 border-indigo-950/40 bg-indigo-955/20"
  },
  {
    name: "Tauri Apps",
    query: "tauri rust frontend desktop",
    tech: "Rust & JS Webview",
    tagline: "Build tiny, lightning safe desktop applications using web frontends.",
    speed: "98%",
    iconColor: "text-emerald-400 border-emerald-950/40 bg-emerald-955/25"
  },
  {
    name: "E2B Sandbox",
    query: "e2b runtime wasm sandbox python node",
    tech: "AI Agents Sandbox",
    tagline: "Secure local/cloud virtual sandboxes for agents to run untrusted code.",
    speed: "95%",
    iconColor: "text-cyan-400 border-cyan-950/40 bg-cyan-955/20"
  },
  {
    name: "SurrealDB",
    query: "surrealdb database schema sync",
    tech: "Rust-native Multi-model",
    tagline: "Real-time SQL graph document document database.",
    speed: "97%",
    iconColor: "text-purple-400 border-purple-950/40 bg-purple-955/20"
  }
];

export default function FrameworkTab({
  status,
  viewFileContent,
  handleSaveCustomFile,
  fetchSandboxFiles,
  onFrameworkScaffoldSuccess
}: FrameworkTabProps) {
  const [query, setQuery] = useState("elysia");
  const [isSearching, setIsSearching] = useState(false);
  const [discovery, setDiscovery] = useState<FrameworkDiscovery | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  async function triggerSearch(overrideQuery?: string) {
    const activeQuery = (overrideQuery || query).trim();
    if (!activeQuery) return;

    setIsSearching(true);
    setErrorMessage(null);
    setSaveStatus(null);
    try {
      const response = await fetch("/api/mappu/framework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: activeQuery })
      });

      if (!response.ok) {
        throw new Error(`Framework API error: status ${response.status}`);
      }

      const data = await response.json();
      if (data.discovery) {
        setDiscovery(data.discovery);
      } else {
        throw new Error("Empty boilerplate metadata returned.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong fetching cutting edge frameworks.");
    } finally {
      setIsSearching(false);
    }
  }

  function downloadBoilerplateFile() {
    if (!discovery) return;
    try {
      const blob = new Blob([discovery.boilerplateCode], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = discovery.boilerplateFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErrorMessage("Download error: " + e.message);
    }
  }

  function handleSaveToSandbox() {
    if (!discovery) return;
    setSaveStatus("Saving...");
    try {
      handleSaveCustomFile(`sandbox/${discovery.boilerplateFileName}`, discovery.boilerplateCode);
      setTimeout(() => {
        setSaveStatus("Saved successfully!");
        fetchSandboxFiles();
        if (onFrameworkScaffoldSuccess) {
          onFrameworkScaffoldSuccess(discovery.boilerplateFileName);
        }
      }, 800);
    } catch (e: any) {
      setSaveStatus("Error: " + e.message);
    }
  }

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Intro Header */}
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-rose-400 animate-pulse" />
          INSANE FRAMEWORKS DISCOVERY & SCAFFOLDING STUDIO
        </h2>
        <p className="text-[11px] text-slate-400">
          Discover lightning-fast modern APIs, edge routers, secure execution sandboxes, and modern databases. Auto-scaffold boilerplates directly to your computer or map them to your sandbox playground.
        </p>
      </div>

      {/* Main Search and input bar */}
      <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-3.5">
        <span className="text-[10px] uppercase font-mono tracking-widest text-teal-400 font-bold block flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" />
          Input Stack or Research Query
        </span>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
            placeholder="Search e.g., 'Elysia', 'light edge router', 'high-perf rust micro-service'"
            className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
          />
          <button
            disabled={isSearching}
            onClick={() => triggerSearch()}
            className="px-5 py-2 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-slate-955 transition text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            {isSearching ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-slate-955" />}
            Research Stack
          </button>
        </div>

        {/* Curator Pre-seeded links */}
        <div className="space-y-1.5 pt-1 border-t border-slate-900/60">
          <span className="text-[9px] font-mono text-slate-500 block">Or explore Curated Avant-Garde Presets:</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {CuratedPresets.map((preset, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(preset.query);
                  triggerSearch(preset.query);
                }}
                className={`text-left p-2.5 rounded-lg border hover:border-teal-500/50 transition cursor-pointer flex flex-col justify-between h-20 ${preset.iconColor}`}
              >
                <div>
                  <div className="text-[10.5px] font-extrabold text-white font-sans truncate">{preset.name}</div>
                  <div className="text-[8px] text-slate-400 font-sans line-clamp-2 mt-0.5 tracking-tight leading-tight">{preset.tagline}</div>
                </div>
                <div className="flex items-center justify-between mt-1 text-[8px] font-mono border-t border-white/5 pt-1 uppercase">
                  <span className="text-slate-500 font-bold">{preset.tech.split(" ")[0]}</span>
                  <span className="text-teal-300 font-extrabold">⚡ {preset.speed}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-950/20 border border-rose-900/40 text-rose-300 text-xs font-mono rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Discovery Blueprint panel */}
      {isSearching ? (
        <div className="p-16 text-center text-slate-500 border border-slate-900 bg-slate-950/20 rounded-xl space-y-3">
          <RotateCw className="w-8 h-8 animate-spin text-rose-400 mx-auto" />
          <div>
            <p className="text-xs font-mono text-slate-300 font-bold tracking-widest uppercase">DISCOVERING AVANT-GARDE TECH...</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">Evaluating architecture speed benchmarks, crawling Github trends, and writing Working Scaffold Boilerplate API...</p>
          </div>
        </div>
      ) : discovery ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Stack Technical Specs block */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 space-y-4 shadow-md">
              <div className="space-y-1">
                <span className="text-[8.5px] font-mono tracking-widest px-2 py-0.5 bg-rose-955/20 border border-rose-950 text-rose-300 font-extrabold rounded uppercase">
                  FRAMEWORK AUDIT METRICS
                </span>
                <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5 pt-1.5">
                  <Server className="w-4.5 h-4.5 text-rose-400" />
                  {discovery.name}
                </h3>
                <p className="text-xs font-medium text-slate-300 italic">
                  "{discovery.tagline}"
                </p>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed text-justify">
                {discovery.description}
              </p>

              <div className="grid grid-cols-2 gap-3.5 border-t border-b border-slate-900 py-3.5">
                <div className="space-y-1 bg-slate-900/20 p-2.5 rounded-lg border border-slate-900">
                  <span className="text-[8px] font-mono text-slate-500 uppercase font-bold block">PERFORMANCE GAIN</span>
                  <div className="flex items-center gap-1 pt-0.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-300 font-mono">{discovery.performanceScore}%</span>
                  </div>
                </div>

                <div className="space-y-1 bg-slate-900/20 p-2.5 rounded-lg border border-slate-900">
                  <span className="text-[8px] font-mono text-slate-500 uppercase font-bold block">GITHUB ADOPTION</span>
                  <div className="flex items-center gap-1 pt-0.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-sm font-bold text-purple-300 font-mono">{discovery.starsEstimate} stars</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block font-bold">
                  KEY VALUE HIGHLIGHTS:
                </span>
                <div className="space-y-2">
                  {discovery.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10.5px]">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300 font-medium leading-normal">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-900 pt-3.5">
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block font-bold">
                  SCAFFOLD SETUP:
                </span>
                <div className="p-3 bg-slate-900/60 border border-slate-900 rounded-lg flex items-center justify-between font-mono text-xs text-yellow-300 font-bold select-all">
                  <span>{discovery.installCommand}</span>
                </div>
              </div>

            </div>

            {/* Sub-features bento */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block font-bold">
                Ecosystem Spotlight Features
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {discovery.keyFeatures.map((feat, k) => (
                  <div key={k} className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-lg space-y-1">
                    <div className="text-[11px] font-extrabold text-teal-300 font-mono flex items-center gap-1.5 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      {feat.feature}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal pl-3">
                      {feat.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Scaffold code and actions block */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden flex flex-col shadow-md">
              
              {/* Box header with download/save tabs */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border-b border-slate-900 select-none">
                <div className="flex items-center gap-2 pr-4 min-w-0">
                  <Layers className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-xs font-mono font-bold text-white truncate break-all">
                    Generative Boilerplate: {discovery.boilerplateFileName}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleSaveToSandbox}
                    className="px-2.5 py-1.5 bg-slate-955 hover:bg-emerald-955/35 border border-slate-800 hover:border-emerald-500/30 text-[9.5px] font-mono font-bold text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                  >
                    {saveStatus || "Load to Sandbox"}
                  </button>
                  
                  <button
                    onClick={downloadBoilerplateFile}
                    className="p-1.5 bg-slate-955 hover:bg-rose-955/30 hover:text-white border border-slate-800 hover:border-rose-500/20 text-slate-400 rounded-lg transition cursor-pointer flex items-center justify-center"
                    title="Download Physical Code File Directly!"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Boilerplate code viewing box */}
              <div className="p-4 overflow-auto bg-slate-955 text-[11px] font-mono leading-normal text-slate-200 select-text max-h-[500px]">
                <pre className="text-left font-mono block whitespace-pre select-text">
                  {discovery.boilerplateCode.split("\n").map((line, idx) => (
                    <div key={idx} className="table-row hover:bg-slate-900/40 w-full select-text">
                      <span className="table-cell text-right pr-4 text-slate-600 font-bold select-none text-[10px] bg-slate-955 sticky left-0 w-8 z-10">
                        {idx + 1}
                      </span>
                      <span className="table-cell pl-2 break-all whitespace-pre select-text">
                        {line || " "}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>

              {/* Code viewer footer banner */}
              <div className="px-4 py-2.5 bg-slate-900/60 border-t border-slate-900 flex items-center justify-between text-slate-500 font-mono text-[9px]">
                <span>Mappu Client-Side ZIP/BLOB code compilation rules active</span>
                <span>Lines: {discovery.boilerplateCode.split("\n").length}</span>
              </div>

            </div>

          </div>

        </div>
      ) : (
        <div className="border border-dashed border-slate-900 p-12 text-center rounded-xl text-slate-400 space-y-2">
          <FolderOpen className="w-8 h-8 text-slate-700 mx-auto" />
          <p className="text-xs font-bold text-slate-300">Ready to Discover Stacks</p>
          <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
            Input a query above, or click on any of our curated avant-garde presets to query our Gemini Research Engine.
          </p>
        </div>
      )}

    </div>
  );
}

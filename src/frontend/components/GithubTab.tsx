import { GithubResult } from "../../types";
import { Compass, RotateCw, Play, Check, Search, Trash2 } from "lucide-react";

interface GithubTabProps {
  githubUrl: string;
  setGithubUrl: (val: string) => void;
  githubResult: GithubResult | null;
  setGithubResult: (val: GithubResult | null) => void;
  isFetchingGithub: boolean;
  triggerGithubFetch: (overrideVal?: string) => Promise<any>;
  githubSearchFilter: string;
  setGithubSearchFilter: (val: string) => void;
  viewFileContent: (path: string) => void;
  setDoctorQuery: (val: string) => void;
  setActiveTab: (val: string) => void;
  setIsDiagnosing: (val: boolean) => void;
  setDoctorReport: (val: any) => void;
  setExplainQuery: (val: string) => void;
  setIsExplaining: (val: boolean) => void;
  setExplainReport: (val: any) => void;
  setViewingFile: (val: any) => void;
}

export default function GithubTab({
  githubUrl,
  setGithubUrl,
  githubResult,
  setGithubResult,
  isFetchingGithub,
  triggerGithubFetch,
  githubSearchFilter,
  setGithubSearchFilter,
  viewFileContent,
  setDoctorQuery,
  setActiveTab,
  setIsDiagnosing,
  setDoctorReport,
  setExplainQuery,
  setIsExplaining,
  setExplainReport,
  setViewingFile,
}: GithubTabProps) {
  return (
    <div className="space-y-6 text-slate-100">
      {/* Intro header */}
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Compass className="w-4 h-4 text-sky-400" />
          GITHUB MASTER IMPORT SUITE & REPOSITORY RETRIEVER
        </h2>
        <p className="text-[11px] text-slate-400">
          Connect public repository directories or clone raw codes directly into the Node workspace sandbox folders using simple repository URLs.
        </p>
      </div>

      {/* Input form */}
      <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Compass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="e.g. https://github.com/expressjs/express/blob/master/lib/express.js..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
            />
          </div>
          <button
            disabled={isFetchingGithub || !githubUrl.trim()}
            onClick={() => triggerGithubFetch()}
            className="px-5 py-2.5 bg-sky-500 text-slate-950 hover:bg-sky-400 transition text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
          >
            {isFetchingGithub ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
            Fetch GitHub
          </button>
        </div>

        {/* Hotlinks example selectors */}
        <div className="flex gap-2 items-center flex-wrap select-none pt-1">
          <span className="text-[10px] text-slate-500 font-mono">Example Paths:</span>
          <button
            onClick={() => {
              const link = "https://github.com/expressjs/express";
              setGithubUrl(link);
              triggerGithubFetch(link);
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-sky-500/40 cursor-pointer font-mono font-medium"
          >
            Express Repo Root
          </button>
          <button
            onClick={() => {
              const link = "https://github.com/expressjs/express/blob/master/lib/application.js";
              setGithubUrl(link);
              triggerGithubFetch(link);
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-sky-500/40 cursor-pointer font-mono font-medium"
          >
            Express application.js
          </button>
          <button
            onClick={() => {
              const link = "https://github.com/lucide-react/lucide";
              setGithubUrl(link);
              triggerGithubFetch(link);
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-sky-500/40 cursor-pointer font-mono font-medium"
          >
            Lucide React Repo
          </button>
        </div>
      </div>

      {/* Loading state telemetry box */}
      {isFetchingGithub ? (
        <div className="space-y-4 py-12 text-center animate-pulse border border-slate-900 bg-slate-950/20 rounded-2xl">
          <RotateCw className="w-8 h-8 text-sky-400 animate-spin mx-auto opacity-80" />
          <p className="text-xs text-sky-400 font-bold font-mono tracking-widest uppercase mb-1">
            CONNECTING TO GITHUB SUITE PROXIES...
          </p>
          <p className="text-[10px] text-slate-500 font-mono max-w-xs mx-auto leading-normal">
            Parsing URL patterns, fetching raw directory lists, and compiling sandbox structures recursively.
          </p>
        </div>
      ) : githubResult ? (
        <div className="space-y-4">
          {/* Header meta data matching parameters */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-sky-950 text-sky-300 font-bold rounded-lg flex items-center justify-center border border-sky-850">
                <Check className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-wide uppercase">
                  CONNECTED: {githubResult.owner} / {githubResult.repo}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Current active branch: <span className="text-sky-400 font-semibold">{githubResult.branch}</span> | Layout type: <span className="capitalize text-emerald-400 font-bold">{githubResult.type}</span>
                </p>
              </div>
            </div>

            <button onClick={() => setGithubResult(null)} className="text-[10px] font-mono text-slate-500 hover:text-white transition cursor-pointer">
              Clear Fetch
            </button>
          </div>

          {/* DIRECTORY VIEW */}
          {githubResult.type === "directory" && (
            <div className="space-y-4">
              {/* Search filter inner */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={githubSearchFilter}
                  onChange={(e) => setGithubSearchFilter(e.target.value)}
                  placeholder="Filter fetched files list in real-time..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-900 rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                />
              </div>

              {/* Inventory Lists */}
              <div className="bg-slate-950/80 border border-slate-900 rounded-xl overflow-hidden divide-y divide-slate-900/45">
                {githubResult.files &&
                  githubResult.files
                    .filter((f) => f.name.toLowerCase().includes(githubSearchFilter.toLowerCase()))
                    .map((f, i) => (
                      <div key={i} className="p-3 flex items-center justify-between gap-4 text-xs hover:bg-slate-900/20 transition duration-150">
                        
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0 select-none">
                            {f.type === "dir" ? "📁" : "📄"}
                          </span>
                          <span className={`font-mono truncate leading-normal ${f.type === "dir" ? "text-sky-300 font-bold" : "text-slate-300"}`} title={f.path}>
                            {f.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {f.size > 0 && (
                            <span className="text-[10px] font-mono text-slate-600">
                              {(f.size / 1024).toFixed(1)} KB
                            </span>
                          )}

                          {f.type === "file" ? (
                            <button
                              onClick={() => {
                                const directFileUrl = `https://github.com/${githubResult.owner}/${githubResult.repo}/blob/${githubResult.branch}/${f.path}`;
                                setGithubUrl(directFileUrl);
                                triggerGithubFetch(directFileUrl);
                              }}
                              className="px-2 py-1 bg-sky-950 hover:bg-sky-900/50 border border-sky-850 text-sky-300 rounded text-[9.5px] font-mono font-bold leading-none cursor-pointer"
                            >
                              Import Content
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const subDirUrl = `https://github.com/${githubResult.owner}/${githubResult.repo}/tree/${githubResult.branch}/${f.path}`;
                                setGithubUrl(subDirUrl);
                                triggerGithubFetch(subDirUrl);
                              }}
                              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded text-[9.5px] font-mono leading-none cursor-pointer font-semibold"
                            >
                              Explore Dir
                            </button>
                          )}
                        </div>

                      </div>
                    ))}
              </div>
            </div>
          )}

          {/* FILE VIEW SUMMARY */}
          {githubResult.type === "file" && (
            <div className="space-y-4">
              <div className="bg-emerald-950/25 border border-emerald-900/30 p-4 rounded-xl space-y-2 text-emerald-300">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-emerald-900 border border-emerald-700 text-white font-bold rounded flex items-center justify-center text-[11px]">✔</span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">File Cloned and Written to Workspace Sandbox!</span>
                </div>
                <p className="text-[10.5px] text-slate-400 font-mono leading-relaxed pl-7">
                  Raw file content retrieved and mounted securely as <span className="text-emerald-400 font-bold">"{githubResult.savedPath}"</span>. You can now trace its structures, run diagnostics, explain logic or search patterns dynamically.
                </p>
              </div>

              {/* Code Actions triggers */}
              <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl">
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-2.5">AI Operations Controllers for Cloned File</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setDoctorQuery(`diagnose holes and boundary failures inside cloned module ${githubResult.savedPath}`);
                      setActiveTab("doctor");
                      setIsDiagnosing(true);
                      fetch("/api/mappu/doctor", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ query: `diagnose holes and boundary failures inside cloned module ${githubResult.savedPath}` })
                      }).then(res => res.json()).then(data => {
                        setDoctorReport(data.report);
                        setIsDiagnosing(false);
                      }).catch(() => setIsDiagnosing(false));
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-rose-955/30 hover:text-white text-rose-300 text-xs font-mono font-bold border border-slate-800 hover:border-rose-900/40 rounded-lg transition text-center cursor-pointer"
                  >
                    mappu doctor
                  </button>
                  <button
                    onClick={() => {
                      setExplainQuery(`explain design rules and high level walkthrough of cloned module ${githubResult.savedPath}`);
                      setActiveTab("explain");
                      setIsExplaining(true);
                      fetch("/api/mappu/explain", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ query: `explain design rules and high level walkthrough of cloned module ${githubResult.savedPath}` })
                      }).then(res => res.json()).then(data => {
                        setExplainReport(data.explanation);
                        setIsExplaining(false);
                      }).catch(() => setIsExplaining(false));
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-cyan-955/30 hover:text-white text-cyan-300 text-xs font-mono font-bold border border-slate-800 hover:border-cyan-900/40 rounded-lg transition text-center cursor-pointer"
                  >
                    mappu explain
                  </button>
                  <button
                    onClick={() => {
                      setViewingFile({ path: githubResult.savedPath || githubResult.filePath || "", code: githubResult.content || "" });
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 rounded-lg transition font-mono hover:text-white text-center cursor-pointer"
                  >
                    Inspect Source Code
                  </button>
                </div>
              </div>

              {/* Cloned Code preview window */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pl-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block">Source Preview ({githubResult.content?.split("\n").length} Lines)</span>
                </div>
                <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl font-mono text-[11px] h-96 overflow-auto text-slate-300 leading-normal whitespace-pre scrollbar-thin select-text">
                  {githubResult.content}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-slate-900 rounded-2xl p-6 bg-slate-950/40 text-center text-slate-400 space-y-4 flex flex-col items-center">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-900/80 shadow-2xl relative bg-[#040406]">
            <img 
              src="/src/assets/images/github_concept_1779897652139.png" 
              alt="Mappu GitHub Bridge" 
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover opacity-85 hover:opacity-100 transition duration-300" 
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#040406] to-transparent pointer-events-none" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-white tracking-wide uppercase flex items-center justify-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sky-400 animate-spin-slow" />
              MAPPU REPO BRIDGE ACTIVE
            </p>
            <p className="text-[10.5px] text-slate-550 max-w-md mx-auto leading-normal font-sans">
              Input any public URL from a GitHub project repository or file. Mappu will recursively trace, retrieve, and seed files in the Sandbox directory automatically!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

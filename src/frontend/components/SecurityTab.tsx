import { useState, useEffect } from "react";
import { Shield, AlertTriangle, ShieldCheck, Play, Loader2, Info } from "lucide-react";
import { IndexStatus } from "../../types";

interface SecurityTabProps {
  status: IndexStatus;
  viewFileContent: (path: string) => void;
}

export default function SecurityTab({ status, viewFileContent }: SecurityTabProps) {
  const [data, setData] = useState<{
    filePath: string;
    line: number;
    issue: string;
    recommendation: string;
    severity?: "critical" | "high" | "medium" | "low";
    category?: "sast" | "ai" | "iac" | "secrets" | "deps";
    rule?: string;
    snippet?: string;
    source?: string;
    cveId?: string;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mappu/security");
      if (!res.ok) throw new Error("Failed to scan for security defects.");
      const result = await res.json();
      setData(result.results || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status.indexed) {
      runAnalysis();
    }
  }, [status.indexed]);

  // Compute counts
  const criticalCount = data.filter(item => (item.severity || "high") === "critical").length;
  const highCount = data.filter(item => (item.severity || "high") === "high").length;
  const mediumCount = data.filter(item => item.severity === "medium").length;
  const lowCount = data.filter(item => item.severity === "low").length;

  const filteredData = data.filter(item => {
    const itemCat = item.category || "sast";
    const itemSev = item.severity || "high";
    const matchesCat = selectedCategory === "all" || itemCat === selectedCategory;
    const matchesSev = selectedSeverity === "all" || itemSev === selectedSeverity;
    return matchesCat && matchesSev;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            SECURITY SAST COMPLIANCE AUDITOR
          </h2>
          <p className="text-[11px] text-slate-400">
            Performs advanced multi-tier AST compliance auditing, verification coordinates, prompt-injection, IaC checks, and secret exposure logs.
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading || !status.indexed}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[10px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          RUN AUDIT
        </button>
      </div>

      {!status.indexed ? (
        <div className="border border-dashed border-slate-900 rounded-2xl p-8 text-center text-slate-400">
          <AlertTriangle className="w-8 h-8 text-amber-500/80 mx-auto mb-2 animate-bounce" />
          <p className="text-xs font-bold text-slate-300">Workspace Index Missing</p>
          <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1 leading-normal">
            Please run the primary "Init App" code indexing process first to construct the Mappu database.
          </p>
        </div>
      ) : loading ? (
        <div className="border border-slate-900 bg-slate-950/20 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs font-mono">Running Static SAST Rule-Pattern Core Validation Scans...</p>
        </div>
      ) : error ? (
        <div className="border border-rose-955/50 bg-rose-955/10 rounded-2xl p-4 text-center text-rose-300 text-xs">
          Error: {error}
        </div>
      ) : data.length === 0 ? (
        <div className="border border-slate-900 bg-slate-950/40 rounded-2xl p-8 py-10 text-center text-slate-450 space-y-2 flex flex-col items-center">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
          <p className="text-xs font-bold text-slate-300">Workspace Secure</p>
          <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-normal">
            No dynamic eval, unsafe child_process.exec sub-shells, prompt injections, or dangerous React DOM bindings found. Clean local state verified.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Diagnostic Metrics Matrix */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-rose-950/10 border border-red-950/35 p-3 rounded-xl text-center">
              <span className="text-2xl font-black text-red-500 block">{criticalCount}</span>
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Critical</span>
            </div>
            <div className="bg-orange-950/15 border border-orange-900/30 p-3 rounded-xl text-center">
              <span className="text-2xl font-black text-orange-450 block">{highCount}</span>
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">High</span>
            </div>
            <div className="bg-amber-950/10 border border-amber-900/25 p-3 rounded-xl text-center">
              <span className="text-2xl font-black text-amber-450 block">{mediumCount}</span>
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Medium</span>
            </div>
            <div className="bg-cyan-950/10 border border-cyan-900/25 p-3 rounded-xl text-center">
              <span className="text-2xl font-black text-cyan-400 block">{lowCount}</span>
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Low</span>
            </div>
          </div>

          {/* Filtering Rails */}
          <div className="flex flex-col gap-3 py-1 border-y border-slate-900">
            {/* Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mr-1">Category:</span>
              {[
                { id: "all", label: "All" },
                { id: "sast", label: "SAST Vulnerability" },
                { id: "ai", label: "AI Safety Risks" },
                { id: "iac", label: "IaC Compliance" },
                { id: "secrets", label: "Secrets Leakage" },
                { id: "deps", label: "Dependency CVEs" }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-0.8 font-mono text-[9px] rounded-md transition border shrink-0 cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-slate-800 border-slate-700 text-white font-bold"
                      : "bg-[#0b0b0d] border-slate-950 text-slate-450 hover:text-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mr-1">Severity:</span>
              {[
                { id: "all", label: "All Levels" },
                { id: "critical", label: "Critical" },
                { id: "high", label: "High" },
                { id: "medium", label: "Medium" },
                { id: "low", label: "Low" }
              ].map(sev => (
                <button
                  key={sev.id}
                  onClick={() => setSelectedSeverity(sev.id)}
                  className={`px-2 py-0.5 font-mono text-[9px] rounded-md transition border shrink-0 cursor-pointer ${
                    selectedSeverity === sev.id
                      ? "bg-slate-800 border-slate-700 text-white font-bold"
                      : "bg-[#0b0b0d] border-slate-950 text-slate-450 hover:text-slate-200"
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>

          {/* Remediation Stream */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pl-1">
              <h3 className="text-[10px] font-mono font-black text-rose-400 tracking-wider uppercase">
                ⚠️ Scanned Vulnerabilities Stream ({filteredData.length} items matched)
              </h3>
            </div>
            
            {filteredData.length === 0 ? (
              <div className="p-10 border border-slate-900 bg-slate-950/10 rounded-xl text-center text-slate-500 font-mono text-[10px]">
                No security parameters matched selected filter parameters.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredData.map((item, idx) => {
                  const itemSev = item.severity || "high";
                  const itemCat = item.category || "sast";
                  
                  // Color configuration
                  const tagColors: Record<string, string> = {
                    critical: "bg-red-950/60 border-red-900/40 text-red-400",
                    high: "bg-orange-950/60 border-orange-900/40 text-orange-400",
                    medium: "bg-amber-955/60 border-amber-900/40 text-amber-400",
                    low: "bg-cyan-955/60 border-cyan-900/40 text-cyan-400"
                  };

                  return (
                    <div
                      key={idx}
                      className="bg-[#09090c] border border-slate-900 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-800/80 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between border-b border-slate-950 pb-2 flex-wrap gap-2">
                          <span className="text-xs font-bold text-slate-200 min-w-0 break-all select-all font-mono">
                            📄 {item.filePath}:{item.line}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[8px] font-mono px-1.5 py-0.3 bg-slate-950 border border-slate-900 text-slate-400 rounded-md uppercase font-bold">
                              {itemCat.toUpperCase()}
                            </span>
                            <span className={`text-[8px] font-mono px-1.5 py-0.3 border rounded-md font-bold uppercase ${tagColors[itemSev] || tagColors.high}`}>
                              {itemSev.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-white leading-relaxed pt-0.5">
                          {item.issue}
                          {item.rule && (
                            <span className="block mt-1 text-[10px] text-slate-500 font-mono">
                              Rule Triggered: <span className="text-slate-400">{item.rule}</span>
                              {item.cveId && <span className="ml-2 text-rose-450 font-bold">[{item.cveId}]</span>}
                            </span>
                          )}
                        </p>
                      </div>

                      {item.snippet && (
                        <div className="bg-[#030304] border border-slate-950 rounded-lg p-3 overflow-x-auto text-[10.5px] font-mono text-rose-300">
                          <pre className="whitespace-pre scrollbar-thin select-all">{item.snippet}</pre>
                        </div>
                      )}

                      <div className="bg-slate-950 border border-slate-950 rounded-lg p-3 text-[10.5px] flex gap-2 font-sans border-l-2 border-emerald-500">
                        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-slate-350 leading-relaxed font-sans select-text">
                          <p className="font-mono text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Mappu Remediation Advice:</p>
                          <p>{item.recommendation}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => viewFileContent(item.filePath)}
                        className="w-full mt-1.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 font-mono text-[9px] text-slate-400 hover:text-white rounded-lg transition"
                      >
                        View Code Context
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

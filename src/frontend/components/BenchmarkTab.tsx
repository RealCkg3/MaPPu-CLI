import { useState, useEffect } from "react";
import { Zap, AlertTriangle, ShieldCheck, Play, Loader2, Gauge } from "lucide-react";
import { IndexStatus } from "../../types";

interface BenchmarkTabProps {
  status: IndexStatus;
  viewFileContent: (path: string) => void;
}

interface BenchmarkFinding {
  id: string;
  type: "sync-in-async" | "n-plus-one" | "hotspot-complexity";
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  line: number;
  snippet: string;
  message: string;
  remediation: string;
}

export default function BenchmarkTab({ status, viewFileContent }: BenchmarkTabProps) {
  const [findings, setFindings] = useState<BenchmarkFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mappu/benchmark");
      if (!res.ok) throw new Error("Failed to scan for static performance traps.");
      const result = await res.json();
      setFindings(result.findings || []);
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

  const criticalFindings = findings.filter(f => f.severity === "critical" || f.severity === "high");
  const minorFindings = findings.filter(f => f.severity === "medium" || f.severity === "low");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            STATIC PERFORMANCE BENCHMARK & HOTSPOTS
          </h2>
          <p className="text-[11px] text-slate-400">
            Scans codebase loops, scoping buffers, and asynchronous structures to locate I/O thread blocks and potential N+1 query patterns.
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading || !status.indexed}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[10px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          RUN BENCHMARK
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
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs font-mono">Statically Inspecting Thread Blocks & Database Loops...</p>
        </div>
      ) : error ? (
        <div className="border border-rose-950/50 bg-rose-950/20 rounded-2xl p-4 text-center text-rose-200 text-xs">
          Error: {error}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#09090c] border border-slate-900 p-3 rounded-xl">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Total Bottlenecks</span>
              <span className="text-2xl font-black text-white block mt-1">{findings.length}</span>
              <span className="text-[9px] text-slate-550 font-mono">Found statically</span>
            </div>
            <div className="bg-[#09090c] border border-slate-900 p-3 rounded-xl">
              <span className="text-[9px] font-mono font-bold text-rose-450 uppercase tracking-wider block">Blocked Thread Loops (Critical)</span>
              <span className="text-2xl font-black text-rose-400 block mt-1">{criticalFindings.length}</span>
              <span className="text-[9px] text-rose-600/75 font-mono">Requires replacement</span>
            </div>
            <div className="bg-[#09090c] border border-slate-900 p-3 rounded-xl">
              <span className="text-[9px] font-mono font-bold text-amber-450 uppercase tracking-wider block">Medium / Low Traps</span>
              <span className="text-2xl font-black text-amber-400 block mt-1">{minorFindings.length}</span>
              <span className="text-[9px] text-slate-500 font-mono">Heuristics alerts</span>
            </div>
          </div>

          {/* Findings lists */}
          {findings.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-[10px] font-mono font-black text-amber-400 tracking-wider uppercase pl-1">
                ⚠️ Performance Issues Catalog
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-900 pr-1">
                {findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="bg-[#09090c] border border-slate-900 hover:border-slate-800 p-4 rounded-xl space-y-3 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 text-[8px] font-mono font-bold rounded uppercase ${
                            finding.severity === "critical" || finding.severity === "high"
                              ? "bg-rose-950/60 text-rose-400 border border-rose-900/40"
                              : "bg-amber-950/60 text-amber-400 border border-amber-900/40"
                          }`}>
                            {finding.severity}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 text-[8px] font-mono rounded">
                            {finding.type}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-200 pt-1">
                          File: <span className="text-slate-350 font-mono text-[11px]">{finding.file}:{finding.line}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 leading-relaxed pt-0.5">
                          {finding.message}
                        </p>
                      </div>
                      <button
                        onClick={() => viewFileContent(finding.file)}
                        className="px-2.5 py-1 text-[10px] border border-slate-800 text-slate-450 hover:text-slate-200 font-mono hover:bg-slate-900/30 rounded transition cursor-pointer shrink-0"
                      >
                        Inspect
                      </button>
                    </div>

                    {/* Snippet display */}
                    {finding.snippet && (
                      <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-2.5 font-mono text-[10.5px] text-amber-300/85 leading-normal overflow-x-auto">
                        <span className="text-slate-600 select-none">{finding.line} | </span>
                        {finding.snippet}
                      </div>
                    )}

                    {/* Remediation suggestion banner */}
                    <div className="bg-emerald-950/15 border border-emerald-900/20 rounded-lg p-2.5 text-[10px] text-emerald-300/90 leading-normal">
                      <strong className="text-emerald-400">Remediation:</strong> {finding.remediation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-900 rounded-2xl p-8 text-center text-slate-500 py-10 space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs text-slate-300 font-bold">Optimizations Complete</p>
              <p className="text-[10px] text-slate-400 max-w-sm mx-auto">
                No synchronous blockages inside async wrappers or dynamic N+1 mapping requests spotted statically in indexed fields.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

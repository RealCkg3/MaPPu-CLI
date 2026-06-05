import { useState, useEffect } from "react";
import { Compass, AlertOctagon, CheckCircle2, Play, Loader2 } from "lucide-react";
import { IndexStatus } from "../../types";

interface ScopeTabProps {
  status: IndexStatus;
  viewFileContent: (path: string) => void;
}

interface Violation {
  filePath: string;
  importedPath: string;
  rule: {
    from: string;
    to: string;
    severity: string;
    message: string;
  };
}

export default function ScopeTab({ status, viewFileContent }: ScopeTabProps) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mappu/scope");
      if (!res.ok) throw new Error("Failed to run architectural scope boundaries check.");
      const result = await res.json();
      setViolations(result.violations || []);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            ARCHITECTURAL BOUNDARIES COMPLIANCE
          </h2>
          <p className="text-[11px] text-slate-400">
            Performs static dependency rules audits to lock module imports within proper structural namespaces and guard code model isolation.
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading || !status.indexed}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[10px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          RUN COMPLIANCE AUDIT
        </button>
      </div>

      {!status.indexed ? (
        <div className="border border-dashed border-slate-900 rounded-2xl p-8 text-center text-slate-400">
          <AlertOctagon className="w-8 h-8 text-amber-500/80 mx-auto mb-2 animate-bounce" />
          <p className="text-xs font-bold text-slate-300">Workspace Index Missing</p>
          <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1 leading-normal">
            Please run the main "Init App" code indexing process first to construct the structural indices.
          </p>
        </div>
      ) : loading ? (
        <div className="border border-slate-900 bg-slate-950/20 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
          <p className="text-xs font-mono">Auditing Codebase Import Relationships...</p>
        </div>
      ) : error ? (
        <div className="border border-rose-950/50 bg-rose-950/20 rounded-2xl p-4 text-center text-rose-200 text-xs">
          Error: {error}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status Metric Card */}
          <div className="bg-[#09090c] border border-slate-900 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Security Rule Violations</span>
              <span className={`text-2xl font-black block mt-1 ${violations.length > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {violations.length === 0 ? "0 Violations" : `${violations.length} Violation${violations.length > 1 ? "s" : ""}`}
              </span>
              <p className="text-[10px] text-slate-400">
                {violations.length === 0 
                  ? "Architectural structure satisfies modular isolation constraints cleanly." 
                  : "Some dependencies bypass layers or import invalid namespaces."
                }
              </p>
            </div>
            {violations.length === 0 && (
              <CheckCircle2 className="w-10 h-10 text-emerald-500/80 shrink-0" />
            )}
          </div>

          {/* List of violations */}
          {violations.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-[10px] font-mono font-black text-rose-400 tracking-wider uppercase pl-1">
                🚨 Boundaries Infractions Found
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-900 pr-1">
                {violations.map((v, idx) => (
                  <div
                    key={idx}
                    className="bg-rose-950/5 border border-rose-900/25 hover:border-rose-900/40 p-4 rounded-xl space-y-3 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="px-1.5 py-0.5 bg-rose-950/60 text-rose-400 border border-rose-900/50 text-[8px] font-mono font-bold rounded uppercase">
                          {v.rule.severity}
                        </span>
                        <p className="text-xs font-bold text-slate-200 pt-1">
                          File: <span className="text-rose-300 font-mono text-[11px]">{v.filePath}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 leading-relaxed pt-0.5">
                          {v.rule.message}
                        </p>
                      </div>
                      <button
                        onClick={() => viewFileContent(v.filePath)}
                        className="px-2.5 py-1 text-[10px] border border-slate-800 text-slate-450 hover:text-slate-200 font-mono hover:bg-slate-900/30 rounded transition cursor-pointer shrink-0"
                      >
                        Inspect
                      </button>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-900 rounded-lg p-2.5 font-mono text-[10px] text-rose-300/90 leading-normal">
                      <span className="text-slate-500">Illegal import: </span>
                      {v.importedPath}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-900 rounded-2xl p-8 text-center text-slate-500 py-10 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs text-slate-300 font-bold">Modularity Certified</p>
              <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                No circular routing boundaries or direct model layer coupling violations detected.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

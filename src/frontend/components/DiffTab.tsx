import { useState, useEffect } from "react";
import { GitCompare, AlertTriangle, ShieldCheck, Play, Loader2, RefreshCw } from "lucide-react";
import { IndexStatus } from "../../types";

interface DiffTabProps {
  status: IndexStatus;
  viewFileContent: (path: string) => void;
}

interface ImpactRadius {
  filePath: string;
  downstreamCallers: string[];
}

interface NewFinding {
  file: string;
  line?: number;
  message: string;
  severity: string;
}

interface DiffReport {
  changedFiles: string[];
  impactRadius: ImpactRadius[];
  newFindings: NewFinding[];
}

export default function DiffTab({ status, viewFileContent }: DiffTabProps) {
  const [report, setReport] = useState<DiffReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mappu/diff");
      if (!res.ok) throw new Error("Failed to compile pre-commit diff analysis.");
      const result = await res.json();
      setReport(result.report || null);
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
            <GitCompare className="w-4 h-4 text-emerald-400" />
            PRE-COMMIT IMPACT RADIUS & DIFFERENTIALS
          </h2>
          <p className="text-[11px] text-slate-400">
            Traces uncommitted code adaptations down the import graph tree to evaluate calling dependencies blast-radius and SAST gaps prior to merging.
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
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          RUN DIFFERENTIAL IMPACT
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
          <p className="text-xs font-mono">Evaluating Uncommitted Files blast-radius...</p>
        </div>
      ) : error ? (
        <div className="border border-rose-950/50 bg-rose-950/20 rounded-2xl p-4 text-center text-rose-200 text-xs">
          Error: {error}
        </div>
      ) : report ? (
        <div className="space-y-5">
          {/* Quick Stats Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#09090c] border border-slate-900 p-3 rounded-xl">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Changed Files (Git/Diff)</span>
              <span className="text-2xl font-black text-emerald-450 block mt-1">{report.changedFiles.length}</span>
              <span className="text-[9px] text-slate-600 font-mono">Staged & unstaged</span>
            </div>
            <div className="bg-[#09090c] border border-slate-900 p-3 rounded-xl">
              <span className="text-[9px] font-mono font-bold text-orange-450 uppercase tracking-wider block">Impact Downstream Files</span>
              <span className="text-2xl font-black text-orange-400 block mt-1">
                {report.impactRadius.reduce((sum, item) => sum + item.downstreamCallers.length, 0)}
              </span>
              <span className="text-[9px] text-slate-600 font-mono">Transitive links</span>
            </div>
            <div className="bg-[#09090c] border border-slate-900 p-3 rounded-xl">
              <span className="text-[9px] font-mono font-bold text-rose-455 uppercase tracking-wider block">New SAST Defects Found</span>
              <span className={`text-2xl font-black block mt-1 ${report.newFindings.length > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {report.newFindings.length}
              </span>
              <span className="text-[9px] text-slate-600 font-mono">In changed areas</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blast radius of modified files */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-mono font-black text-emerald-400 tracking-wider uppercase pl-1 flex items-center gap-1.5">
                🌐 Blast Impact Radius Matrix
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-900 pr-1">
                {report.impactRadius.map((rad, idx) => (
                  <div
                    key={idx}
                    className="bg-[#09090c] border border-slate-900 p-3.5 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-emerald-250 truncate">{rad.filePath}</p>
                      <span className={`px-1.5 py-0.5 text-[8px] font-bold font-mono rounded ${
                        rad.downstreamCallers.length > 0 ? "bg-orange-950/50 text-orange-400" : "bg-emerald-950/50 text-emerald-400"
                      }`}>
                        {rad.downstreamCallers.length === 0 ? "Isolated" : `${rad.downstreamCallers.length} Affected`}
                      </span>
                    </div>

                    {rad.downstreamCallers.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-mono block">Direct Downstream Callers:</span>
                        <div className="flex flex-wrap gap-1">
                          {rad.downstreamCallers.map((dc, index) => (
                            <span
                              key={index}
                              onClick={() => viewFileContent(dc)}
                              className="px-2 py-0.5.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-mono rounded transition cursor-pointer"
                            >
                              {dc}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-600 font-mono">
                        Safe change - no active downstream module dependencies configured.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Security analysis of uncommitted code */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-mono font-black text-rose-400 tracking-wider uppercase pl-1 flex items-center gap-1.5">
                ⏳ Differential Security Risks
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-900 pr-1">
                {report.newFindings.length > 0 ? (
                  report.newFindings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="bg-[#09090c] border border-slate-900 p-3.5 rounded-xl flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <span className="px-1.5 py-0.5 bg-rose-95/60 text-rose-400 border border-rose-900/40 text-[8px] font-bold font-mono rounded uppercase">
                          {finding.severity}
                        </span>
                        <p className="text-xs font-bold text-slate-350 pt-1">
                          {finding.file}{finding.line ? `:${finding.line}` : ""}
                        </p>
                        <p className="text-[10.5px] text-slate-400 leading-normal font-mono">
                          {finding.message}
                        </p>
                      </div>
                      <button
                        onClick={() => viewFileContent(finding.file)}
                        className="px-2 py-0.5 border border-slate-800 text-slate-500 hover:text-slate-300 font-mono hover:bg-slate-900/30 rounded transition cursor-pointer shrink-0"
                      >
                        Inspect
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="border border-dashed border-slate-900 rounded-2xl p-8 text-center text-slate-500 py-12 space-y-2">
                    <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs text-slate-300 font-bold">Zero Security Regression</p>
                    <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                      Static security checks passed for the modified code scope. Perfect alignment with OWASP guidelines.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-900 rounded-2xl p-8 text-center text-slate-500 py-10 space-y-2">
          <GitCompare className="w-8 h-8 text-slate-550 mx-auto" />
          <p className="text-xs text-slate-300 font-bold">Blast Radar Standingby</p>
          <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
            Triggers analysis of staged uncommitted code blocks to run the pre-commit simulation.
          </p>
        </div>
      )}
    </div>
  );
}

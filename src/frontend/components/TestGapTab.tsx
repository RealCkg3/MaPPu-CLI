import { useState, useEffect } from "react";
import { Award, AlertTriangle, CheckCircle2, Play, Loader2, BarChart4 } from "lucide-react";
import { IndexStatus } from "../../types";

interface TestGapTabProps {
  status: IndexStatus;
  viewFileContent: (path: string) => void;
}

interface UntestedSymbol {
  name: string;
  filePath: string;
}

interface TestGapReport {
  overallCoverageEstimate: number;
  totalExportsCount: number;
  testedExportsCount: number;
  untestedExportsCount: number;
  untestedSymbols: UntestedSymbol[];
  testFiles: string[];
}

export default function TestGapTab({ status, viewFileContent }: TestGapTabProps) {
  const [report, setReport] = useState<TestGapReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mappu/test-gap");
      if (!res.ok) throw new Error("Failed to evaluate test gap coverage.");
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
            <Award className="w-4 h-4 text-cyan-400" />
            STATIC TEST GAP COVERAGE ESTIMATOR
          </h2>
          <p className="text-[11px] text-slate-400">
            Estimates test coverage vectors by tracking exported methods and scanning test suites files to locate untracked symbols.
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading || !status.indexed}
          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[10px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          RUN GAUGING SCAN
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
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs font-mono">Comparing Exported Symbols with Test Suites...</p>
        </div>
      ) : error ? (
        <div className="border border-rose-950/50 bg-rose-950/20 rounded-2xl p-4 text-center text-rose-200 text-xs">
          Error: {error}
        </div>
      ) : report ? (
        <div className="space-y-5">
          {/* Detailed Statistics Header */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#09090c] border border-slate-900 p-3.5 rounded-xl text-center flex flex-col justify-center">
              <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Estimated Coverage</span>
              <span className={`text-2xl font-black block mt-1.5 ${
                report.overallCoverageEstimate > 75 
                  ? "text-emerald-400" 
                  : report.overallCoverageEstimate > 40 
                    ? "text-amber-400" 
                    : "text-rose-400"
              }`}>
                {report.overallCoverageEstimate}%
              </span>
            </div>
            <div className="bg-[#09090c] border border-slate-900 p-3.5 rounded-xl text-center flex flex-col justify-center">
              <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Total Exports (API)</span>
              <span className="text-xl font-bold text-white block mt-1.5">{report.totalExportsCount}</span>
            </div>
            <div className="bg-[#09090c] border border-slate-800/85 p-3.5 rounded-xl text-center flex flex-col justify-center">
              <span className="text-[8px] font-mono font-bold text-emerald-500 uppercase tracking-wider block">Tested Export Keys</span>
              <span className="text-xl font-bold text-emerald-400 block mt-1.5">{report.testedExportsCount}</span>
            </div>
            <div className="bg-[#09090c] border border-slate-900 p-3.5 rounded-xl text-center flex flex-col justify-center">
              <span className="text-[8px] font-mono font-bold text-rose-500 uppercase tracking-wider block">Untested Symbols Gaps</span>
              <span className="text-xl font-bold text-rose-400 block mt-1.5">{report.untestedExportsCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* List of Untested Exports */}
            <div className="md:col-span-2 space-y-2">
              <h3 className="text-[10px] font-mono font-black text-rose-400 tracking-wider uppercase pl-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Untested Export Boundaries ({report.untestedSymbols.length})
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-900 pr-1">
                {report.untestedSymbols.length > 0 ? (
                  report.untestedSymbols.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#09090c] border border-slate-900 hover:border-slate-800 p-3 rounded-lg flex items-center justify-between gap-4 transition"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-mono font-bold text-amber-300 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-550 truncate font-mono">Location: {item.filePath}</p>
                      </div>
                      <button
                        onClick={() => viewFileContent(item.filePath)}
                        className="px-2 py-0.5.5 text-[10px] border border-slate-800 text-slate-500 hover:text-slate-350 font-mono hover:bg-slate-900/30 rounded transition cursor-pointer shrink-0"
                      >
                        Source
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="bg-[#09090c] border border-slate-900 rounded-xl p-8 text-center text-slate-500 font-mono text-xs">
                    Clean Sweep! No untested exported symbols located.
                  </div>
                )}
              </div>
            </div>

            {/* Test Files Index */}
            <div className="space-y-2 text-xs">
              <h3 className="text-[10px] font-mono font-black text-slate-400 tracking-wider uppercase pl-1 flex items-center gap-1.5">
                <BarChart4 className="w-3.5 h-3.5 text-cyan-400" />
                Active Test Files ({report.testFiles.length})
              </h3>
              <div className="bg-slate-955/20 border border-slate-900 p-3.5 rounded-xl space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                {report.testFiles.length > 0 ? (
                  report.testFiles.map((f, idx) => (
                    <div key={idx} className="space-y-0.5 border-b border-slate-900/60 pb-1.5 last:border-b-0 last:pb-0">
                      <p className="text-[11px] font-bold text-slate-300 font-mono text-cyan-300 truncate">{f}</p>
                      <span className="text-[9px] text-slate-500 block uppercase font-mono">Validated spec suite</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-center text-[10px] py-4 leading-normal">
                    0 spec / test layout files found. Creating test files named *.test.ts or inside /test/ will activate tests tracking.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-900 rounded-2xl p-8 text-center text-slate-500 py-10 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-xs text-slate-300 font-bold">Analysis Ready</p>
          <p className="text-[10px] text-slate-550 max-w-xs mx-auto">
            Run the static test gap scanner to compile the symbols tracking matrices.
          </p>
        </div>
      )}
    </div>
  );
}

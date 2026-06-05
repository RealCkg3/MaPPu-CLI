import { useState, useEffect } from "react";
import { Clock, AlertTriangle, ShieldCheck, Play, Loader2, Activity } from "lucide-react";
import { IndexStatus } from "../../types";

interface GitTabProps {
  status: IndexStatus;
}

export default function GitTab({ status }: GitTabProps) {
  const [data, setData] = useState<{
    filePath: string;
    commitsCount: number;
    churnScore: number;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mappu/git");
      if (!res.ok) throw new Error("Failed to load development hotspot index.");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            DEVELOPMENT CHURN & HOTSPOT MAPPER
          </h2>
          <p className="text-[11px] text-slate-400">
            Measures code edit frequencies and commit churn indexes to locate unstable modules and testing candidate bottlenecks.
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading || !status.indexed}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          RUN CALCULATION
        </button>
      </div>

      {!status.indexed ? (
        <div className="border border-dashed border-slate-900 rounded-2xl p-8 text-center text-slate-400">
          <AlertTriangle className="w-8 h-8 text-amber-500/80 mx-auto mb-2 animate-bounce" />
          <p className="text-xs font-bold text-slate-300">Workspace Index Missing</p>
          <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1 leading-normal">
            Please run the "Init App" code indexing process first to construct the Mappu database.
          </p>
        </div>
      ) : loading ? (
        <div className="border border-slate-900 bg-slate-950/20 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin mx-auto" />
          <p className="text-xs font-mono">Calculating Commit Churn Matrices vs Functional Cycles...</p>
        </div>
      ) : error ? (
        <div className="border border-rose-955/50 bg-rose-955/10 rounded-2xl p-4 text-center text-rose-300 text-xs">
          Error: {error}
        </div>
      ) : data.length === 0 ? (
        <div className="border border-slate-900 bg-slate-950/40 rounded-2xl p-8 py-10 text-center text-slate-400 leading-normal font-sans">
          No records captured. Execute coding changes and index sandbox.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Legend Banner */}
          <div className="bg-[#09090c] border border-slate-900 p-3.5 rounded-xl flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-sans leading-relaxed">
              📁 Higher and redder scores show <span className="font-bold text-amber-400">unstable refactoring zones</span> where modifications trigger ripple regressions!
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-mono font-black text-amber-500 tracking-wider uppercase pl-1">
              📈 Scored Hotspot Hot-spots
            </h3>
            <div className="space-y-2">
              {data.map((item, idx) => {
                const getBarColor = (score: number) => {
                  if (score > 70) return "bg-rose-500";
                  if (score > 40) return "bg-amber-500";
                  return "bg-emerald-500";
                };
                const getTextColor = (score: number) => {
                  if (score > 70) return "text-rose-400";
                  if (score > 40) return "text-amber-400";
                  return "text-emerald-400";
                };

                return (
                  <div
                    key={idx}
                    className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 space-y-2"
                  >
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-bold text-slate-300 truncate">{item.filePath}</p>
                        <p className="text-[10px] text-slate-500 font-mono">Estimated Commits: {item.commitsCount}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-mono font-black ${getTextColor(item.churnScore)}`}>
                          {item.churnScore}% CHURN
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getBarColor(item.churnScore)}`}
                          style={{ width: `${item.churnScore}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>Low risk</span>
                        <span>Hotspot bottleneck</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

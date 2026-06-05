import { useState, useEffect } from "react";
import { Trash2, AlertTriangle, ShieldCheck, Play, Loader2 } from "lucide-react";
import { IndexStatus } from "../../types";

interface DeadTabProps {
  status: IndexStatus;
  viewFileContent: (path: string) => void;
}

export default function DeadTab({ status, viewFileContent }: DeadTabProps) {
  const [data, setData] = useState<{ filePath: string; isReachable: boolean; referencesCount: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mappu/dead");
      if (!res.ok) throw new Error("Failed to scan for dead modules.");
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

  const deadModules = data.filter((item) => !item.isReachable);
  const reachableModules = data.filter((item) => item.isReachable);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400" />
            DEAD CODE REACHABILITY SCANNER
          </h2>
          <p className="text-[11px] text-slate-400">
            Traces module import relationships to pinpoint unreferenced source structures and isolated code branches.
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading || !status.indexed}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[10px] font-mono font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          RUN SCAN
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
          <Loader2 className="w-6 h-6 text-rose-400 animate-spin mx-auto" />
          <p className="text-xs font-mono">Running Static Control Flow Reachability AST Scans...</p>
        </div>
      ) : error ? (
        <div className="border border-rose-950/50 bg-rose-950/20 rounded-2xl p-4 text-center text-rose-200 text-xs">
          Error: {error}
        </div>
      ) : data.length === 0 ? (
        <div className="border border-dashed border-slate-900 rounded-2xl p-8 py-10 text-center text-slate-500 text-xs">
          No modules detected. Run indexing to catalog the repository files.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#09090c] border border-slate-900 p-3 rounded-xl">
              <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-wider block">Dangling Modules</span>
              <span className="text-2xl font-black text-rose-400 block mt-1">{deadModules.length}</span>
              <span className="text-[9px] text-slate-500 font-mono">0 incoming imports</span>
            </div>
            <div className="bg-[#09090c] border border-slate-900 p-3 rounded-xl">
              <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">Reachable Nodes</span>
              <span className="text-2xl font-black text-emerald-400 block mt-1">{reachableModules.length}</span>
              <span className="text-[9px] text-slate-500 font-mono">Fully connected in graph</span>
            </div>
          </div>

          {/* Dangling Modules Section */}
          {deadModules.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-mono font-black text-rose-400 tracking-wider uppercase pl-1">
                ⚠️ Isolated/Unreferenced Files ({deadModules.length})
              </h3>
              <div className="space-y-2">
                {deadModules.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-rose-955/5 border border-rose-900/30 hover:border-rose-900/50 p-3.5 rounded-xl flex items-center justify-between gap-4 transition"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-rose-200">{item.filePath}</p>
                      <p className="text-[10px] text-slate-450 font-mono">References count: 0</p>
                    </div>
                    <button
                      onClick={() => viewFileContent(item.filePath)}
                      className="px-2.5 py-1 text-[10px] border border-rose-900/40 text-rose-300 font-mono hover:bg-rose-900/20 rounded transition cursor-pointer"
                    >
                      Inspect Source
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Modules Section */}
          {reachableModules.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-[10px] font-mono font-black text-slate-400 tracking-wider uppercase pl-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Active Linked Graph Scope ({reachableModules.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-900 pr-1">
                {reachableModules.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/40 border border-slate-900/80 p-3 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-bold text-slate-300 truncate">{item.filePath}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Incoming imports: {item.referencesCount}</p>
                    </div>
                    <button
                      onClick={() => viewFileContent(item.filePath)}
                      className="px-2.5 py-1 text-[10px] border border-slate-800 text-slate-450 hover:text-slate-200 font-mono hover:bg-slate-900/30 rounded transition cursor-pointer shrink-0"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

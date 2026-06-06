import { useState, useEffect } from "react";
import { Layers, AlertTriangle, ShieldCheck, Play, Loader2, Code } from "lucide-react";
import { IndexStatus } from "../../types";

interface CloneTabProps {
  status: IndexStatus;
  viewFileContent: (path: string) => void;
}

export default function CloneTab({ status, viewFileContent }: CloneTabProps) {
  const [data, setData] = useState<{
    filePathA: string;
    filePathB: string;
    startLineA?: number;
    endLineA?: number;
    startLineB?: number;
    endLineB?: number;
    duplicatedLines: number;
    preview: string;
    similarityKind?: string;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mappu/clone");
      if (!res.ok) throw new Error("Failed to scan for duplicate code blocks.");
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
            <Layers className="w-4 h-4 text-indigo-400" />
            STRUCTURAL DUPLICATION & CLONE DETECTOR
          </h2>
          <p className="text-[11px] text-slate-400">
            Uses a sliding hash-window parser to search for replicated logic, redundant boilerplate, and copied components across standard files.
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
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
          <p className="text-xs font-mono">Running AST/Content Block Hash-Similarity Diffs...</p>
        </div>
      ) : error ? (
        <div className="border border-rose-955/50 bg-rose-955/10 rounded-2xl p-4 text-center text-rose-300 text-xs">
          Error: {error}
        </div>
      ) : data.length === 0 ? (
        <div className="border border-slate-900 bg-slate-950/40 rounded-2xl p-8 py-10 text-center text-slate-450 space-y-2 flex flex-col items-center">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
          <p className="text-xs font-bold text-slate-300">Clean Code Structure Certified</p>
          <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-normal">
            No redundant code clones or duplicated statement blocks (over 6 lines) were detected. Excellent modularity standards!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#09090c] border border-slate-900 p-3 rounded-xl">
            <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">Redundancy Density indicator</span>
            <span className="text-2xl font-black text-indigo-400 block mt-1">{data.length} Duplicate Pairs</span>
            <span className="text-[9px] text-slate-500 font-mono">Refactor recommended</span>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-mono font-black text-indigo-400 tracking-wider uppercase pl-1">
              🔍 Redundancy Hotspots Detected
            </h3>
            <div className="space-y-3">
              {data.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-900 pb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-300 truncate max-w-[180px] sm:max-w-xs">
                          {item.filePathA}
                          {item.startLineA ? ` (L${item.startLineA}-${item.endLineA})` : ""}
                        </span>
                        <span className="text-[9px] font-mono text-indigo-400 font-bold">&larr;&gt;&larr;</span>
                        <span className="text-xs font-bold text-slate-300 truncate max-w-[180px] sm:max-w-xs">
                          {item.filePathB}
                          {item.startLineB ? ` (L${item.startLineB}-${item.endLineB})` : ""}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono flex flex-col gap-1">
                        <span>
                          Redundant slice: <span className="text-indigo-400 font-bold">{item.duplicatedLines} lines</span>
                        </span>
                        {item.similarityKind && (
                          <span className="text-slate-500 text-[9px] italic border-l-2 border-indigo-500/50 pl-1.5 mt-0.5">
                            Clone Type: {item.similarityKind}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => viewFileContent(item.filePathA)}
                        className="px-2 py-1 text-[9px] border border-slate-800 text-slate-400 hover:text-white font-mono rounded hover:bg-slate-900/40 transition cursor-pointer"
                      >
                        File A
                      </button>
                      <button
                        onClick={() => viewFileContent(item.filePathB)}
                        className="px-2 py-1 text-[9px] border border-slate-800 text-slate-400 hover:text-white font-mono rounded hover:bg-slate-900/40 transition cursor-pointer"
                      >
                        File B
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-950 rounded-lg p-2.5 font-mono text-[9.5px] text-slate-300 overflow-x-auto leading-normal select-text">
                    <div className="text-[8px] uppercase text-indigo-400 mb-1 font-bold flex items-center gap-1">
                      <Code className="w-3 h-3" />
                      Duplicated Code Slice Preview
                    </div>
                    <pre className="whitespace-pre-wrap">{item.preview}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

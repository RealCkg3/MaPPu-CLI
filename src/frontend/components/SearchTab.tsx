import { SearchResult, IndexStatus } from "../../types";
import { Search, RotateCw, Play, Info, Eye, Activity, Terminal } from "lucide-react";

interface SearchTabProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  status: IndexStatus;
  triggerIntentSearch: (overrideVal?: string) => Promise<any>;
  viewFileContent: (path: string) => void;
}

export default function SearchTab({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  status,
  triggerIntentSearch,
  viewFileContent,
}: SearchTabProps) {
  return (
    <div className="space-y-6">
      {/* Intro header */}
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Search className="w-4 h-4 text-teal-400" />
          SEARCH BY LOGICAL BEHAVIORAL INTENT
        </h2>
        <p className="text-[11px] text-slate-400">
          Find files, routines, and chunks based on code design purposes, even if they don't match standard keywords exactly.
        </p>
      </div>

      {/* Input Search controls banner */}
      <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. where do custom routes bind index files..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 transition"
            />
          </div>
          <button
            disabled={isSearching || !status.indexed}
            onClick={() => triggerIntentSearch()}
            className="px-5 py-2.5 bg-teal-500 text-slate-950 hover:bg-teal-400 transition text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
          >
            {isSearching ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
            Search Engine
          </button>
        </div>

        {/* Suggest queries chip shortcuts */}
        <div className="flex gap-2 items-center flex-wrap select-none pt-1">
          <span className="text-[10px] text-slate-500 font-mono">Suggested:</span>
          <button
            onClick={() => {
              setSearchQuery("where do we initialize the express network server");
              triggerIntentSearch("where do we initialize the express network server");
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-teal-500/30 leading-snug cursor-pointer font-mono"
          >
            "express network start"
          </button>
          <button
            onClick={() => {
              setSearchQuery("where are secure files read and restricted");
              triggerIntentSearch("where are secure files read and restricted");
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-teal-500/30 leading-snug cursor-pointer font-mono"
          >
            "secure workspace access"
          </button>
        </div>
      </div>

      {/* Display Intent results list */}
      {isSearching ? (
        <div className="space-y-3 py-8 text-center animate-pulse">
          <RotateCw className="w-8 h-8 text-teal-400 animate-spin mx-auto opacity-80" />
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">
            ANALYZING INTENT CLUSTERS WITH GEMINI...
          </p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-4">
          {searchResults.map((match, i) => (
            <div key={i} className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 hover:border-slate-800/80 transition space-y-4">
              
              {/* Match header information bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-950 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-teal-950 text-teal-300 font-mono text-[10px] font-bold rounded flex items-center justify-center border border-teal-800/40 select-none">
                    #{(i + 1)}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white tracking-wide break-all">
                      {match.filePath}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Snippet lines {match.startLine} to {match.endLine}
                    </p>
                  </div>
                </div>
                
                {/* Score Confidence Badge */}
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[10px] text-slate-400">Match Confidence:</span>
                  <span className={`px-2 py-0.5 text-xs text-slate-950 font-bold rounded ${match.score >= 8 ? "bg-emerald-400" : "bg-amber-400"}`}>
                    {match.score}/10
                  </span>
                </div>
              </div>

              {/* Semantic Explanation message banner */}
              <div className="p-3 bg-teal-950/20 border-l-2 border-teal-500/45 text-[11px] text-slate-300 font-mono leading-relaxed flex gap-2">
                <Info className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                <p>
                  <span className="font-bold text-teal-300">Rationale:</span> {match.matchRationale}
                </p>
              </div>

              {/* Interactive Code Container */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono">RELEVANT BLOCK</span>
                  <button
                    onClick={() => viewFileContent(match.filePath)}
                    className="text-teal-400 hover:text-white flex items-center gap-1 cursor-pointer font-mono font-bold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect Code
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 border border-slate-900/60 rounded-lg overflow-x-auto text-[10.5px] font-mono leading-normal text-slate-200 block max-h-[220px]">
                  {match.snippet}
                </pre>
              </div>
            </div>
          ))}
        </div>
      ) : !status.indexed ? (
        <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-3">
          <Activity className="w-8 h-8 text-slate-500 mx-auto" />
          <div>
            <p className="text-xs font-bold text-white">System Index Database Missing</p>
            <p className="text-[11px] text-slate-400">
              Please look at the master controller above and click <span className="text-amber-400 font-semibold">Run Init</span> to map the codebase project first.
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-900 rounded-xl p-8 text-center text-slate-400 py-12 space-y-2">
          <Terminal className="w-8 h-8 text-slate-700 mx-auto" />
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No intent query processed yet in search tracker. Enter a query behavior in the search block and press search command.
          </p>
        </div>
      )}
    </div>
  );
}

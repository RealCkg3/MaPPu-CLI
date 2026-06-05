import { GrepResult } from "../../types";
import { Search, RotateCw, Play, Compass } from "lucide-react";

interface GrepTabProps {
  grepQuery: string;
  setGrepQuery: (val: string) => void;
  grepResults: GrepResult[];
  setGrepResults: (val: GrepResult[]) => void;
  isGrepping: boolean;
  triggerGrepSearch: (overrideVal?: string) => Promise<any>;
  viewFileContent: (path: string) => void;
}

export default function GrepTab({
  grepQuery,
  setGrepQuery,
  grepResults,
  setGrepResults,
  isGrepping,
  triggerGrepSearch,
  viewFileContent,
}: GrepTabProps) {
  return (
    <div className="space-y-6 text-slate-100">
      {/* Intro header */}
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Search className="w-4 h-4 text-emerald-400 rotate-90 animate-pulse" />
          RECURSIVE RIPGREP CONTENT SEARCH (FAST RETRIEVAL ENGINE)
        </h2>
        <p className="text-[11px] text-slate-400">
          Sift through lines of code globally across all code modules, templates and custom sandbox files matching exact patterns.
        </p>
      </div>

      {/* Main Action Controllers form bar */}
      <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 font-bold" />
            <input
              type="text"
              value={grepQuery}
              onChange={(e) => setGrepQuery(e.target.value)}
              placeholder="Search literal code lines (e.g. const PORT, def test, import)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>
          <button
            disabled={isGrepping || !grepQuery.trim()}
            onClick={() => triggerGrepSearch()}
            className="px-5 py-2.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
          >
            {isGrepping ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
            Grep Workspace
          </button>
        </div>

        {/* Preset Quick Greps shortcuts */}
        <div className="flex gap-2 items-center flex-wrap select-none pt-1">
          <span className="text-[10px] text-slate-500 font-mono">Suggested filters:</span>
          {["const ", "import ", "def ", "function", "jwt", "express", "sandbox"].map((word) => (
            <button
              key={word}
              onClick={() => {
                setGrepQuery(word);
                triggerGrepSearch(word);
              }}
              className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-emerald-500/30 font-mono cursor-pointer"
            >
              {word}
            </button>
          ))}
        </div>
      </div>

      {/* Grepping live metrics or loaders */}
      {isGrepping ? (
        <div className="space-y-3 py-10 text-center animate-pulse border border-slate-900/80 rounded-xl bg-slate-950/20">
          <RotateCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto opacity-70" />
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">
            RECURSIVELY SCANNING WORKSPACE WITH RIPGREP...
          </p>
        </div>
      ) : grepResults.length > 0 ? (
        <div className="space-y-4 font-sans text-slate-200">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono pl-1">
            <span>Total matches: <span className="text-emerald-400 font-semibold">{grepResults.length} occurrences</span> across scoped directories</span>
            <button onClick={() => setGrepResults([])} className="text-slate-500 hover:text-white transition cursor-pointer">
              Clear Results
            </button>
          </div>

          <div className="bg-slate-950/60 border border-slate-900 rounded-xl overflow-hidden divide-y divide-slate-900/45">
            {grepResults.map((match, idx) => {
              // Highlight matched segment keyword carefully
              const line = match.lineContent;
              const keywords = grepQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
              const reg = new RegExp(`(${keywords})`, "gi");
              const parts = line.split(reg);

              return (
                <div key={idx} className="p-3 hover:bg-slate-905/30 grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs transition duration-150 animate-fade-in group md:pr-4">
                  
                  {/* File Path & Line indicators segment */}
                  <div className="md:col-span-4 flex items-center justify-between md:justify-start gap-3">
                    <span className="text-slate-300 font-bold font-mono tracking-tight truncate max-w-[200px]" title={match.filePath}>
                      📄 {match.filePath}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-emerald-400 font-mono rounded font-bold shrink-0">
                      Line {match.lineNumber}
                    </span>
                  </div>

                  {/* Highlight matching details text inline */}
                  <div className="md:col-span-6 bg-slate-950/80 border border-slate-905 rounded px-2.5 py-1.5 font-mono text-[11px] text-slate-400 leading-normal overflow-x-auto truncate">
                    {parts.map((part, i) =>
                      reg.test(part) ? (
                        <span key={i} className="text-slate-950 bg-emerald-400/90 font-bold px-1 rounded-sm leading-none m-0.5">
                          {part}
                        </span>
                      ) : (
                        part
                      )
                    )}
                  </div>

                  {/* Actions links to open files in split reader */}
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      onClick={() => viewFileContent(match.filePath)}
                      className="px-3 py-1.5 text-[9.5px] bg-slate-900 hover:bg-emerald-955/40 hover:text-white hover:border-emerald-800/40 border border-slate-800 text-slate-300 font-mono font-bold rounded-lg transition overflow-hidden cursor-pointer whitespace-nowrap"
                    >
                      View File
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      ) : grepQuery && !isGrepping ? (
        <div className="border border-dashed border-slate-900 rounded-xl p-8 py-10 text-center text-slate-400 space-y-2">
          <Search className="w-8 h-8 text-slate-800 mx-auto" />
          <p className="text-xs font-bold text-slate-400">No literals matching "{grepQuery}" found.</p>
          <p className="text-[10.5px] text-slate-500 max-w-xs mx-auto">
            Refine the search query. Direct sandbox additions are immediately indexable and scanned!
          </p>
        </div>
      ) : (
        <div className="border border-dashed border-slate-900 rounded-xl p-8 py-10 text-center text-slate-400 space-y-2">
          <Compass className="w-8 h-8 text-slate-700 mx-auto" />
          <p className="text-xs font-bold text-slate-400">Wait-state: Sifter idle.</p>
          <p className="text-[10.5px] text-slate-500 max-w-sm mx-auto leading-normal">
            Enter a literal parameter or select a suggestion keyword from the hotbar to recursively inspect directory lines!
          </p>
        </div>
      )}
    </div>
  );
}

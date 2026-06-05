import { RefactorPlan, IndexStatus } from "../../types";
import { Wrench, RotateCw, Play, Eye } from "lucide-react";

interface RefactorTabProps {
  refactorQuery: string;
  setRefactorQuery: (val: string) => void;
  refactorPlan: RefactorPlan | null;
  isRefactoring: boolean;
  status: IndexStatus;
  triggerRefactorPlan: (overrideVal?: string) => Promise<any>;
  viewFileContent: (path: string) => void;
}

export default function RefactorTab({
  refactorQuery,
  setRefactorQuery,
  refactorPlan,
  isRefactoring,
  status,
  triggerRefactorPlan,
  viewFileContent,
}: RefactorTabProps) {
  return (
    <div className="space-y-6">
      {/* Intro header */}
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Wrench className="w-4 h-4 text-emerald-400" />
          AI ARCHITECTURAL REFACTORING PLANNER
        </h2>
        <p className="text-[11px] text-slate-400">
          Draft modular, multi-step instructions and specific code recipes to satisfy high-level refactoring goals across the workspace.
        </p>
      </div>

      {/* Input Query Controls */}
      <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Wrench className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={refactorQuery}
              onChange={(e) => setRefactorQuery(e.target.value)}
              placeholder="e.g. migrate routes to use consistent middleware..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition whitespace-pre-wrap"
            />
          </div>
          <button
            disabled={isRefactoring || !status.indexed}
            onClick={() => triggerRefactorPlan()}
            className="px-5 py-2.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
          >
            {isRefactoring ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
            Generate Blueprint
          </button>
        </div>

        {/* Suggestions */}
        <div className="flex gap-2 items-center flex-wrap select-none pt-1">
          <span className="text-[10px] text-slate-500 font-mono">Suggested Refactors:</span>
          <button
            onClick={() => {
              setRefactorQuery("standardize Express endpoint response errors");
              triggerRefactorPlan("standardize Express endpoint response errors");
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-emerald-500/30 leading-snug cursor-pointer font-mono"
          >
            "JSON responses"
          </button>
          <button
            onClick={() => {
              setRefactorQuery("extract prompt instructions from mappu core to specialized separate schema config file");
              triggerRefactorPlan("extract prompt instructions from mappu core to specialized separate schema config file");
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-emerald-500/30 leading-snug cursor-pointer font-mono"
          >
            "split engine constants"
          </button>
        </div>
      </div>

      {/* Display plan report panel */}
      {isRefactoring ? (
        <div className="space-y-3 py-8 text-center animate-pulse">
          <RotateCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto opacity-80" />
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">
            COMPILING REFACTORIZATION BLUEPRINT...
          </p>
        </div>
      ) : refactorPlan ? (
        <div className="space-y-6">
          {/* Strategy summary box */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                REFACTOR PLAN: {refactorPlan.directive}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-lg space-y-1.5">
                <span className="text-[9px] font-mono text-indigo-400 font-bold tracking-widest uppercase block border-b border-slate-900 pb-1">
                  STRATEGY OVERVIEW
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  {refactorPlan.strategyOverview}
                </p>
              </div>
              <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-lg space-y-1.5">
                <span className="text-[9px] font-mono text-emerald-400 font-bold tracking-widest uppercase block border-b border-slate-900 pb-1">
                  EXPECTED OUTCOMES
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  {refactorPlan.expectedOutcomes}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline recipe steps list */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
              PHASED ACTION STEPS RECIPE:
            </h4>

            {refactorPlan.steps.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-400">
                <p className="font-mono text-xs">No modification steps required for this scope.</p>
              </div>
            ) : (
              refactorPlan.steps.map((step, idx) => (
                <div key={idx} className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-4 relative overflow-hidden">
                  
                  {/* Accent indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/60" />

                  <div className="flex items-center justify-between gap-3 border-b border-slate-950 pb-2.5 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 bg-emerald-955 text-emerald-300 font-mono text-[10px] font-bold rounded flex items-center justify-center border border-emerald-800/40 select-none">
                        {step.step || (idx + 1)}
                      </span>
                      <span className="text-xs font-bold text-white font-mono break-all leading-normal">
                        {step.filePath}
                      </span>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold tracking-widest uppercase ${
                      step.action === "create" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                      step.action === "delete" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                      "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    }`}>
                      {step.action || "modify"}
                    </span>
                  </div>

                  {/* Walkthrough rationale */}
                  <div className="text-[11px] text-slate-300 leading-relaxed pl-5 font-sans">
                    <span className="font-bold text-slate-400 font-mono text-[10px] uppercase block mb-1">STEP DIRECTION:</span>
                    {step.explanation}
                  </div>

                  {/* Inspection button */}
                  <div className="pl-5 flex justify-end">
                    <button
                      onClick={() => viewFileContent(step.filePath)}
                      className="text-[10px] flex items-center gap-1 hover:text-emerald-400 text-slate-400 transition cursor-pointer font-mono font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect File Source
                    </button>
                  </div>

                  {/* Snippet comparators */}
                  {step.targetContent && (
                    <div className="pl-5 grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono font-bold text-slate-500 block uppercase">
                          Target Code String (To Replace)
                        </span>
                        <pre className="p-3 bg-slate-950 border border-slate-950 text-[10px] font-mono text-slate-400 rounded overflow-x-auto block leading-normal line-clamp-6 select-text max-h-[160px]">
                          {step.targetContent}
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono font-bold text-emerald-400 block uppercase">
                          Proposed Insertion String (Replacement)
                        </span>
                        <pre className="p-3 bg-slate-950 border border-emerald-950/20 text-[10px] font-mono text-emerald-300 rounded overflow-x-auto block leading-normal line-clamp-6 select-text max-h-[160px] bg-emerald-950/5">
                          {step.replacementContent}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-900 rounded-xl p-8 text-center text-slate-400 py-12">
          <Wrench className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-pulse" />
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No refactor blueprint prepared. Describe a logical system migration goal above and execute.
          </p>
        </div>
      )}
    </div>
  );
}

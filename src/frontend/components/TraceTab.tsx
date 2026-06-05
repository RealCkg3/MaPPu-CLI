import { TraceFlow, IndexStatus } from "../../types";
import { Layers, RotateCw, Play, ArrowRight } from "lucide-react";

interface TraceTabProps {
  traceQuery: string;
  setTraceQuery: (val: string) => void;
  traceFlow: TraceFlow | null;
  isTracing: boolean;
  status: IndexStatus;
  triggerTraceLogs: (overrideVal?: string) => Promise<any>;
  viewFileContent: (path: string) => void;
}

export default function TraceTab({
  traceQuery,
  setTraceQuery,
  traceFlow,
  isTracing,
  status,
  triggerTraceLogs,
  viewFileContent,
}: TraceTabProps) {
  return (
    <div className="space-y-6">
      {/* Intro header */}
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          CROSS-MODULE CODE EXECUTION TRACER
        </h2>
        <p className="text-[11px] text-slate-400">
          Reconstruct and chart sequence calls or operational flowchains from triggers to outputs using AST relationship modeling.
        </p>
      </div>

      {/* Query Panel */}
      <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
            <input
              type="text"
              value={traceQuery}
              onChange={(e) => setTraceQuery(e.target.value)}
              placeholder="e.g. login payload authentication trace cascade..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
            />
          </div>
          <button
            disabled={isTracing || !status.indexed}
            onClick={() => triggerTraceLogs()}
            className="px-5 py-2.5 bg-indigo-500 text-slate-950 hover:bg-indigo-400 transition text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
          >
            {isTracing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
            Compile Trace
          </button>
        </div>

        {/* Preset Tracer Shortcuts */}
        <div className="flex gap-2 items-center flex-wrap select-none pt-1">
          <span className="text-[10px] text-slate-500 font-mono">Suggested Traces:</span>
          <button
            onClick={() => {
              setTraceQuery("what runs when a client issues a shell instruction query");
              triggerTraceLogs("what runs when a client issues a shell instruction query");
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-indigo-500/30 leading-snug cursor-pointer font-mono"
          >
            "interactive shell flow"
          </button>
          <button
            onClick={() => {
              setTraceQuery("trace flow from express status API endpoint to local filesystem lookups");
              triggerTraceLogs("trace flow from express status API endpoint to local filesystem lookups");
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-indigo-500/30 leading-snug cursor-pointer font-mono"
          >
            "status check lifecycle"
          </button>
        </div>
      </div>

      {/* Display results */}
      {isTracing ? (
        <div className="space-y-3 py-8 text-center animate-pulse">
          <RotateCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto opacity-80" />
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">
            BUILDING TRACER MAP CONNECTIONS...
          </p>
        </div>
      ) : traceFlow ? (
        <div className="space-y-6">
          {/* General roadmap summary header card */}
          <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4 flex gap-3">
            <Layers className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h3 className="text-xs font-bold text-white mb-1">TRACER OVERVIEW BLUEPRINT</h3>
              <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                {traceFlow.overviewFlow}
              </p>
            </div>
          </div>

          {/* Step-by-Step Chronological cascade Nodes */}
          <div className="relative pl-6 space-y-6 after:absolute after:top-2 after:bottom-2 after:left-[11px] after:w-0.5 after:bg-slate-800/80">
            {traceFlow.steps.map((step, i) => (
              <div key={i} className="relative group">
                {/* Anchor Circle marker indicator */}
                <span className="absolute -left-[20px] top-1.5 w-[11px] h-[11px] rounded-full bg-slate-950 border-2 border-indigo-500 z-10 shadow-md shadow-indigo-500/20 transition group-hover:scale-125" />

                <div className="bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-xl p-4 space-y-3">
                  {/* Step meta header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-950 pb-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">
                      Call Step #{step.step}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-bold text-indigo-400">File:</span>
                      <span className="font-mono text-slate-200">{step.filePath}</span>
                      <span className="text-slate-600 font-bold">&#8212;</span>
                      <span className="italic">{step.lines}</span>
                    </div>
                  </div>

                  {/* Block detailed block content */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">
                      {step.blockName}
                    </p>
                    <p className="text-[11px] text-slate-300 font-sans">
                      {step.description}
                    </p>
                  </div>

                  {/* Snippet display under trace step if present */}
                  {step.logicSnippet && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                        <span className="font-mono">IDENTIFIED HOOK SEQUENCE</span>
                        <button
                          onClick={() => viewFileContent(step.filePath)}
                          className="text-indigo-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                        >
                          Inspect file
                        </button>
                      </div>
                      <code className="block p-3 bg-slate-950 rounded border border-slate-900 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-[140px]">
                        {step.logicSnippet}
                      </code>
                    </div>
                  )}
                </div>

                {/* Sequence arrowhead indicator */}
                {i < traceFlow.steps.length - 1 && (
                  <div className="h-4 flex items-center justify-center pointer-events-none select-none">
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-900 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-900 rounded-xl p-8 text-center text-slate-400 py-12">
          <Layers className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-pulse" />
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No active calltrace mapped yet. State your sequence goals in the diagnostic console panel.
          </p>
        </div>
      )}
    </div>
  );
}

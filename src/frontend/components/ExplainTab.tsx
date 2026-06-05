import { ExplanationReport, IndexStatus } from "../../types";
import { BookOpen, RotateCw, Play, Cpu, ArrowRight } from "lucide-react";

interface ExplainTabProps {
  explainQuery: string;
  setExplainQuery: (val: string) => void;
  explainReport: ExplanationReport | null;
  isExplaining: boolean;
  status: IndexStatus;
  triggerExplainer: (overrideVal?: string) => Promise<any>;
  viewFileContent: (path: string) => void;
}

export default function ExplainTab({
  explainQuery,
  setExplainQuery,
  explainReport,
  isExplaining,
  status,
  triggerExplainer,
  viewFileContent,
}: ExplainTabProps) {
  return (
    <div className="space-y-6">
      {/* Intro header */}
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          AI ARCHITECTURAL CONCEPT EXPLAINER
        </h2>
        <p className="text-[11px] text-slate-400">
          Snoop into design decisions, decode software design patterns, and render interactive logical flow diagram sequences cleanly.
        </p>
      </div>

      {/* Input query box */}
      <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={explainQuery}
              onChange={(e) => setExplainQuery(e.target.value)}
              placeholder="e.g. how does indexing parser chunk TS code..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition whitespace-pre-wrap"
            />
          </div>
          <button
            disabled={isExplaining || !status.indexed}
            onClick={() => triggerExplainer()}
            className="px-5 py-2.5 bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
          >
            {isExplaining ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
            Explain System
          </button>
        </div>

        {/* Recommendations */}
        <div className="flex gap-2 items-center flex-wrap select-none pt-1">
          <span className="text-[10px] text-slate-500 font-mono">Suggested Walks:</span>
          <button
            onClick={() => {
              setExplainQuery("how the Mappu Core structures and parses the AST vector tree");
              triggerExplainer("how the Mappu Core structures and parses the AST vector tree");
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-cyan-500/30 leading-snug cursor-pointer font-mono"
          >
            "AST vector index flow"
          </button>
          <button
            onClick={() => {
              setExplainQuery("middleware routing in express application start");
              triggerExplainer("middleware routing in express application start");
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-cyan-500/30 leading-snug cursor-pointer font-mono"
          >
            "networking routing"
          </button>
        </div>
      </div>

      {/* Return report state screen panels */}
      {isExplaining ? (
        <div className="space-y-3 py-8 text-center animate-pulse">
          <RotateCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto opacity-80" />
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">
            BUILDING HIGHLIGHTS WALK-THROUGH...
          </p>
        </div>
      ) : explainReport ? (
        <div className="space-y-6">
          
          {/* Walkthrough card */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-950 pb-2">
              <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block font-bold">
                CONCEPT FOCUS Walkthrough
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-teal-950 border border-teal-850 text-teal-300 rounded font-mono font-bold uppercase tracking-wider">
                Style: {explainReport.architecturalStyle || "modular modularity"}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed pl-1 font-sans">
              {explainReport.highLevelOverview}
            </p>
          </div>

          {/* Detected design patterns list */}
          {explainReport.keyDesignPatterns && explainReport.keyDesignPatterns.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-widest">
                IDENTIFIED SOFTWARE STRUCTURAL DESIGN PATTERNS:
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {explainReport.keyDesignPatterns.map((pat, key) => (
                  <div key={key} className="bg-slate-950 border border-slate-900 rounded-lg p-4 space-y-2 relative">
                    <h5 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      {pat.patternName}
                    </h5>
                    <p className="text-[11px] text-slate-300 leading-normal font-sans">
                      {pat.description}
                    </p>
                    <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-900">
                      <span>Code Base:</span>
                      <button
                        onClick={() => viewFileContent(pat.locationInCode)}
                        className="text-cyan-400 hover:text-white transition cursor-pointer font-bold break-all max-w-[150px] truncate"
                        title={pat.locationInCode}
                      >
                        {pat.locationInCode}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive graphical Mermaid flowchart sequence tree */}
          {explainReport.mermaidFlowchart && (
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-widest">
                SEQUENCE ARCHITECTURE TOPOLOGY DIAGRAM:
              </h4>
              
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 space-y-4">
                
                {/* Visual Diagram Representation Block (Rendered beautifully using interactive connect cards!) */}
                <div className="space-y-3.5 pl-1">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                    Logical Diagram Nodes Sequence Walk
                  </span>
                  
                  <div className="flex flex-col gap-2 font-mono">
                    {explainReport.mermaidFlowchart.split("\n")
                      .filter(line => line.includes("-->") || line.includes("-->") || line.includes("--&gt;"))
                      .map((link, ind) => {
                        // Parse nodes
                        const rawParts = link.split(/-->|--&gt;/);
                        const nodeLabelA = rawParts[0]?.replace(/[\[\]\(\)\{\}\""]/g, "")?.trim();
                        const nodeLabelB = rawParts[1]?.replace(/[\[\]\(\)\{\}\""]/g, "")?.trim();
                        if (!nodeLabelA || !nodeLabelB) return null;
                        return (
                          <div key={ind} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/55 p-3 rounded-lg border border-slate-900 text-xs text-slate-200">
                            <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-200 rounded font-bold flex items-center gap-1.5 shrink-0 max-w-full truncate">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              {nodeLabelA}
                            </div>
                            <div className="flex items-center justify-center py-1 sm:py-0">
                              <ArrowRight className="w-4 h-4 text-cyan-550" />
                            </div>
                            <div className="px-3 py-1.5 bg-slate-950 border border-cyan-950/20 text-cyan-300 rounded font-bold flex items-center gap-1.5 shrink-0 max-w-full truncate">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              {nodeLabelB}
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>

                {/* Raw code text dropdown fallback */}
                <div className="space-y-2 border-t border-slate-900 pt-4">
                  <span className="text-[9.5px] font-mono text-slate-500 uppercase block font-bold">
                    Raw Mermaid Flowchart Definition Schema Code
                  </span>
                  <pre className="p-4 bg-slate-900/40 border border-slate-900 rounded-lg text-[10.5px] font-mono text-slate-300 overflow-x-auto leading-normal select-text">
                    {explainReport.mermaidFlowchart}
                  </pre>
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="border border-dashed border-slate-900 rounded-xl p-8 text-center text-slate-400 py-12">
          <BookOpen className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-pulse" />
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No system concepts walkthrough retrieved. Query an operational walkthrough target to generate insights.
          </p>
        </div>
      )}
    </div>
  );
}

import { IndexStatus } from "../../types";
import { FileCode, FileText, Code, Activity, Network, Layers3, Cpu, TerminalSquare, Info } from "lucide-react";

interface TopologyTabProps {
  status: IndexStatus;
  viewFileContent: (path: string) => void;
}

export default function TopologyTab({
  status,
  viewFileContent,
}: TopologyTabProps) {
  // Group files into functional modular communities statically (Louvain heuristic simulation by directory boundaries)
  const filesList = status.files || [];
  
  const communities: { name: string; icon: any; color: string; bg: string; border: string; files: any[] }[] = [
    {
      name: "Modular Analytical Engines",
      icon: <Cpu className="w-4 h-4 text-teal-400 shrink-0" />,
      color: "text-teal-400",
      bg: "bg-teal-950/5",
      border: "border-teal-900/40",
      files: filesList.filter(f => f.filePath.includes("src/engines") || f.filePath.includes("src/graph"))
    },
    {
      name: "React Interactive Layer",
      icon: <Layers3 className="w-4 h-4 text-indigo-400 shrink-0" />,
      color: "text-indigo-400",
      bg: "bg-indigo-950/5",
      border: "border-indigo-900/40",
      files: filesList.filter(f => f.filePath.includes("src/frontend"))
    },
    {
      name: "CLI & Server Boundaries",
      icon: <TerminalSquare className="w-4 h-4 text-amber-400 shrink-0" />,
      color: "text-amber-400",
      bg: "bg-amber-950/5",
      border: "border-amber-900/40",
      files: filesList.filter(f => f.filePath.includes("src/cli") || f.filePath.includes("server.ts") || f.filePath.includes("src/cli.ts"))
    },
    {
      name: "Structural Configs & Schema Profiles",
      icon: <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
      color: "text-cyan-400",
      bg: "bg-cyan-950/5",
      border: "border-cyan-900/40",
      files: filesList.filter(f => !f.filePath.includes("src/engines") && !f.filePath.includes("src/graph") && !f.filePath.includes("src/frontend") && !f.filePath.includes("src/cli") && f.filePath !== "server.ts" && f.filePath !== "src/cli.ts")
    }
  ].filter(c => c.files.length > 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <FileCode className="w-4 h-4 text-teal-400" />
          INDEXED REPOSITORY MOLECULAR TREE
        </h2>
        <p className="text-[11px] text-slate-400">
          Snoop into the workspace source directories recursively to study functional communities, file specifications and export blueprints.
        </p>
      </div>

      {status.indexed && filesList.length > 0 ? (
        <div className="space-y-6">
          {/* Functional communities bento grid mapping (Idea 12) */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-mono font-black text-slate-400 tracking-wider uppercase pl-1 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-indigo-400" />
              Louvain Modularity Communities Hierarchy
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {communities.map((comm, idx) => (
                <div
                  key={idx}
                  className={`border rounded-2xl p-4 space-y-3 transition group ${comm.bg} ${comm.border}`}
                >
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-950">
                    {comm.icon}
                    <div className="min-w-0">
                      <span className={`text-[12px] font-bold block ${comm.color}`}>{comm.name}</span>
                      <span className="text-[9px] text-slate-400 font-mono text-[9px]">Cluster module components: {comm.files.length}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {comm.files.map((file, fIdx) => (
                      <span
                        key={fIdx}
                        onClick={() => viewFileContent(file.filePath)}
                        className="px-2 py-0.5.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 text-[10px] text-slate-350 hover:text-white font-mono rounded cursor-pointer transition truncate max-w-xs"
                        title={file.filePath}
                      >
                        {file.filePath.split("/").pop()}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scanned files checklist cards */}
          <div className="space-y-2 pt-2">
            <h3 className="text-[10px] font-mono font-black text-slate-400 tracking-wider uppercase pl-1">
              📂 Structural File Registry Specifications
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filesList.map((file, i) => (
                <div key={i} className="bg-slate-900/25 border border-slate-900 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-950 pb-2">
                      <span className="flex items-center gap-2 text-xs font-bold text-white break-all pr-2">
                        <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                        {file.filePath}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.3 bg-slate-950 border border-slate-800 text-slate-400 rounded uppercase font-mono tracking-widest shrink-0">
                        {file.languages}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-normal">
                      {file.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-950 pt-2 text-[10px] font-mono">
                    {file.exports.length > 0 && (
                      <p className="text-slate-400 truncate">
                        <span className="text-indigo-400 font-bold">Exports:</span> [ {file.exports.join(", ")} ]
                      </p>
                    )}
                    {file.imports.length > 0 && (
                      <p className="text-slate-500 truncate">
                        <span className="text-slate-400">Imports:</span> [ {file.imports.join(", ")} ]
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => viewFileContent(file.filePath)}
                    className="w-full mt-2 py-1.5 bg-slate-950 hover:bg-teal-950/20 hover:text-teal-400 text-[10px] border border-slate-800 hover:border-teal-800/40 font-mono text-slate-300 font-bold rounded-lg transition tracking-wider flex items-center justify-center gap-1 cursor-pointer font-bold"
                  >
                    <Code className="w-3.5 h-3.5" />
                    INSPECT SOURCE MODULES
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-900 rounded-xl p-8 text-center text-slate-400 py-12">
          <Activity className="w-8 h-8 text-slate-700 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Gathering file paths topology list. Direct Indexing compiles standard structures dynamically. Click Run Init.
          </p>
        </div>
      )}
    </div>
  );
}

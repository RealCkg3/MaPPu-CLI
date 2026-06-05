import * as React from "react";
import { SandboxFile, IndexStatus } from "../../types";
import { Cpu, Plus, Upload, FolderOpen, RotateCw, Compass, Trash2, Terminal, Play, Download } from "lucide-react";

interface SandboxTabProps {
  newFileName: string;
  setNewFileName: (val: string) => void;
  newFileContent: string;
  setNewFileContent: (val: string) => void;
  isSavingCustomFile: boolean;
  handleSaveCustomFile: (filePath: string, content: string) => void;
  dragActive: boolean;
  setDragActive: (val: boolean) => void;
  handleFileUpload: (files: FileList | null) => void;
  fetchSandboxFiles: () => void;
  isSandboxLoading: boolean;
  sandboxFiles: SandboxFile[];
  setDoctorQuery: (val: string) => void;
  setActiveTab: (val: string) => void;
  setIsDiagnosing: (val: boolean) => void;
  setDoctorReport: (val: any) => void;
  setExplainQuery: (val: string) => void;
  setIsExplaining: (val: boolean) => void;
  setExplainReport: (val: any) => void;
  setViewingFile: (val: any) => void;
  handleDeleteSandboxFile: (filePath: string) => void;
  isIndexing: boolean;
  setIsIndexing: (val: boolean) => void;
  setIndexingLogs: (val: string[]) => void;
  fetchStatus: () => Promise<any>;
  setTerminalHistory: React.Dispatch<React.SetStateAction<any[]>>;
  setErrorBanner: (val: string | null) => void;
  setTerminalInput: (val: string) => void;
}

export default function SandboxTab({
  newFileName,
  setNewFileName,
  newFileContent,
  setNewFileContent,
  isSavingCustomFile,
  handleSaveCustomFile,
  dragActive,
  setDragActive,
  handleFileUpload,
  fetchSandboxFiles,
  isSandboxLoading,
  sandboxFiles,
  setDoctorQuery,
  setActiveTab,
  setIsDiagnosing,
  setDoctorReport,
  setExplainQuery,
  setIsExplaining,
  setExplainReport,
  setViewingFile,
  handleDeleteSandboxFile,
  isIndexing,
  setIsIndexing,
  setIndexingLogs,
  fetchStatus,
  setTerminalHistory,
  setErrorBanner,
  setTerminalInput,
}: SandboxTabProps) {
  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Intro header */}
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400 animate-pulse" />
          SANDBOX INTELLIGENT WORKSPACE & FILE MANAGER
        </h2>
        <p className="text-[11px] text-slate-400">
          Create mockup files, drag-and-drop code logic, and examine them via simulated terminal commands in an immersive mobile-friendly panel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Creation & Uploader Control panel */}
        <div className="md:col-span-12 lg:col-span-5 space-y-4">
          
          {/* File Creator Box */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-3.5">
            <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold block flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Create or Edit Sandbox File
            </span>
            
            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-500 block">File Path:</label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="sandbox/analytics-helper.py"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
              </div>

              {/* Templates Injector Selector */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-slate-500 block">Select Code Template Preset:</span>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      setNewFileName("sandbox/auth-routes.js");
                      setNewFileContent(`// Node.js Express OAuth Route controllers
const express = require('express');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and credentials required.' });
  }
  console.log('Validating user: ' + username);
  res.json({ token: 'bearer-mock-signature-hash' });
});

module.exports = router;`);
                    }}
                    className="text-[9px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-amber-500/40 cursor-pointer font-mono font-medium leading-none"
                  >
                    Express Auth.js
                  </button>

                  <button
                    onClick={() => {
                      setNewFileName("sandbox/weather-worker.py");
                      setNewFileContent(`# Python asyncio API collector worker or crawler
import asyncio
import random

async def fetch_telemetry_rates(city):
    print(f"Polling telemetry stats from {city} systems...")
    await asyncio.sleep(1)
    return {
        "device": f"sensor-{random.randint(100, 999)}",
        "pressure": round(random.uniform(980.5, 1025.2), 2),
        "status": "active"
    }

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    res = loop.run_until_complete(fetch_telemetry_rates("London"))
    print("Telemetry reports:", res)`);
                    }}
                    className="text-[9px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-amber-500/40 cursor-pointer font-mono font-medium leading-none"
                  >
                    Python Asyncio.py
                  </button>

                  <button
                    onClick={() => {
                      setNewFileName("sandbox/counter-hook.tsx");
                      setNewFileContent(`import { useState, useEffect } from 'react';

// Highly-interactive modular React state hook
export function useSharedCounter(initialVal = 0) {
  const [count, setCount] = useState(initialVal);

  useEffect(() => {
    console.log("Subscribing counter ticks...");
    return () => console.log("Unsubscribed ticks");
  }, []);

  const increment = () => setCount(prev => prev + 1);
  return { count, increment };
}`);
                    }}
                    className="text-[9px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-amber-500/40 cursor-pointer font-mono font-medium leading-none"
                  >
                    React Hook.tsx
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-500 block">File Source:</label>
                <textarea
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  rows={8}
                  className="w-full p-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-y leading-relaxed select-text"
                />
              </div>
            </div>

            <button
              disabled={isSavingCustomFile}
              onClick={() => handleSaveCustomFile(newFileName, newFileContent)}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-955 transition text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSavingCustomFile ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save to Storage
            </button>
          </div>

          {/* Touch / Drag DragZone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileUpload(e.dataTransfer.files); }}
            className={`border border-dashed rounded-xl p-5 text-center flex flex-col justify-center items-center transition relative overflow-hidden h-36 ${
              dragActive ? "border-amber-400 bg-amber-500/5" : "border-slate-800 bg-slate-900/10 hover:border-slate-700"
            }`}
          >
            <Upload className={`w-8 h-8 mb-1.5 transition ${dragActive ? "scale-110 text-amber-400 animate-bounce" : "text-slate-600"}`} />
            <p className="text-xs text-slate-300 font-bold">Drag & Drop Files Here</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Supports TS, JS, PY, JSON, etc.</p>
            
            <label className="mt-2.5 cursor-pointer">
              <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 rounded-md hover:text-white transition hover:bg-slate-800">
                Upload File
              </span>
              <input
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </label>
          </div>

        </div>

        {/* Sandbox File Inventory */}
        <div className="md:col-span-12 lg:col-span-7 space-y-4">
          
          {/* Intro subtitle */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-amber-400" />
              Custom Uploads in Sandbox
            </h3>
            <button
              onClick={fetchSandboxFiles}
              className="text-[10px] font-mono text-slate-400 hover:text-amber-400 transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className={`w-3 h-3 ${isSandboxLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {isSandboxLoading ? (
            <div className="p-12 text-center text-slate-500 border border-slate-900 rounded-xl">
              <RotateCw className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-mono">LOADING STORAGE CATALOG...</p>
            </div>
          ) : sandboxFiles.length === 0 ? (
            <div className="border border-dashed border-slate-900 rounded-xl p-8 py-10 text-center text-slate-400 space-y-2">
              <Compass className="w-8 h-8 text-slate-700 mx-auto animate-pulse" />
              <p className="text-xs font-bold text-slate-300">No sandbox files found yet.</p>
              <p className="text-[10.5px] text-slate-500 max-w-xs mx-auto">
                Upload your script or select a preset and tap "Save to Storage" to test execution mappings!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sandboxFiles.map((file, idx) => {
                const ext = file.filePath.split(".").pop() || "";
                return (
                  <div key={idx} className="bg-slate-900/30 border border-slate-900 hover:border-amber-500/20 rounded-xl p-4 flex flex-col justify-between space-y-3 relative group transition animate-fade-in shadow-sm">
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between border-b border-slate-950 pb-2">
                        <span className="text-xs font-mono font-bold text-slate-200 leading-tight truncate pr-2 break-all" title={file.filePath}>
                          📄 {file.filePath.replace("sandbox/", "")}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.3 bg-slate-955 border border-slate-800 text-amber-300 font-mono rounded uppercase font-bold shrink-0">
                          {ext}
                        </span>
                      </div>

                      <div className="font-mono text-[9px] text-slate-500 flex items-center gap-3">
                        <span>{file.size} Bytes</span>
                        <span className="w-1 h-1 bg-slate-800 rounded-full" />
                        <span>{file.lines} Lines</span>
                      </div>

                      <div className="text-[9.5px] p-2 bg-slate-950/70 border border-slate-950 rounded text-slate-400 font-mono truncate h-12 leading-relaxed">
                        {file.content}
                      </div>
                    </div>

                    {/* Operations selection */}
                    <div className="space-y-2.5 border-t border-slate-955 pt-2.5">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold">
                        Diagnose / Query File
                      </span>
                      
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            setDoctorQuery(`unprocessed edge cases in file ${file.filePath}`);
                            setActiveTab("doctor");
                            setIsDiagnosing(true);
                            setTerminalHistory(prev => [...prev, { cmd: `mappu doctor "${file.filePath}"`, output: "\x1b[90mRunning AI diagnostics on upload...\x1b[0m" }]);
                            fetch("/api/mappu/doctor", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ query: `unprocessed edge cases in file ${file.filePath}` })
                            })
                              .then(res => res.json())
                              .then(data => {
                                setDoctorReport(data.report);
                                setIsDiagnosing(false);
                              })
                              .catch(() => setIsDiagnosing(false));
                          }}
                          className="px-1.5 py-1 bg-slate-950 hover:bg-rose-955/30 border border-slate-800 text-rose-300 hover:text-white rounded text-[9.5px] font-mono font-bold leading-tight"
                        >
                          mappu doctor
                        </button>

                        <button
                          onClick={() => {
                            setExplainQuery(`high-level flow and design rules of module ${file.filePath}`);
                            setActiveTab("explain");
                            setIsExplaining(true);
                            setTerminalHistory(prev => [...prev, { cmd: `mappu explain "${file.filePath}"`, output: "\x1b[90mAnalyzing module structure walkthrough...\x1b[0m" }]);
                            fetch("/api/mappu/explain", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ query: `high-level flow and design rules of module ${file.filePath}` })
                            })
                              .then(res => res.json())
                              .then(data => {
                                setExplainReport(data.explanation);
                                setIsExplaining(false);
                              })
                              .catch(() => setIsExplaining(false));
                          }}
                          className="px-1.5 py-1 bg-slate-950 hover:bg-cyan-955/30 border border-slate-800 text-cyan-300 hover:text-white rounded text-[9.5px] font-mono font-bold leading-tight"
                        >
                          mappu explain
                        </button>

                        <button
                          onClick={async () => {
                            const filename = file.filePath.split("/").pop();
                            const cmd = `mappu run ${filename}`;
                            setTerminalHistory(prev => [...prev, { cmd, output: "\x1b[90mSpawning script process...\x1b[0m" }]);
                            try {
                              const res = await fetch("/api/mappu/shell", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ command: "mappu", args: ["run", filename] })
                              });
                              const data = await res.json();
                              setTerminalHistory(prev => {
                                const copy = [...prev];
                                if (copy.length > 0) {
                                  copy[copy.length - 1] = { cmd, output: data.output };
                                }
                                return copy;
                              });
                            } catch (err: any) {
                              setTerminalHistory(prev => [
                                ...prev,
                                { cmd, output: `\x1b[31mExecution failure: ${err.message}\x1b[0m` }
                              ]);
                            }
                          }}
                          className="px-1.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-mono font-bold hover:text-white rounded text-[9.5px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Play className="w-2.5 h-2.5 fill-emerald-300 animate-pulse" /> Run Script
                        </button>

                        <button
                          onClick={() => setViewingFile({ path: file.filePath, code: file.content })}
                          className="px-1.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[9.5px] font-mono leading-tight hover:text-white"
                        >
                          View Source
                        </button>

                        <button
                          onClick={() => {
                            setNewFileName(file.filePath);
                            setNewFileContent(file.content);
                          }}
                          className="px-1.5 py-1 bg-slate-900 grid hover:bg-slate-805 text-amber-300 rounded text-[9.5px] font-mono leading-tight hover:text-white"
                        >
                          Load Code
                        </button>

                        <button
                          onClick={() => {
                            const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = file.filePath.split("/").pop() || "scaffold.txt";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                          className="px-1.5 py-1 bg-slate-900 hover:bg-slate-800 text-rose-300 rounded text-[9.5px] className flex items-center justify-center gap-1 font-mono leading-tight hover:text-white cursor-pointer"
                        >
                          <Download className="w-2.5 h-2.5" /> Direct Download
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteSandboxFile(file.filePath)}
                        className="w-full py-1 bg-slate-950 hover:bg-rose-500/20 text-rose-400 hover:text-rose-200 text-[10px] font-mono font-bold text-center rounded border border-slate-800 hover:border-rose-800/40 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove File
                      </button>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Builder Commands */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">
                Simulated Mobile Command Dispatcher
              </span>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button
                disabled={isIndexing}
                onClick={async () => {
                  setTerminalInput("mappu init");
                  setIsIndexing(true);
                  setIndexingLogs(["Scanning core directories and uploading sandbox...", "Indexing codebase..."]);
                  try {
                    const res = await fetch("/api/mappu/init", { method: "POST" });
                    const data = await res.json();
                    setIndexingLogs(data.logs || ["Done."]);
                    await fetchStatus();
                    setTerminalHistory(prev => [
                      ...prev,
                      { cmd: "mappu init", output: `\x1b[32m✔ Sandbox uploads and repository indexed with success!\x1b[0m\nProcessed Files: ${data.registry?.totalFiles}\nChunks Cached: ${data.registry?.chunks?.length}` }
                    ]);
                  } catch (e: any) {
                    setErrorBanner(e.message);
                  } finally {
                    setIsIndexing(false);
                  }
                }}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-emerald-955/40 border border-emerald-800/30 text-emerald-300 hover:text-white font-mono text-[9.5px] rounded font-bold transition flex items-center gap-1 disabled:opacity-35 cursor-pointer"
              >
                <Play className="w-2.5 h-2.5 fill-emerald-300" /> Run "mappu init"
              </button>

              <button
                onClick={() => {
                  setTerminalInput(`mappu search "authentication middleware sandbox"`);
                }}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-teal-950/30 border border-teal-850/20 text-teal-300 hover:text-white font-mono text-[9.5px] rounded font-bold transition cursor-pointer"
              >
                $ mappu search "auth"
              </button>

              <button
                onClick={() => {
                  setTerminalInput(`mappu explain "weather crawler system endpoints"`);
                }}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950/30 border border-cyan-850/20 text-cyan-300 hover:text-white font-mono text-[9.5px] rounded font-bold transition cursor-pointer"
              >
                $ mappu explain "weather"
              </button>

              <button
                onClick={() => {
                  setTerminalInput("mappu map");
                }}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-mono text-[9.5px] rounded font-bold transition cursor-pointer"
              >
                $ mappu map
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

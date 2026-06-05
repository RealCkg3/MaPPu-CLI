import { DoctorReport, IndexStatus } from "../../types";
import { ShieldAlert, RotateCw, Play, CheckCircle, AlertTriangle } from "lucide-react";

interface DoctorTabProps {
  doctorQuery: string;
  setDoctorQuery: (val: string) => void;
  doctorReport: DoctorReport | null;
  isDiagnosing: boolean;
  status: IndexStatus;
  triggerDoctorReview: (overrideVal?: string) => Promise<any>;
  viewFileContent: (path: string) => void;
}

export default function DoctorTab({
  doctorQuery,
  setDoctorQuery,
  doctorReport,
  isDiagnosing,
  status,
  triggerDoctorReview,
  viewFileContent,
}: DoctorTabProps) {
  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          AI BOUNDARY HOLE & VULNERABILITY DOCTOR
        </h2>
        <p className="text-[11px] text-slate-400">
          Run deep audits against directory scopes to isolate loose inputs, unhandled exceptions, and unhandled edge case conditions.
        </p>
      </div>

      {/* Inputs controller */}
      <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <ShieldAlert className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={doctorQuery}
              onChange={(e) => setDoctorQuery(e.target.value)}
              placeholder="e.g. identify unhandled route failures in express servers..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 transition whitespace-pre-wrap"
            />
          </div>
          <button
            disabled={isDiagnosing || !status.indexed}
            onClick={() => triggerDoctorReview()}
            className="px-5 py-2.5 bg-rose-500 text-slate-950 hover:bg-rose-400 transition text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
          >
            {isDiagnosing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
            Launch Diagnostics
          </button>
        </div>

        {/* Suggested Queries */}
        <div className="flex gap-2 items-center flex-wrap select-none pt-1">
          <span className="text-[10px] text-slate-500 font-mono">Suggested Audits:</span>
          <button
            onClick={() => {
              setDoctorQuery("unhandled exceptions in Express indexing routing endpoints");
              triggerDoctorReview("unhandled exceptions in Express indexing routing endpoints");
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-rose-500/30 leading-snug cursor-pointer font-mono"
          >
            "loose error crash vectors"
          </button>
          <button
            onClick={() => {
              setDoctorQuery("identify missing validation schema blocks inside custom scripts");
              triggerDoctorReview("identify missing validation schema blocks inside custom scripts");
            }}
            className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:border-rose-500/30 leading-snug cursor-pointer font-mono"
          >
            "data parsing holes"
          </button>
        </div>
      </div>

      {/* Render Diagnostics */}
      {isDiagnosing ? (
        <div className="space-y-3 py-8 text-center animate-pulse">
          <RotateCw className="w-8 h-8 text-rose-400 animate-spin mx-auto opacity-80" />
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">
            COMPILING DIAGNOSTIC AUDIT LOGS...
          </p>
        </div>
      ) : doctorReport ? (
        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-xl flex items-center justify-between gap-5 flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-[240px]">
              <span className="text-[9px] font-mono text-rose-400 tracking-widest uppercase block font-bold">
                AUDITED SCOPE META
              </span>
              <p className="text-xs font-mono font-bold text-white break-all leading-relaxed">
                TARGET: {doctorReport.diagnosedIntent}
              </p>
              <p className="text-[11px] text-slate-300 leading-normal">
                {doctorReport.summaryReview}
              </p>
            </div>
            
            {/* Robust Score Gauge Display */}
            <div className="relative flex flex-col items-center justify-center shrink-0 w-28 h-28 bg-slate-950 border border-slate-800 rounded-full shadow-lg">
              <span className={`text-2xl font-black font-mono ${
                doctorReport.overallScore >= 80 ? "text-emerald-400" : doctorReport.overallScore >= 50 ? "text-amber-400" : "text-rose-400"
              }`}>
                {doctorReport.overallScore}%
              </span>
              <span className="text-[9px] font-mono text-slate-500 tracking-wider">ROBUSTNESS</span>
            </div>
          </div>

          {/* Identified Diagnostic Flaw List */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wide">
              CRUCIAL ANALYSIS ISSUES & GAPS DETECTED:
            </h4>

            {doctorReport.issues.length === 0 ? (
              <div className="p-4 bg-emerald-955/20 border border-emerald-900/50 rounded-xl text-center text-emerald-300 flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-mono text-xs font-bold font-mono">Absolutely zero gaps detected in scope focus checking! Excellent standards.</span>
              </div>
            ) : (
              doctorReport.issues.map((issue, idx) => (
                <div key={idx} className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-4">
                  
                  {/* Issue header meta */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-950 pb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        issue.severity === "high" ? "bg-rose-500 animate-ping" : issue.severity === "medium" ? "bg-amber-500 animate-pulse" : "bg-slate-500"
                      }`} />
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                        issue.severity === "high" ? "text-rose-400" : issue.severity === "medium" ? "text-amber-400" : "text-slate-400"
                      }`}>
                        {issue.severity.toUpperCase()} Priority Gap
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-950 text-slate-400 rounded-full border border-slate-900">
                      {issue.category}
                    </span>
                  </div>

                  {/* Description block */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                      {issue.title}
                    </p>
                    <p className="text-[11px] text-slate-300 pl-5 leading-relaxed font-sans">
                      {issue.description}
                    </p>
                  </div>

                  {/* Impacted files chips list */}
                  <div className="pl-5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-500 font-bold">IMPACTED FILES:</span>
                    {issue.affectedFiles.map((file, k) => (
                      <button
                        key={k}
                        onClick={() => viewFileContent(file)}
                        className="text-[9.5px] px-2 py-0.5 bg-slate-955 border border-slate-900 text-slate-300 hover:text-white rounded-md transition cursor-pointer font-mono"
                      >
                        {file}
                      </button>
                    ))}
                  </div>

                  {/* Remediation instructions text display */}
                  {issue.remediationSnippet && (
                    <div className="pl-5 space-y-1">
                      <span className="text-[9.5px] font-mono font-bold text-emerald-400 block tracking-widest uppercase">
                        ✔ PROPOSED REMEDIATION REMEDY
                      </span>
                      <pre className="p-3 bg-slate-950 border border-slate-900 text-[10px] font-mono font-normal text-slate-300 rounded overflow-x-auto block">
                        {issue.remediationSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-900 rounded-xl p-8 text-center text-slate-400 py-12">
          <ShieldAlert className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-pulse" />
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No health analysis logged. Focus the doctor target queries and launch diagnostics.
          </p>
        </div>
      )}
    </div>
  );
}

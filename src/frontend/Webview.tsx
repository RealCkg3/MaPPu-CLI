/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import SearchTab from "./components/SearchTab";
import TraceTab from "./components/TraceTab";
import DoctorTab from "./components/DoctorTab";
import RefactorTab from "./components/RefactorTab";
import ExplainTab from "./components/ExplainTab";
import TopologyTab from "./components/TopologyTab";
import SandboxTab from "./components/SandboxTab";
import GrepTab from "./components/GrepTab";
import GithubTab from "./components/GithubTab";
import FrameworkTab from "./components/FrameworkTab";
import DeadTab from "./components/DeadTab";
import CloneTab from "./components/CloneTab";
import SecurityTab from "./components/SecurityTab";
import GitTab from "./components/GitTab";
import ScopeTab from "./components/ScopeTab";
import BenchmarkTab from "./components/BenchmarkTab";
import TestGapTab from "./components/TestGapTab";
import DiffTab from "./components/DiffTab";

export {
  SearchTab,
  TraceTab,
  DoctorTab,
  RefactorTab,
  ExplainTab,
  TopologyTab,
  SandboxTab,
  GrepTab,
  GithubTab,
  FrameworkTab,
  DeadTab,
  CloneTab,
  SecurityTab,
  GitTab,
  ScopeTab,
  BenchmarkTab,
  TestGapTab,
  DiffTab
};

interface WebviewProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  // State variables pass-through
  props: any;
}

export default function Webview({ activeTab, onTabChange, props }: WebviewProps) {
  return (
    <div className="w-full h-full p-4 bg-[#07070a]/40 backdrop-blur-md rounded-2xl border border-slate-900/60 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[200px] h-[100px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      {activeTab === "search" && <SearchTab {...props} />}
      {activeTab === "trace" && <TraceTab {...props} />}
      {activeTab === "doctor" && <DoctorTab {...props} />}
      {activeTab === "refactor" && <RefactorTab {...props} />}
      {activeTab === "explain" && <ExplainTab {...props} />}
      {activeTab === "topology" && <TopologyTab {...props} />}
      {activeTab === "sandbox" && <SandboxTab {...props} />}
      {activeTab === "grep" && <GrepTab {...props} />}
      {activeTab === "github" && <GithubTab {...props} />}
      {activeTab === "framework" && <FrameworkTab {...props} />}
      {activeTab === "dead" && <DeadTab {...props} />}
      {activeTab === "clone" && <CloneTab {...props} />}
      {activeTab === "security" && <SecurityTab {...props} />}
      {activeTab === "git" && <GitTab {...props} />}
      {activeTab === "scope" && <ScopeTab {...props} />}
      {activeTab === "benchmark" && <BenchmarkTab {...props} />}
      {activeTab === "test-gap" && <TestGapTab {...props} />}
      {activeTab === "diff" && <DiffTab {...props} />}
    </div>
  );
}

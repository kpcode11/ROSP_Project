"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Code2,
  GitFork,
  LayoutDashboard,
  MessageSquareCode,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  HealthResponse,
  RepositoryDetail,
  RepositorySummary,
} from "@/types";
import { Navbar } from "@/components/Navbar";
import { OverviewTab } from "@/components/OverviewTab";
import { CodeExplorerTab } from "@/components/CodeExplorerTab";
import { KnowledgeGraphTab } from "@/components/KnowledgeGraphTab";
import { AssistantTab } from "@/components/AssistantTab";
import { ImpactAnalysisTab } from "@/components/ImpactAnalysisTab";

type ActiveTab =
  | "overview"
  | "explorer"
  | "graph"
  | "assistant"
  | "impact";

export default function HomePage() {
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string>("");
  const [repoDetail, setRepoDetail] = useState<RepositoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cross-tab navigation states
  const [explorerFile, setExplorerFile] = useState<string | undefined>(
    undefined
  );
  const [explorerHighlight, setExplorerHighlight] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [graphFocusNode, setGraphFocusNode] = useState<string | null>(null);
  const [impactTargetNode, setImpactTargetNode] = useState<string | null>(null);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("codeintel-theme");
    setIsDarkTheme(
      storedTheme === "dark" ||
        (storedTheme === null &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkTheme ? "dark" : "light";
    window.localStorage.setItem("codeintel-theme", isDarkTheme ? "dark" : "light");
  }, [isDarkTheme]);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [h, repos] = await Promise.all([
        api.getHealth().catch(() => null),
        api.listRepositories(),
      ]);
      if (h) setHealth(h);
      setRepositories(repos);
      if (repos.length > 0) {
        const targetId = activeRepoId || repos[0].id;
        setActiveRepoId(targetId);
        const detail = await api.getRepositoryDetail(targetId);
        setRepoDetail(detail);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeRepoId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSelectRepo = async (repoId: string) => {
    setActiveRepoId(repoId);
    setExplorerFile(undefined);
    setExplorerHighlight(null);
    setGraphFocusNode(null);
    setImpactTargetNode(null);
    setIsLoading(true);
    try {
      const detail = await api.getRepositoryDetail(repoId);
      setRepoDetail(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeRepo = async (source: string, name?: string) => {
    const summary = await api.analyzeRepository(source, name);
    const updatedRepos = await api.listRepositories();
    setRepositories(updatedRepos);
    setActiveRepoId(summary.id);
    setExplorerFile(undefined);
    setExplorerHighlight(null);
    setGraphFocusNode(null);
    setImpactTargetNode(null);
    const detail = await api.getRepositoryDetail(summary.id);
    setRepoDetail(detail);
  };

  const handleOpenCodeCitation = (
    filePath: string,
    lineStart?: number,
    lineEnd?: number
  ) => {
    setExplorerFile(filePath);
    if (lineStart) {
      setExplorerHighlight({ start: lineStart, end: lineEnd || lineStart });
    } else {
      setExplorerHighlight(null);
    }
    setActiveTab("explorer");
  };

  const handleInspectGraphNode = (nodeId: string) => {
    setGraphFocusNode(nodeId);
    setActiveTab("graph");
  };

  const handleRunImpact = (nodeId: string) => {
    setImpactTargetNode(nodeId);
    setActiveTab("impact");
  };

  const tabs: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "explorer", label: "Code Explorer", icon: Code2 },
    { id: "graph", label: "Knowledge Graph", icon: GitFork },
    { id: "assistant", label: "AI Assistant", icon: MessageSquareCode },
    { id: "impact", label: "Impact Analysis", icon: ShieldAlert },
  ];

  return (
    <div className={`min-h-screen flex flex-col bg-white text-neutral-900 ${isDarkTheme ? "dark-theme" : ""}`}>
      <Navbar
        repositories={repositories}
        activeRepoId={activeRepoId}
        onSelectRepo={handleSelectRepo}
        onAnalyzeRepo={handleAnalyzeRepo}
        health={health}
        isLoading={isLoading}
        isDarkTheme={isDarkTheme}
        onToggleTheme={() => setIsDarkTheme((current) => !current)}
      />

      {/* Workspace navigation */}
      <div className="border-b border-neutral-200 bg-[#fafafa]">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-3.5 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? "border-[#24b47e] text-neutral-900 bg-white"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-white/70"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-5 sm:px-8 py-8">
        {!repoDetail ? (
          <div className="min-h-[420px] rounded-xl bg-[#fafafa] border border-neutral-200 flex items-center justify-center">
            <div className="text-center max-w-sm px-6">
              <div className="mx-auto mb-4 w-10 h-10 rounded-md bg-[#1c1c1c] text-[#3ecf8e] flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              <h1 className="text-[28px] tracking-[-0.72px] font-medium text-neutral-900">
                {isLoading ? "Loading your workspace" : "Start with a repository"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {isLoading
                  ? "Building a grounded view of your codebase..."
                  : "Analyze a local path or GitHub URL to explore its architecture."}
              </p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab
                key={repoDetail.id}
                detail={repoDetail}
                onInspectFile={(fp, lstart) =>
                  handleOpenCodeCitation(fp, lstart)
                }
                onInspectGraphNode={handleInspectGraphNode}
                onRunImpact={handleRunImpact}
              />
            )}

            {activeTab === "explorer" && (
              <CodeExplorerTab
                key={repoDetail.id}
                repoId={repoDetail.id}
                files={repoDetail.files}
                initialFilePath={explorerFile}
                highlightRange={explorerHighlight}
                onInspectGraphNode={handleInspectGraphNode}
                onRunImpact={handleRunImpact}
              />
            )}

            {activeTab === "graph" && (
              <KnowledgeGraphTab
                key={repoDetail.id}
                repoId={repoDetail.id}
                initialFocusNodeId={graphFocusNode}
                onInspectFile={(fp, lstart) =>
                  handleOpenCodeCitation(fp, lstart)
                }
                onRunImpact={handleRunImpact}
              />
            )}

            {activeTab === "assistant" && (
              <AssistantTab
                key={repoDetail.id}
                repoId={repoDetail.id}
                onOpenCitation={handleOpenCodeCitation}
              />
            )}

            {activeTab === "impact" && (
              <ImpactAnalysisTab
                key={repoDetail.id}
                repoId={repoDetail.id}
                files={repoDetail.files}
                centralModules={repoDetail.central_modules}
                initialTargetId={impactTargetNode}
                onInspectFile={(fp, lstart) =>
                  handleOpenCodeCitation(fp, lstart)
                }
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

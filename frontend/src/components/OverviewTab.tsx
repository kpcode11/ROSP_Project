"use client";

import React from "react";
import {
  Activity,
  Box,
  Code2,
  Database,
  FileCode,
  GitFork,
  Globe,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { RepositoryDetail } from "@/types";

interface OverviewTabProps {
  detail: RepositoryDetail;
  onInspectFile: (filePath: string, lineStart?: number) => void;
  onInspectGraphNode: (nodeId: string) => void;
  onRunImpact: (nodeId: string) => void;
}

export function OverviewTab({
  detail,
  onInspectFile,
  onInspectGraphNode,
  onRunImpact,
}: OverviewTabProps) {
  const { stats, languages, frameworks, central_modules } = detail;

  const totalLangFiles =
    Object.values(languages).reduce((acc, v) => acc + v, 0) || 1;

  const metricCards = [
    {
      label: "Parsed Source Files",
      value: stats.files_parsed,
      sub: `${stats.imports_discovered} cross-file imports`,
      icon: FileCode,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    },
    {
      label: "Functions & Methods",
      value: stats.functions_discovered,
      sub: `${stats.call_relationships} call expressions`,
      icon: Code2,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    },
    {
      label: "Classes & Models",
      value: stats.classes_discovered,
      sub: `${stats.models_discovered} database models`,
      icon: Database,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    },
    {
      label: "API Endpoints",
      value: stats.api_endpoints_discovered,
      sub: "Express / FastAPI / Spring routes",
      icon: Globe,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    {
      label: "Knowledge Graph",
      value: `${stats.nodes_count} / ${stats.edges_count}`,
      sub: "AST Nodes / Directed Edges",
      icon: GitFork,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">
                  {card.label}
                </span>
                <div className={`p-2 rounded-lg border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {card.value}
                </div>
                <div className="text-xs text-slate-400 mt-1">{card.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architectural Summary & Language Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <Layers className="w-4 h-4" />
            <span>Deterministic Architectural Summary</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {detail.architectural_summary}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 mr-1">
              Detected Frameworks & Stack:
            </span>
            {frameworks.map((fw) => (
              <span
                key={fw}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700"
              >
                {fw}
              </span>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Box className="w-4 h-4" />
            <span>Language Distribution</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
            {Object.entries(languages).map(([lang, count]) => {
              const pct = Math.round((count / totalLangFiles) * 100);
              const barColor =
                lang === "javascript"
                  ? "bg-amber-400"
                  : lang === "typescript"
                  ? "bg-blue-500"
                  : lang === "python"
                  ? "bg-emerald-500"
                  : "bg-rose-500";
              return (
                <div
                  key={lang}
                  style={{ width: `${pct}%` }}
                  className={`${barColor} h-full`}
                  title={`${lang}: ${count} files (${pct}%)`}
                />
              );
            })}
          </div>
          <div className="space-y-2 pt-1">
            {Object.entries(languages).map(([lang, count]) => {
              const pct = Math.round((count / totalLangFiles) * 100);
              return (
                <div
                  key={lang}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="capitalize text-slate-300 font-medium">
                    {lang}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {count} files ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Central Components Table (PageRank) */}
      <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">
              Top Central Components (Ranked by Dependency Graph PageRank)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Click any component to inspect source, graph neighborhood, or blast radius
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                <th className="py-2.5 px-3">Component</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">File Path</th>
                <th className="py-2.5 px-3">In-Degree (Dependents)</th>
                <th className="py-2.5 px-3">Out-Degree</th>
                <th className="py-2.5 px-3">PageRank</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {central_modules.map((mod) => (
                <tr
                  key={mod.id}
                  className="hover:bg-slate-800/40 transition group"
                >
                  <td className="py-2.5 px-3 font-mono text-xs text-white font-medium">
                    {mod.label}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {mod.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-400">
                    {mod.file_path}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-emerald-400">
                    {mod.in_degree}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-300">
                    {mod.out_degree}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-indigo-300">
                    {mod.pagerank.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-2">
                    <button
                      onClick={() => onInspectFile(mod.file_path)}
                      className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    >
                      Code
                    </button>
                    <button
                      onClick={() => onInspectGraphNode(mod.id)}
                      className="text-xs px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition"
                    >
                      Graph
                    </button>
                    <button
                      onClick={() => onRunImpact(mod.id)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition"
                    >
                      <ShieldAlert className="w-3 h-3" />
                      <span>Impact</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

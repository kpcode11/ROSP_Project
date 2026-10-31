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

const LANG_SERIES = [
  "bg-accent",
  "bg-fg-muted",
  "bg-info",
  "bg-warning",
  "bg-negative",
] as const;

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
    },
    {
      label: "Functions & Methods",
      value: stats.functions_discovered,
      sub: `${stats.call_relationships} call expressions`,
      icon: Code2,
    },
    {
      label: "Classes & Models",
      value: stats.classes_discovered,
      sub: `${stats.models_discovered} database models`,
      icon: Database,
    },
    {
      label: "API Endpoints",
      value: stats.api_endpoints_discovered,
      sub: "Express / FastAPI / Spring routes",
      icon: Globe,
    },
    {
      label: "Knowledge Graph",
      value: `${stats.nodes_count} / ${stats.edges_count}`,
      sub: "AST Nodes / Directed Edges",
      icon: GitFork,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="card p-4 flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between mb-3 gap-2">
                <span className="type-small text-fg-muted truncate">
                  {card.label}
                </span>
                <div className="p-2 rounded-md bg-surface-2 text-fg-muted shrink-0">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="type-title text-fg overflow-wrap-anywhere">
                  {card.value}
                </div>
                <div className="type-small text-fg-muted mt-1">{card.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6 space-y-4 min-w-0">
          <div className="flex items-center gap-2 type-caption-bold text-fg">
            <Layers className="w-4 h-4 text-accent" aria-hidden="true" />
            <span>Deterministic Architectural Summary</span>
          </div>
          <p className="prose text-fg-soft">{detail.architectural_summary}</p>
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="type-small text-fg-muted me-1">
              Detected Frameworks & Stack:
            </span>
            {frameworks.map((fw) => (
              <span key={fw} className="chip">
                {fw}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-6 space-y-4 min-w-0">
          <div className="flex items-center gap-2 type-caption-bold text-fg">
            <Box className="w-4 h-4 text-fg-muted" aria-hidden="true" />
            <span>Language Distribution</span>
          </div>
          <div className="w-full h-3 rounded-pill bg-surface-2 overflow-hidden flex">
            {Object.entries(languages).map(([lang, count], index) => {
              const pct = Math.round((count / totalLangFiles) * 100);
              return (
                <div
                  key={lang}
                  style={{ width: `${pct}%` }}
                  className={`${LANG_SERIES[index % LANG_SERIES.length]} h-full`}
                  title={`${lang}: ${count} files (${pct}%)`}
                />
              );
            })}
          </div>
          <div className="space-y-2 pt-1">
            {Object.entries(languages).map(([lang, count], index) => {
              const pct = Math.round((count / totalLangFiles) * 100);
              return (
                <div
                  key={lang}
                  className="flex items-center justify-between type-small gap-2"
                >
                  <span className="capitalize text-fg font-medium flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-circle shrink-0 ${LANG_SERIES[index % LANG_SERIES.length]}`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{lang}</span>
                  </span>
                  <span className="text-fg-muted font-code shrink-0">
                    {count} files ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card p-6 min-w-0">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-4 h-4 text-fg-muted" aria-hidden="true" />
            <h3 className="type-caption-bold text-fg overflow-wrap-anywhere">
              Top Central Components (Ranked by Dependency Graph PageRank)
            </h3>
          </div>
          <span className="type-small text-fg-muted">
            Click any component to inspect source, graph neighborhood, or blast radius
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="table-head">
                <th className="py-2 px-3">Component</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">File Path</th>
                <th className="py-2 px-3">In-Degree (Dependents)</th>
                <th className="py-2 px-3">Out-Degree</th>
                <th className="py-2 px-3">PageRank</th>
                <th className="py-2 px-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {central_modules.map((mod) => (
                <tr key={mod.id} className="table-row">
                  <td className="py-2 px-3 font-code type-small text-fg font-bold min-w-0 overflow-wrap-anywhere">
                    {mod.label}
                  </td>
                  <td className="py-2 px-3">
                    <span className="badge">{mod.type}</span>
                  </td>
                  <td className="py-2 px-3 font-code type-small text-fg-muted overflow-wrap-anywhere">
                    {mod.file_path}
                  </td>
                  <td className="py-2 px-3 font-code type-small text-fg">
                    {mod.in_degree}
                  </td>
                  <td className="py-2 px-3 font-code type-small text-fg-soft">
                    {mod.out_degree}
                  </td>
                  <td className="py-2 px-3 font-code type-small text-fg-soft">
                    {mod.pagerank.toFixed(4)}
                  </td>
                  <td className="py-2 px-3 text-end">
                    <div className="inline-flex items-center gap-2 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => onInspectFile(mod.file_path)}
                        className="btn btn-secondary"
                      >
                        Code
                      </button>
                      <button
                        type="button"
                        onClick={() => onInspectGraphNode(mod.id)}
                        className="btn btn-outlined"
                      >
                        Graph
                      </button>
                      <button
                        type="button"
                        onClick={() => onRunImpact(mod.id)}
                        className="btn btn-secondary"
                      >
                        <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                        <span>Impact</span>
                      </button>
                    </div>
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

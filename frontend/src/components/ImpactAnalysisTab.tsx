"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Background, Controls, Edge, ReactFlow } from "@xyflow/react";
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  FlaskConical,
  Globe,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { layoutReactFlowGraph } from "@/lib/layout-graph";
import { CentralModuleItem, FileRecord, ImpactReport } from "@/types";
import { CodeEntityNode } from "./KnowledgeGraphTab";

interface ImpactAnalysisTabProps {
  repoId: string;
  files: FileRecord[];
  centralModules: CentralModuleItem[];
  initialTargetId?: string | null;
  onInspectFile: (filePath: string, lineStart?: number) => void;
}

export function ImpactAnalysisTab({
  repoId,
  files,
  centralModules,
  initialTargetId,
  onInspectFile,
}: ImpactAnalysisTabProps) {
  const defaultTarget =
    initialTargetId ||
    "backend/services/paymentService.js";
  const [targetId, setTargetId] = useState<string>(defaultTarget);
  const [report, setReport] = useState<ImpactReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (initialTargetId) {
      setTargetId(initialTargetId);
    }
  }, [initialTargetId]);

  const runAnalysis = useCallback(
    async (idToAnalyze: string) => {
      if (!repoId || !idToAnalyze.trim()) return;
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await api.runImpactAnalysis(repoId, idToAnalyze.trim());
        setReport(res);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [repoId]
  );

  useEffect(() => {
    runAnalysis(targetId);
  }, [runAnalysis, targetId]);

  const { nodes, edges } = useMemo(() => {
    if (!report) return { nodes: [], edges: [] };
    return layoutReactFlowGraph(
      report.subgraph.nodes,
      report.subgraph.edges,
      "LR"
    );
  }, [report]);

  const nodeTypes = useMemo(() => ({ codeNode: CodeEntityNode }), []);

  const riskBadgeStyle =
    report?.risk_level === "High"
      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
      : report?.risk_level === "Medium"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

  return (
    <div className="space-y-6">
      {/* Target Selector Bar */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <ShieldAlert className="w-4 h-4" />
            <span>Deterministic Blast-Radius & Change Impact Simulator</span>
          </div>
          <p className="text-xs text-slate-400">
            Select any file, class, or function to compute upstream dependents,
            affected public API routes, test coverage, and heuristic risk score.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Select target component for impact analysis"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          >
            <optgroup label="Source Files">
              {files.map((f) => (
                <option key={f.path} value={f.path}>
                  {f.path}
                </option>
              ))}
            </optgroup>
            <optgroup label="Top Central Components">
              {centralModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} ({m.type})
                </option>
              ))}
            </optgroup>
          </select>

          <button
            onClick={() => runAnalysis(targetId)}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition"
          >
            {loading ? "Calculating..." : "Recompute Blast Radius"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200">
          {errorMsg}
        </div>
      )}

      {report && (
        <>
          {/* Risk Score Summary & Explainable Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 p-6 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Target Component
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${riskBadgeStyle}`}
                >
                  {report.risk_level} Risk ({report.risk_score} / 100)
                </span>
              </div>

              <div>
                <div className="text-lg font-mono font-bold text-white break-all">
                  {report.target_node_id}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Entity Type:{" "}
                  <span className="font-mono text-slate-200">
                    {report.target_type}
                  </span>
                </div>
              </div>

              {/* Risk Gauge Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Heuristic Risk Score</span>
                  <span className="font-mono font-bold text-white">
                    {report.risk_score} / 100
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, report.risk_score)}%` }}
                    className={`h-full ${
                      report.risk_level === "High"
                        ? "bg-rose-500"
                        : report.risk_level === "Medium"
                        ? "bg-amber-400"
                        : "bg-emerald-500"
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs font-semibold text-slate-300">
                  Deterministic Risk Factors
                </div>
                {report.risk_factors.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs text-slate-300"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dependent Breakdown Lists */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Direct & Transitive Dependents */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-3">
                  <FileWarning className="w-4 h-4" />
                  <span>
                    Impacted Components (
                    {report.direct_dependents.length +
                      report.transitive_dependents.length}
                    )
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 max-h-64">
                  {report.direct_dependents.map((d) => (
                    <button
                      key={`dir-${d.id}`}
                      onClick={() =>
                        d.file_path && onInspectFile(d.file_path)
                      }
                      className="w-full text-left p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono"
                    >
                      <div className="text-white truncate">{d.label}</div>
                      <div className="text-[10px] text-blue-300">
                        1-hop ({d.relation}) • {d.type}
                      </div>
                    </button>
                  ))}
                  {report.transitive_dependents.map((t) => (
                    <button
                      key={`trans-${t.id}`}
                      onClick={() =>
                        t.file_path && onInspectFile(t.file_path)
                      }
                      className="w-full text-left p-2 rounded bg-slate-950/60 hover:bg-slate-800 border border-slate-800/70 text-xs font-mono"
                    >
                      <div className="text-slate-200 truncate">{t.label}</div>
                      <div className="text-[10px] text-slate-400">
                        {t.hop_distance}-hop transitive • {t.type}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Affected Public API Endpoints */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-3">
                  <Globe className="w-4 h-4" />
                  <span>
                    Affected API Endpoints (
                    {report.affected_api_endpoints.length})
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
                  {report.affected_api_endpoints.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No public HTTP routes directly exposed in upstream path.
                    </p>
                  ) : (
                    report.affected_api_endpoints.map((ep) => (
                      <div
                        key={ep}
                        className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 font-semibold"
                      >
                        {ep}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Related Automated Tests */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-3">
                  <FlaskConical className="w-4 h-4" />
                  <span>
                    Regression Test Suites ({report.related_tests.length})
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
                  {report.related_tests.length === 0 ? (
                    <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                      Warning: Zero test files cover this component&apos;s blast
                      radius (+20 risk penalty).
                    </div>
                  ) : (
                    report.related_tests.map((testPath) => (
                      <button
                        key={testPath}
                        onClick={() => onInspectFile(testPath)}
                        className="w-full text-left p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-emerald-300 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{testPath}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Blast-Radius Subgraph Canvas */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Visual Blast-Radius Dependency Subgraph ({nodes.length} Nodes)
              </h4>
              <span className="text-xs text-slate-400">
                Target component highlighted with rose ring
              </span>
            </div>
            <div className="h-[380px] rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
              <ReactFlow
                nodes={nodes}
                edges={edges as Edge[]}
                nodeTypes={nodeTypes}
                fitView
              >
                <Background color="#1e293b" gap={20} />
                <Controls className="!bg-slate-900 !border-slate-800" />
              </ReactFlow>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

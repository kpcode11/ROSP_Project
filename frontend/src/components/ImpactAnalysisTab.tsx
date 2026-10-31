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
  const isTargetInRepo = useCallback(
    (candidate: string | null | undefined): boolean => {
      if (!candidate) return false;
      return (
        files.some(
          (f) => f.path === candidate || candidate.startsWith(`${f.path}::`)
        ) || centralModules.some((m) => m.id === candidate)
      );
    },
    [files, centralModules]
  );

  const fallbackTarget = useMemo(() => {
    if (files.some((f) => f.path === "backend/services/paymentService.js")) {
      return "backend/services/paymentService.js";
    }
    return centralModules[0]?.id || files[0]?.path || "";
  }, [files, centralModules]);

  const [targetId, setTargetId] = useState<string>(
    initialTargetId && isTargetInRepo(initialTargetId)
      ? initialTargetId
      : fallbackTarget
  );
  const [report, setReport] = useState<ImpactReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (initialTargetId && isTargetInRepo(initialTargetId)) {
      setTargetId(initialTargetId);
    } else if (!isTargetInRepo(targetId) && fallbackTarget) {
      setTargetId(fallbackTarget);
    }
  }, [initialTargetId, isTargetInRepo, targetId, fallbackTarget]);

  const effectiveTargetId = useMemo(() => {
    if (isTargetInRepo(targetId)) return targetId;
    if (initialTargetId && isTargetInRepo(initialTargetId)) {
      return initialTargetId;
    }
    return fallbackTarget;
  }, [targetId, initialTargetId, isTargetInRepo, fallbackTarget]);

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
    if (effectiveTargetId) {
      runAnalysis(effectiveTargetId);
    }
  }, [runAnalysis, effectiveTargetId]);

  const { nodes, edges } = useMemo(() => {
    if (!report) return { nodes: [], edges: [] };
    return layoutReactFlowGraph(
      report.subgraph.nodes,
      report.subgraph.edges,
      "LR"
    );
  }, [report]);

  const nodeTypes = useMemo(() => ({ codeNode: CodeEntityNode }), []);

  const riskTone =
    report?.risk_level === "High"
      ? "text-negative"
      : report?.risk_level === "Medium"
      ? "text-warning"
      : "text-accent";

  const riskBar =
    report?.risk_level === "High"
      ? "bg-negative"
      : report?.risk_level === "Medium"
      ? "bg-warning"
      : "bg-accent";

  return (
    <div className="space-y-6 min-w-0">
      <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 type-caption-bold text-fg">
            <ShieldAlert className="w-4 h-4 text-warning" aria-hidden="true" />
            <span>Deterministic Blast-Radius & Change Impact Simulator</span>
          </div>
          <p className="type-small text-fg-muted">
            Select any file, class, or function to compute upstream dependents,
            affected public API routes, test coverage, and heuristic risk score.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Select target component for impact analysis"
            value={effectiveTargetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="field py-2 font-code type-caption w-auto max-w-full"
          >
            {effectiveTargetId &&
              !files.some((f) => f.path === effectiveTargetId) &&
              !centralModules.some((m) => m.id === effectiveTargetId) && (
                <optgroup label="Selected Symbol">
                  <option value={effectiveTargetId}>{effectiveTargetId}</option>
                </optgroup>
              )}
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
            type="button"
            onClick={() => runAnalysis(effectiveTargetId)}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? "Calculating..." : "Recompute Blast Radius"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="alert type-small text-negative flex items-start gap-2" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 card p-6 flex flex-col justify-between space-y-4 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="type-small text-fg-muted">Target Component</span>
                <span className={`chip ${riskTone}`}>
                  {report.risk_level} Risk ({report.risk_score} / 100)
                </span>
              </div>

              <div className="min-w-0">
                <div className="type-feature font-code text-fg break-all">
                  {report.target_node_id}
                </div>
                <div className="type-small text-fg-muted mt-1">
                  Entity Type:{" "}
                  <span className="font-code text-fg">{report.target_type}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between type-small">
                  <span className="text-fg-muted">Heuristic Risk Score</span>
                  <span className="font-code font-bold text-fg">
                    {report.risk_score} / 100
                  </span>
                </div>
                <div className="w-full h-3 rounded-pill bg-surface-2 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, report.risk_score)}%` }}
                    className={`h-full ${riskBar}`}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="divider" />
                <div className="type-small-bold text-fg">
                  Deterministic Risk Factors
                </div>
                {report.risk_factors.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 type-small text-fg-soft"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-1" aria-hidden="true" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-4 flex flex-col min-w-0">
                <div className="flex items-center gap-2 type-small-bold text-fg mb-3">
                  <FileWarning className="w-4 h-4 text-info" aria-hidden="true" />
                  <span>
                    Impacted Components (
                    {report.direct_dependents.length +
                      report.transitive_dependents.length}
                    )
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
                  {report.direct_dependents.map((d) => (
                    <button
                      key={`dir-${d.id}`}
                      type="button"
                      onClick={() => d.file_path && onInspectFile(d.file_path)}
                      className="w-full text-start p-2 rounded-sm bg-bg hover:bg-surface-4 type-small font-code min-w-0"
                    >
                      <div className="text-fg truncate">{d.label}</div>
                      <div className="type-micro text-info">
                        1-hop ({d.relation}) • {d.type}
                      </div>
                    </button>
                  ))}
                  {report.transitive_dependents.map((t) => (
                    <button
                      key={`trans-${t.id}`}
                      type="button"
                      onClick={() => t.file_path && onInspectFile(t.file_path)}
                      className="w-full text-start p-2 rounded-sm bg-bg hover:bg-surface-4 type-small font-code min-w-0"
                    >
                      <div className="text-fg-soft truncate">{t.label}</div>
                      <div className="type-micro text-fg-muted">
                        {t.hop_distance}-hop transitive • {t.type}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card p-4 flex flex-col min-w-0">
                <div className="flex items-center gap-2 type-small-bold text-fg mb-3">
                  <Globe className="w-4 h-4 text-accent" aria-hidden="true" />
                  <span>
                    Affected API Endpoints ({report.affected_api_endpoints.length})
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
                  {report.affected_api_endpoints.length === 0 ? (
                    <p className="type-small text-fg-muted">
                      No public HTTP routes directly exposed in upstream path.
                    </p>
                  ) : (
                    report.affected_api_endpoints.map((ep) => (
                      <div
                        key={ep}
                        className="p-3 rounded-md bg-bg font-code type-small text-fg font-bold break-all"
                      >
                        {ep}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card p-4 flex flex-col min-w-0">
                <div className="flex items-center gap-2 type-small-bold text-fg mb-3">
                  <FlaskConical className="w-4 h-4 text-fg-muted" aria-hidden="true" />
                  <span>
                    Regression Test Suites ({report.related_tests.length})
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
                  {report.related_tests.length === 0 ? (
                    <div className="alert type-small text-negative flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>
                        Warning: Zero test files cover this component&apos;s blast
                        radius (+20 risk penalty).
                      </span>
                    </div>
                  ) : (
                    report.related_tests.map((testPath) => (
                      <button
                        key={testPath}
                        type="button"
                        onClick={() => onInspectFile(testPath)}
                        className="w-full text-start p-3 rounded-md bg-bg hover:bg-surface-4 type-small font-code text-fg flex items-center gap-2 min-w-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-accent" aria-hidden="true" />
                        <span className="truncate">{testPath}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h4 className="type-small-bold uppercase tracking-wide text-fg">
                Visual Blast-Radius Dependency Subgraph ({nodes.length} Nodes)
              </h4>
              <span className="type-small text-fg-muted">
                Target component highlighted with rose ring
              </span>
            </div>
            <div className="h-[380px] rounded-lg overflow-hidden bg-bg">
              <ReactFlow
                nodes={nodes}
                edges={edges as Edge[]}
                nodeTypes={nodeTypes}
                fitView
              >
                <Background color="var(--color-border)" gap={20} />
                <Controls />
              </ReactFlow>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  ReactFlow,
} from "@xyflow/react";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  FileWarning,
  FlaskConical,
  Globe,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { layoutReactFlowGraph } from "@/lib/layout-graph";
import { Tone, nodeTypeMeta, relationColor } from "@/lib/node-types";
import { CentralModuleItem, FileRecord, ImpactReport } from "@/types";
import { CodeEntityNode } from "./KnowledgeGraphTab";

interface ImpactAnalysisTabProps {
  repoId: string;
  files: FileRecord[];
  centralModules: CentralModuleItem[];
  initialTargetId?: string | null;
  onInspectFile: (filePath: string, lineStart?: number) => void;
}

const RISK_TONE: Record<ImpactReport["risk_level"], Tone> = {
  High: "tomato",
  Medium: "amber",
  Low: "emerald",
};

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

  const riskTone: Tone = report ? RISK_TONE[report.risk_level] : "emerald";
  const targetMeta = report ? nodeTypeMeta(report.target_type) : null;

  return (
    <div className="space-y-6">
      {/* Target selector header */}
      <section className="card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="tone-icon tone-tomato w-9 h-9 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-[18px] font-medium tracking-[-0.2px] text-ink">
              Blast-radius &amp; change impact simulator
            </h2>
            <p className="text-[13px] text-ink-mute mt-0.5 max-w-2xl">
              Select any file, class, or function to compute upstream dependents,
              exposed HTTP routes, regression test coverage, and heuristic risk score.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 lg:shrink-0">
          <select
            aria-label="Select target component for impact analysis"
            value={effectiveTargetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="field font-mono !text-[12.5px] sm:min-w-[320px] cursor-pointer"
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
            className="btn-primary shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Calculating..." : "Recompute"}</span>
          </button>
        </div>
      </section>

      {errorMsg && (
        <div className="tone-tomato p-4 rounded-[12px] border bg-[var(--tbg)] border-[var(--tbd)] text-[var(--tfg)] text-[13px]">
          {errorMsg}
        </div>
      )}

      {report && (
        <>
          {/* Risk summary & dependent breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Left 4 columns: Risk card */}
            <section className={`card-kpi lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between gap-5 tone-${riskTone}`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="section-label">Target component</span>
                  <span className={`pill-soft tone-${riskTone}`}>
                    <span className="tone-dot !w-1.5 !h-1.5" />
                    {report.risk_level} risk · {report.risk_score}/100
                  </span>
                </div>

                <div>
                  <h3 className="text-[17px] font-mono font-medium text-ink break-all leading-snug">
                    {report.target_node_id}
                  </h3>
                  {targetMeta && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`pill-soft tone-${targetMeta.tone}`}>
                        <span className="tone-dot !w-1.5 !h-1.5" />
                        {targetMeta.label}
                      </span>
                      {files.some((f) => f.path === report.target_node_id) && (
                        <button
                          type="button"
                          onClick={() => onInspectFile(report.target_node_id)}
                          className="btn-tone tone-sky !min-h-[24px] !px-2 !py-0.5 !text-[11px]"
                        >
                          <Code2 className="w-3 h-3" />
                          Open file
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Risk meter */}
              <div className="inset-tone p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-medium text-ink-secondary">
                    Heuristic risk score
                  </span>
                  <span className="font-mono font-semibold text-[var(--tfg)] tabular-nums">
                    {report.risk_score} / 100
                  </span>
                </div>
                <div className="meter !h-2.5">
                  <span
                    style={{ width: `${Math.min(100, report.risk_score)}%` }}
                  />
                </div>
              </div>

              {/* Risk factors */}
              <div className="space-y-2.5 pt-3 border-t border-hairline-cool">
                <span className="section-label">Deterministic risk factors</span>
                <ul className="space-y-2">
                  {report.risk_factors.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[13px] text-ink-secondary leading-relaxed"
                    >
                      <AlertTriangle className="w-4 h-4 text-[var(--tfg)] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Right 8 columns: 3 breakdown lists */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Impacted components */}
              <section className="card flex flex-col overflow-hidden max-h-[380px]">
                <div className="panel-head">
                  <div className="flex items-center gap-2 tone-sky">
                    <span className="tone-icon w-6 h-6">
                      <FileWarning className="w-3.5 h-3.5" />
                    </span>
                    <span className="panel-title">Impacted</span>
                  </div>
                  <span className="count">
                    {report.direct_dependents.length +
                      report.transitive_dependents.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {report.direct_dependents.length === 0 &&
                    report.transitive_dependents.length === 0 && (
                      <p className="text-[12.5px] text-ink-mute py-4 text-center">
                        No upstream dependents detected.
                      </p>
                    )}
                  {report.direct_dependents.map((d) => {
                    const meta = nodeTypeMeta(d.type);
                    return (
                      <button
                        type="button"
                        key={`dir-${d.id}`}
                        onClick={() => d.file_path && onInspectFile(d.file_path)}
                        className={`card-link !p-2.5 space-y-1 tone-${meta.tone}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[12.5px] font-medium text-ink truncate">
                            {d.label}
                          </span>
                          <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-[var(--tbg)] text-[var(--tfg)] border border-[var(--tbd)] shrink-0">
                            1-hop
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-ink-mute">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: relationColor(d.relation) }}
                          />
                          <span>{d.relation}</span>
                          <span>·</span>
                          <span>{meta.label}</span>
                        </div>
                      </button>
                    );
                  })}
                  {report.transitive_dependents.map((t) => {
                    const meta = nodeTypeMeta(t.type);
                    return (
                      <button
                        type="button"
                        key={`trans-${t.id}`}
                        onClick={() => t.file_path && onInspectFile(t.file_path)}
                        className="card-link !p-2.5 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[12.5px] text-ink-secondary truncate">
                            {t.label}
                          </span>
                          <span className="pill-soft !text-[10.5px] !py-0 !px-1.5 font-mono shrink-0">
                            {t.hop_distance}-hop
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-ink-mute">
                          transitive · {meta.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Affected API endpoints */}
              <section className="card flex flex-col overflow-hidden max-h-[380px]">
                <div className="panel-head">
                  <div className="flex items-center gap-2 tone-emerald">
                    <span className="tone-icon w-6 h-6">
                      <Globe className="w-3.5 h-3.5" />
                    </span>
                    <span className="panel-title">API routes</span>
                  </div>
                  <span className="count">
                    {report.affected_api_endpoints.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {report.affected_api_endpoints.length === 0 ? (
                    <p className="text-[12.5px] text-ink-mute py-4 text-center">
                      No public HTTP routes exposed in upstream path.
                    </p>
                  ) : (
                    report.affected_api_endpoints.map((ep) => (
                      <div
                        key={ep}
                        className="tone-emerald inset-tone px-3 py-2.5 text-[12px] font-mono font-medium text-[var(--tfg)] flex items-center gap-2 break-all"
                      >
                        <span className="tone-dot" />
                        <span>{ep}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Related automated tests */}
              <section className="card flex flex-col overflow-hidden max-h-[380px]">
                <div className="panel-head">
                  <div className="flex items-center gap-2 tone-violet">
                    <span className="tone-icon w-6 h-6">
                      <FlaskConical className="w-3.5 h-3.5" />
                    </span>
                    <span className="panel-title">Test suites</span>
                  </div>
                  <span className="count">{report.related_tests.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {report.related_tests.length === 0 ? (
                    <div className="tone-tomato inset-tone p-3 text-[12.5px] text-[var(--tfg)] leading-relaxed">
                      Warning: zero test files cover this component&apos;s blast
                      radius (+20 risk penalty).
                    </div>
                  ) : (
                    report.related_tests.map((testPath) => (
                      <button
                        type="button"
                        key={testPath}
                        onClick={() => onInspectFile(testPath)}
                        className="card-link !p-2.5 font-mono text-[12px] text-ink flex items-center gap-2 tone-emerald"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[var(--tfg)] shrink-0" />
                        <span className="truncate">{testPath}</span>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Visual blast-radius subgraph */}
          <section className="card overflow-hidden">
            <div className="panel-head">
              <div className="flex items-center gap-2">
                <span className="panel-title">
                  Blast-radius dependency subgraph
                </span>
                <span className="count">{nodes.length} nodes</span>
              </div>
              <span className="pill-soft tone-tomato">
                <span className="tone-dot !w-1.5 !h-1.5" />
                Target ring highlighted
              </span>
            </div>
            <div className="h-[380px] relative">
              <ReactFlow
                nodes={nodes}
                edges={edges as Edge[]}
                nodeTypes={nodeTypes}
                fitView
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

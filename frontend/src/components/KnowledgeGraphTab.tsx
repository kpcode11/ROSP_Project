"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import {
  ArrowRight,
  Code2,
  Focus,
  MousePointerClick,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { layoutReactFlowGraph } from "@/lib/layout-graph";
import {
  RELATION_TONE,
  TONE_SOLID,
  nodeTypeMeta,
  relationColor,
} from "@/lib/node-types";
import { ReactFlowGraphResponse, ReactFlowNodeData } from "@/types";

export function CodeEntityNode({
  data,
  targetPosition,
  sourcePosition,
}: NodeProps<Node<ReactFlowNodeData>>) {
  const meta = nodeTypeMeta(data.type);
  return (
    <div className={`flow-node tone-${meta.tone}`} data-target={Boolean(data.is_target)}>
      <Handle type="target" position={targetPosition ?? Position.Left} />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--tfg)]">
          <span className="tone-dot !w-1.5 !h-1.5" />
          {meta.label}
        </span>
        {data.metrics?.pagerank !== undefined && (
          <span className="text-[10px] font-mono text-ink-mute tabular-nums">
            PR {Number(data.metrics.pagerank).toFixed(3)}
          </span>
        )}
      </div>
      <div className="text-[12.5px] font-mono font-medium text-ink truncate">
        {data.label}
      </div>
      <div className="text-[10.5px] font-mono text-ink-mute truncate mt-0.5">
        {data.file_path}
      </div>
      <Handle type="source" position={sourcePosition ?? Position.Right} />
    </div>
  );
}

const TYPE_FILTERS = [
  "all",
  "file",
  "api_endpoint",
  "class",
  "function",
  "method",
  "model",
] as const;

interface KnowledgeGraphTabProps {
  repoId: string;
  initialFocusNodeId?: string | null;
  onInspectFile: (filePath: string, lineStart?: number) => void;
  onRunImpact: (nodeId: string) => void;
}

export function KnowledgeGraphTab({
  repoId,
  initialFocusNodeId,
  onInspectFile,
  onRunImpact,
}: KnowledgeGraphTabProps) {
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [focusNodeId, setFocusNodeId] = useState<string>(
    initialFocusNodeId || ""
  );
  const [hops, setHops] = useState<number>(2);
  const [direction, setDirection] = useState<"LR" | "TB">("LR");
  const [graphResp, setGraphResp] = useState<ReactFlowGraphResponse | null>(
    null
  );
  const [selectedNode, setSelectedNode] = useState<ReactFlowNodeData | null>(
    null
  );

  useEffect(() => {
    if (initialFocusNodeId) {
      setFocusNodeId(initialFocusNodeId);
    }
  }, [initialFocusNodeId]);

  const loadGraph = useCallback(() => {
    if (!repoId) return;
    api
      .getGraph(repoId, {
        node_type: nodeTypeFilter,
        search: searchFilter || undefined,
        focus_node_id: focusNodeId || undefined,
        hops,
      })
      .then((res) => {
        setGraphResp(res);
        if (focusNodeId) {
          const found = res.nodes.find((n) => n.id === focusNodeId);
          if (found) setSelectedNode(found.data);
        }
      })
      .catch(console.error);
  }, [repoId, nodeTypeFilter, searchFilter, focusNodeId, hops]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const layouted = useMemo(() => {
    if (!graphResp) return { nodes: [], edges: [] };
    return layoutReactFlowGraph(graphResp.nodes, graphResp.edges, direction);
  }, [graphResp, direction]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ReactFlowNodeData>>(
    layouted.nodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(layouted.edges);

  useEffect(() => {
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [layouted, setNodes, setEdges]);

  const nodeTypes = useMemo(() => ({ codeNode: CodeEntityNode }), []);

  const incomingEdges = useMemo(() => {
    if (!selectedNode || !graphResp) return [];
    return graphResp.edges.filter((e) => e.target === selectedNode.id);
  }, [selectedNode, graphResp]);

  const outgoingEdges = useMemo(() => {
    if (!selectedNode || !graphResp) return [];
    return graphResp.edges.filter((e) => e.source === selectedNode.id);
  }, [selectedNode, graphResp]);

  const selectedMeta = selectedNode ? nodeTypeMeta(selectedNode.type) : null;

  const EdgeRow = ({
    other,
    label,
    dir,
  }: {
    other: string;
    label: string;
    dir: "in" | "out";
  }) => (
    <div className="inset px-2.5 py-2 flex items-center gap-2 font-mono text-[11.5px] min-w-0">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: relationColor(label) }}
      />
      <span
        className="text-[10px] font-medium shrink-0"
        style={{ color: relationColor(label) }}
      >
        {label}
      </span>
      <ArrowRight
        className={`w-3 h-3 text-ink-mute-2 shrink-0 ${dir === "in" ? "rotate-180" : ""}`}
      />
      <span className="text-ink-secondary truncate" title={other}>
        {other}
      </span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-180px)] lg:min-h-[620px]">
      {/* Graph canvas */}
      <section className="card lg:col-span-9 flex flex-col overflow-hidden h-[560px] lg:h-auto">
        {/* Toolbar */}
        <div className="px-3 sm:px-4 py-3 border-b border-hairline flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5" role="group" aria-label="Entity type filter">
            {TYPE_FILTERS.map((t) => {
              const active = nodeTypeFilter === t && !focusNodeId;
              const meta = t === "all" ? null : nodeTypeMeta(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFocusNodeId("");
                    setNodeTypeFilter(t);
                  }}
                  className={`seg ${meta ? `tone-${meta.tone}` : ""}`}
                >
                  {meta && <span className="tone-dot !w-1.5 !h-1.5" />}
                  {meta ? meta.label : "All nodes"}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-3.5 h-3.5 text-ink-mute absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Search node label"
                placeholder="Search nodes..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="field !min-h-[30px] !py-1 !pl-8 !text-[12px]"
              />
            </div>
            <div className="flex items-center rounded-[6px] border border-hairline p-0.5" role="group" aria-label="Layout direction">
              {(["LR", "TB"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={direction === d}
                  onClick={() => setDirection(d)}
                  className="seg !min-h-[24px] !px-2 !border-transparent"
                  title={d === "LR" ? "Left to right" : "Top to bottom"}
                >
                  {d === "LR" ? "Horizontal" : "Vertical"}
                </button>
              ))}
            </div>
            {focusNodeId && (
              <button
                type="button"
                onClick={() => setFocusNodeId("")}
                className="btn-tone tone-amber"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset focus
              </button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) =>
              setSelectedNode(node.data as ReactFlowNodeData)
            }
            fitView
            minZoom={0.2}
            maxZoom={1.6}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) =>
                TONE_SOLID[
                  nodeTypeMeta((n.data as ReactFlowNodeData)?.type || "file")
                    .tone
                ]
              }
              nodeStrokeColor={(n) =>
                TONE_SOLID[
                  nodeTypeMeta((n.data as ReactFlowNodeData)?.type || "file")
                    .tone
                ]
              }
              nodeStrokeWidth={2}
              nodeBorderRadius={4}
              maskStrokeColor="#24b47e"
              maskStrokeWidth={2}
            />
          </ReactFlow>

          {/* Legend + counts */}
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1.5 rounded-[8px] bg-canvas border border-hairline shadow-subtle text-[11px] text-ink-secondary pointer-events-none max-w-[calc(100%-24px)]">
            <span className="tabular-nums text-ink-mute">
              {nodes.length} nodes · {edges.length} edges
            </span>
            {Object.keys(RELATION_TONE).map((rel) => (
              <span key={rel} className="inline-flex items-center gap-1.5">
                <span className="w-3 h-[2px] rounded" style={{ background: relationColor(rel) }} />
                {rel}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Inspector */}
      <aside className="card lg:col-span-3 flex flex-col overflow-hidden">
        <div className="panel-head">
          <span className="panel-title">Node inspector</span>
          {focusNodeId && (
            <span className="pill-soft tone-violet">
              <span className="tone-dot !w-1.5 !h-1.5" />
              {hops}-hop focus
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!selectedNode || !selectedMeta ? (
            <div className="py-6 space-y-5">
              <div className="text-center">
                <span className="mx-auto mb-3 w-10 h-10 rounded-[8px] inset flex items-center justify-center text-ink-mute">
                  <MousePointerClick className="w-5 h-5" />
                </span>
                <p className="text-[14px] font-medium text-ink">Select a node</p>
                <p className="text-[13px] text-ink-mute mt-1 leading-relaxed">
                  Click any node to inspect its signature, centrality, callers and callees.
                </p>
              </div>
              <div className="inset p-3 space-y-2">
                <p className="section-label">Entity types</p>
                {(["api_endpoint", "function", "class", "model", "file"] as const).map((t) => {
                  const m = nodeTypeMeta(t);
                  return (
                    <div key={t} className={`flex items-center gap-2 text-[12.5px] text-ink-secondary tone-${m.tone}`}>
                      <span className="tone-dot" />
                      {m.label}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className={`tone-${selectedMeta.tone}`}>
                <span className={`pill-soft tone-${selectedMeta.tone}`}>
                  <span className="tone-dot !w-1.5 !h-1.5" />
                  {selectedMeta.label}
                </span>
                <h3 className="text-[17px] font-medium font-mono text-ink mt-2.5 break-all leading-snug">
                  {selectedNode.label}
                </h3>
                <p className="font-mono text-[12px] text-ink-mute mt-1 break-all">
                  {selectedNode.file_path}
                  <span className="text-ink-mute-2">
                    :L{selectedNode.line_start}–{selectedNode.line_end}
                  </span>
                </p>
              </div>

              {selectedNode.signature && (
                <pre className="code-surface rounded-[6px] p-3 font-mono text-[11.5px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                  {selectedNode.signature}
                </pre>
              )}

              {selectedNode.docstring && (
                <p className="text-[13px] text-ink-secondary leading-relaxed">
                  {selectedNode.docstring}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="tone-emerald inset-tone px-3 py-2.5">
                  <div className="text-[11px] text-ink-mute">PageRank</div>
                  <div className="text-[15px] font-mono font-medium text-[var(--tfg)] tabular-nums mt-0.5">
                    {Number(selectedNode.metrics?.pagerank || 0).toFixed(4)}
                  </div>
                </div>
                <div className="inset px-3 py-2.5">
                  <div className="text-[11px] text-ink-mute">In / out edges</div>
                  <div className="text-[15px] font-mono font-medium text-ink tabular-nums mt-0.5">
                    {selectedNode.metrics?.in_degree ?? incomingEdges.length}
                    <span className="text-ink-mute-2"> / </span>
                    {selectedNode.metrics?.out_degree ?? outgoingEdges.length}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFocusNodeId(selectedNode.id);
                    setHops(2);
                  }}
                  className="btn-tone tone-violet !min-h-[36px] !text-[13px]"
                >
                  <Focus className="w-4 h-4" />
                  Focus 2-hop neighborhood
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onInspectFile(selectedNode.file_path, selectedNode.line_start)
                  }
                  className="btn-tone tone-sky !min-h-[36px] !text-[13px]"
                >
                  <Code2 className="w-4 h-4" />
                  Open in Code Explorer
                </button>
                <button
                  type="button"
                  onClick={() => onRunImpact(selectedNode.id)}
                  className="btn-tone tone-tomato !min-h-[36px] !text-[13px]"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Run impact analysis
                </button>
              </div>

              <div className="pt-4 border-t border-hairline-cool space-y-2">
                <div className="flex items-center gap-2">
                  <span className="section-label">Incoming</span>
                  <span className="count">{incomingEdges.length}</span>
                </div>
                {incomingEdges.length === 0 ? (
                  <p className="text-[12px] text-ink-mute-2">No incoming edges in view.</p>
                ) : (
                  incomingEdges.map((e) => (
                    <EdgeRow key={e.id} other={e.source} label={e.label} dir="in" />
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-hairline-cool space-y-2">
                <div className="flex items-center gap-2">
                  <span className="section-label">Outgoing</span>
                  <span className="count">{outgoingEdges.length}</span>
                </div>
                {outgoingEdges.length === 0 ? (
                  <p className="text-[12px] text-ink-mute-2">No outgoing edges in view.</p>
                ) : (
                  outgoingEdges.map((e) => (
                    <EdgeRow key={e.id} other={e.target} label={e.label} dir="out" />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

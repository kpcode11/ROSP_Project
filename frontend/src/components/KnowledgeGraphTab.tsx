"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
} from "@xyflow/react";
import {
  Code2,
  Filter,
  Focus,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { layoutReactFlowGraph } from "@/lib/layout-graph";
import { ReactFlowGraphResponse, ReactFlowNodeData } from "@/types";

const TYPE_STYLES: Record<string, string> = {
  file: "text-fg-muted",
  api_endpoint: "text-accent",
  function: "text-info",
  method: "text-info",
  class: "text-warning",
  model: "text-negative",
};

export function CodeEntityNode({ data }: NodeProps<Node<ReactFlowNodeData>>) {
  const accent = TYPE_STYLES[data.type] || TYPE_STYLES.file;
  return (
    <div
      className={`w-[230px] rounded-lg bg-surface p-3 shadow-md min-w-0 ${
        data.is_target ? "ring-2 ring-negative" : ""
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={`badge ${accent}`}>{data.type}</span>
        {data.metrics?.pagerank !== undefined && (
          <span className="type-micro font-code text-fg-muted">
            PR {Number(data.metrics.pagerank).toFixed(3)}
          </span>
        )}
      </div>
      <div className="type-small-bold font-code text-fg truncate">{data.label}</div>
      <div className="type-micro font-code text-fg-muted truncate mt-1">
        {data.file_path}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

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

  const { nodes, edges } = useMemo(() => {
    if (!graphResp) return { nodes: [], edges: [] };
    return layoutReactFlowGraph(graphResp.nodes, graphResp.edges, direction);
  }, [graphResp, direction]);

  const nodeTypes = useMemo(() => ({ codeNode: CodeEntityNode }), []);

  const incomingEdges = useMemo(() => {
    if (!selectedNode || !graphResp) return [];
    return graphResp.edges.filter((e) => e.target === selectedNode.id);
  }, [selectedNode, graphResp]);

  const outgoingEdges = useMemo(() => {
    if (!selectedNode || !graphResp) return [];
    return graphResp.edges.filter((e) => e.source === selectedNode.id);
  }, [selectedNode, graphResp]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100dvh-145px)] min-h-[620px] min-w-0">
      <div className="lg:col-span-9 panel flex flex-col overflow-hidden min-w-0">
        <div className="p-3 hairline flex flex-wrap items-center justify-between gap-3 bg-bg">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 type-small text-fg-muted">
              <Filter className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Entity Type:</span>
            </div>
            {(
              [
                "all",
                "file",
                "api_endpoint",
                "function",
                "method",
                "model",
              ] as const
            ).map((t) => {
              const selected = nodeTypeFilter === t && !focusNodeId;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setFocusNodeId("");
                    setNodeTypeFilter(t);
                  }}
                  aria-pressed={selected}
                  className={`chip ${selected ? "chip-selected" : ""}`}
                >
                  {t === "all" ? "All Nodes" : t}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-0 w-[220px] max-w-full">
              <Filter className="w-3.5 h-3.5 text-fg-muted absolute start-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search node label..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="field-search type-body"
                aria-label="Search node label"
              />
            </div>
            <select
              aria-label="Graph layout direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value as "LR" | "TB")}
              className="field py-2 type-caption w-auto"
            >
              <option value="LR">Left → Right (LR)</option>
              <option value="TB">Top → Bottom (TB)</option>
            </select>
            {focusNodeId && (
              <button
                type="button"
                onClick={() => setFocusNodeId("")}
                className="btn btn-outlined"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Reset Focus</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 relative bg-bg">
          <ReactFlow
            nodes={nodes}
            edges={edges as Edge[]}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) =>
              setSelectedNode(node.data as ReactFlowNodeData)
            }
            fitView
            minZoom={0.2}
            maxZoom={1.6}
          >
            <Background color="var(--color-border)" gap={20} />
            <Controls />
            <MiniMap
              nodeColor="var(--color-accent)"
              maskColor="var(--color-scrim)"
            />
          </ReactFlow>
        </div>
      </div>

      <div className="lg:col-span-3 panel p-4 flex flex-col overflow-y-auto space-y-4 min-w-0">
        <div className="type-small-bold uppercase tracking-wide text-fg-muted hairline pb-2">
          Node Inspector
        </div>

        {!selectedNode ? (
          <div className="type-small text-fg-muted space-y-3 py-6">
            <p>
              Click any node in the Knowledge Graph canvas to inspect its AST
              signature, centrality metrics, incoming callers, and outgoing
              callees.
            </p>
            <div className="p-3 rounded-md bg-bg space-y-2">
              <div className="type-small-bold text-fg">Color Legend</div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-circle bg-accent" />
                <span>API Endpoint (ROUTES_TO)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-circle bg-info" />
                <span>Function / Method (CALLS)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-circle bg-negative" />
                <span>Database Model (QUERIES)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-circle bg-fg-muted" />
                <span>Source File (IMPORTS)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 type-small min-w-0">
            <div>
              <span className="badge">{selectedNode.type}</span>
              <h4 className="type-feature font-code text-fg mt-2 break-all">
                {selectedNode.label}
              </h4>
              <p className="font-code text-fg-muted mt-1 break-all">
                {selectedNode.file_path}:L{selectedNode.line_start}–L
                {selectedNode.line_end}
              </p>
            </div>

            {selectedNode.signature && (
              <div className="p-3 rounded-md bg-bg font-code type-micro text-fg-soft overflow-x-auto">
                {selectedNode.signature}
              </div>
            )}

            {selectedNode.docstring && (
              <p className="prose text-fg-soft">{selectedNode.docstring}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-md bg-bg">
                <div className="text-fg-muted type-micro">PageRank</div>
                <div className="type-caption-bold font-code text-fg">
                  {Number(selectedNode.metrics?.pagerank || 0).toFixed(4)}
                </div>
              </div>
              <div className="p-3 rounded-md bg-bg">
                <div className="text-fg-muted type-micro">In / Out Edges</div>
                <div className="type-caption-bold font-code text-fg">
                  {selectedNode.metrics?.in_degree ?? incomingEdges.length} /{" "}
                  {selectedNode.metrics?.out_degree ?? outgoingEdges.length}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setFocusNodeId(selectedNode.id);
                  setHops(2);
                }}
                className="btn btn-primary w-full"
              >
                <Focus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Focus 2-Hop Neighborhood</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onInspectFile(selectedNode.file_path, selectedNode.line_start)
                }
                className="btn btn-secondary w-full"
              >
                <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Open in Code Explorer</span>
              </button>

              <button
                type="button"
                onClick={() => onRunImpact(selectedNode.id)}
                className="btn btn-outlined w-full"
              >
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Run Impact Analysis on This Node</span>
              </button>
            </div>

            <div className="pt-3 space-y-2">
              <div className="divider" />
              <div className="type-small-bold text-fg">
                Incoming Dependents ({incomingEdges.length})
              </div>
              {incomingEdges.map((e) => (
                <div
                  key={e.id}
                  className="p-2 rounded-sm bg-bg font-code type-micro text-fg-soft truncate"
                >
                  {e.source} <span className="text-info">[{e.label}]</span>
                </div>
              ))}
            </div>

            <div className="pt-3 space-y-2">
              <div className="divider" />
              <div className="type-small-bold text-fg">
                Outgoing Dependencies ({outgoingEdges.length})
              </div>
              {outgoingEdges.map((e) => (
                <div
                  key={e.id}
                  className="p-2 rounded-sm bg-bg font-code type-micro text-fg-soft truncate"
                >
                  <span className="text-fg-muted">[{e.label}]</span> → {e.target}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

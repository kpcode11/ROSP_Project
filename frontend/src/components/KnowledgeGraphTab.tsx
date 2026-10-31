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

const TYPE_STYLES: Record<
  string,
  { badge: string; border: string; bg: string }
> = {
  file: {
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    border: "border-blue-500/50",
    bg: "bg-slate-900/95",
  },
  api_endpoint: {
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    border: "border-emerald-500/60",
    bg: "bg-slate-900/95",
  },
  function: {
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    border: "border-purple-500/50",
    bg: "bg-slate-900/95",
  },
  method: {
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    border: "border-purple-500/50",
    bg: "bg-slate-900/95",
  },
  class: {
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    border: "border-amber-500/50",
    bg: "bg-slate-900/95",
  },
  model: {
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    border: "border-rose-500/60",
    bg: "bg-slate-900/95",
  },
};

export function CodeEntityNode({ data }: NodeProps<Node<ReactFlowNodeData>>) {
  const style = TYPE_STYLES[data.type] || TYPE_STYLES.file;
  return (
    <div
      className={`w-[230px] rounded-xl border ${style.border} ${
        style.bg
      } p-3 shadow-xl transition ${
        data.is_target ? "ring-2 ring-rose-500" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-slate-400 !w-2 !h-2"
      />
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${style.badge}`}
        >
          {data.type}
        </span>
        {data.metrics?.pagerank !== undefined && (
          <span className="text-[10px] font-mono text-slate-400">
            PR {Number(data.metrics.pagerank).toFixed(3)}
          </span>
        )}
      </div>
      <div className="text-xs font-mono font-bold text-white truncate">
        {data.label}
      </div>
      <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
        {data.file_path}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-slate-400 !w-2 !h-2"
      />
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-145px)] min-h-[620px]">
      {/* Main Interactive Graph Canvas */}
      <div className="lg:col-span-9 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        {/* Top Filter Controls Bar */}
        <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
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
            ).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setFocusNodeId("");
                  setNodeTypeFilter(t);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  nodeTypeFilter === t && !focusNodeId
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                {t === "all" ? "All Nodes" : t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search node label..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <select
              aria-label="Graph layout direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value as "LR" | "TB")}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
            >
              <option value="LR">Left → Right (LR)</option>
              <option value="TB">Top → Bottom (TB)</option>
            </select>
            {focusNodeId && (
              <button
                onClick={() => setFocusNodeId("")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Focus</span>
              </button>
            )}
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 relative bg-slate-950">
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
            <Background color="#1e293b" gap={20} />
            <Controls className="!bg-slate-900 !border-slate-800 !text-slate-200" />
            <MiniMap
              nodeColor="#6366f1"
              maskColor="rgba(2, 6, 23, 0.75)"
              className="!bg-slate-900 !border-slate-800"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Right Side Inspector Panel */}
      <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col overflow-y-auto space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
          Node Inspector
        </div>

        {!selectedNode ? (
          <div className="text-xs text-slate-400 space-y-3 py-6">
            <p>
              Click any node in the Knowledge Graph canvas to inspect its AST
              signature, centrality metrics, incoming callers, and outgoing
              callees.
            </p>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-200">Color Legend</div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>API Endpoint (ROUTES_TO)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span>Function / Method (CALLS)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span>Database Model (QUERIES)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span>Source File (IMPORTS)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div>
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                {selectedNode.type}
              </span>
              <h4 className="text-base font-bold font-mono text-white mt-2 break-all">
                {selectedNode.label}
              </h4>
              <p className="font-mono text-slate-400 mt-0.5 break-all">
                {selectedNode.file_path}:L{selectedNode.line_start}–L
                {selectedNode.line_end}
              </p>
            </div>

            {selectedNode.signature && (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto">
                {selectedNode.signature}
              </div>
            )}

            {selectedNode.docstring && (
              <p className="text-slate-300 leading-relaxed">
                {selectedNode.docstring}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">PageRank</div>
                <div className="text-sm font-mono font-semibold text-indigo-300">
                  {Number(selectedNode.metrics?.pagerank || 0).toFixed(4)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">In / Out Edges</div>
                <div className="text-sm font-mono font-semibold text-emerald-300">
                  {selectedNode.metrics?.in_degree ?? incomingEdges.length} /{" "}
                  {selectedNode.metrics?.out_degree ?? outgoingEdges.length}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setFocusNodeId(selectedNode.id);
                  setHops(2);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-medium transition"
              >
                <Focus className="w-3.5 h-3.5" />
                <span>Focus 2-Hop Neighborhood</span>
              </button>

              <button
                onClick={() =>
                  onInspectFile(selectedNode.file_path, selectedNode.line_start)
                }
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Open in Code Explorer</span>
              </button>

              <button
                onClick={() => onRunImpact(selectedNode.id)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium transition"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Run Impact Analysis on This Node</span>
              </button>
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-2">
              <div className="font-semibold text-slate-300">
                Incoming Dependents ({incomingEdges.length})
              </div>
              {incomingEdges.map((e) => (
                <div
                  key={e.id}
                  className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 truncate"
                >
                  {e.source} <span className="text-indigo-400">[{e.label}]</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-2">
              <div className="font-semibold text-slate-300">
                Outgoing Dependencies ({outgoingEdges.length})
              </div>
              {outgoingEdges.map((e) => (
                <div
                  key={e.id}
                  className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 truncate"
                >
                  <span className="text-purple-400">[{e.label}]</span> →{" "}
                  {e.target}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


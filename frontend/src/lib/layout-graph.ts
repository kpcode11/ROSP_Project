import dagre from "dagre";
import { Edge, Node, Position } from "@xyflow/react";
import { ReactFlowEdgeItem, ReactFlowNodeData, ReactFlowNodeItem } from "@/types";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 84;

const RELATION_STROKE: Record<string, string> = {
  ROUTES_TO: "var(--color-accent)",
  CALLS: "var(--color-info)",
  QUERIES: "var(--color-negative)",
  IMPORTS: "var(--color-text-muted)",
};

export function layoutReactFlowGraph(
  rawNodes: ReactFlowNodeItem[],
  rawEdges: ReactFlowEdgeItem[],
  direction: "LR" | "TB" = "LR"
): { nodes: Node<ReactFlowNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 45,
    ranksep: 90,
    marginx: 24,
    marginy: 24,
  });

  rawNodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  rawEdges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  const isHorizontal = direction === "LR";

  const nodes: Node<ReactFlowNodeData>[] = rawNodes.map((n, index) => {
    const pos = g.node(n.id);
    const x =
      pos && Number.isFinite(pos.x)
        ? pos.x - NODE_WIDTH / 2
        : (index % 5) * 280;
    const y =
      pos && Number.isFinite(pos.y)
        ? pos.y - NODE_HEIGHT / 2
        : Math.floor(index / 5) * 130;

    return {
      id: n.id,
      type: n.type || "codeNode",
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: { x, y },
      data: n.data,
    };
  });

  const edges: Edge[] = rawEdges.map((e) => {
    const rel = e.data?.relation || e.label || "CALLS";
    const stroke = RELATION_STROKE[rel] || "var(--color-border)";

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: "smoothstep",
      animated: Boolean(e.animated),
      style: { stroke, strokeWidth: 1.8 },
    };
  });

  return { nodes, edges };
}

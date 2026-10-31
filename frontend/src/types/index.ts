export type NodeType =
  | "file"
  | "class"
  | "function"
  | "method"
  | "api_endpoint"
  | "model";

export interface RepositoryStats {
  files_discovered: number;
  files_parsed: number;
  functions_discovered: number;
  classes_discovered: number;
  api_endpoints_discovered: number;
  models_discovered: number;
  imports_discovered: number;
  call_relationships: number;
  nodes_count: number;
  edges_count: number;
}

export interface RepositorySummary {
  id: string;
  name: string;
  source_type: string;
  source_path: string;
  status: string;
  languages: Record<string, number>;
  frameworks: string[];
  stats: RepositoryStats;
  created_at?: string;
  updated_at?: string;
}

export interface CentralModuleItem {
  id: string;
  label: string;
  type: NodeType;
  file_path: string;
  pagerank: number;
  in_degree: number;
  out_degree: number;
}

export interface FileRecord {
  path: string;
  language: string;
  size_bytes: number;
  sha256: string;
  line_count: number;
}

export interface RepositoryDetail extends RepositorySummary {
  central_modules: CentralModuleItem[];
  files: FileRecord[];
  architectural_summary: string;
}

export interface FileSymbolItem {
  id: string;
  name: string;
  type: NodeType;
  line_start: number;
  line_end: number;
  signature: string;
  docstring: string;
}

export interface FileContentResponse {
  repo_id: string;
  file_path: string;
  language: string;
  line_count: number;
  content: string;
  symbols: FileSymbolItem[];
  imports: { module: string; symbols: string[]; line: number }[];
  calls: { caller: string; callee: string; line: number }[];
}

export interface ReactFlowNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  type: NodeType;
  file_path: string;
  language: string;
  line_start: number;
  line_end: number;
  signature: string;
  docstring: string;
  parameters?: string[];
  metrics?: {
    loc: number;
    in_degree: number;
    out_degree: number;
    pagerank: number;
  };
  is_target?: boolean;
  hop_distance?: number;
}

export interface ReactFlowNodeItem {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: ReactFlowNodeData;
}

export interface ReactFlowEdgeItem {
  id: string;
  source: string;
  target: string;
  label: string;
  type?: string;
  animated?: boolean;
  data?: {
    relation?: string;
    confidence?: number;
    line?: number;
  };
}

export interface ReactFlowGraphResponse {
  repo_id: string;
  nodes: ReactFlowNodeItem[];
  edges: ReactFlowEdgeItem[];
  total_nodes: number;
  total_edges: number;
}

export interface SearchResultItem {
  chunk_id: string;
  node_id: string;
  node_type: NodeType;
  name: string;
  file_path: string;
  language: string;
  line_start: number;
  line_end: number;
  signature: string;
  docstring: string;
  code: string;
  context_header: string;
  score: number;
}

export interface ExecutionStep {
  step: number;
  component: string;
  file_path: string;
  description: string;
}

export interface CitationItem {
  file_path: string;
  symbol: string;
  line_start: number;
  line_end: number;
  snippet: string;
}

export interface AssistantResponse {
  question: string;
  answer_markdown: string;
  execution_steps: ExecutionStep[];
  citations: CitationItem[];
  related_nodes: string[];
  model_used: string;
  retrieval_latency_ms: number;
}

export interface DirectDependentItem {
  id: string;
  label: string;
  type: string;
  file_path: string;
  relation: string;
}

export interface TransitiveDependentItem {
  id: string;
  label: string;
  type: string;
  file_path: string;
  hop_distance: number;
}

export interface ImpactReport {
  repo_id: string;
  target_node_id: string;
  target_label: string;
  target_type: string;
  risk_level: "Low" | "Medium" | "High";
  risk_score: number;
  score_breakdown: Record<string, number>;
  risk_factors: string[];
  direct_dependents: DirectDependentItem[];
  transitive_dependents: TransitiveDependentItem[];
  affected_api_endpoints: string[];
  related_tests: string[];
  subgraph: {
    nodes: ReactFlowNodeItem[];
    edges: ReactFlowEdgeItem[];
  };
}

export interface HealthResponse {
  status: string;
  service: string;
  ollama: {
    reachable: boolean;
    mode: string;
    embedding_model: string;
    llm_model: string;
    available_models: string[];
  };
  embedding_model: string;
  embedding_dim: number;
  llm_model: string;
}

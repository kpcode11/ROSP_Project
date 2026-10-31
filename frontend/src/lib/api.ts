import {
  AssistantResponse,
  FileContentResponse,
  HealthResponse,
  ImpactReport,
  ReactFlowGraphResponse,
  RepositoryDetail,
  RepositorySummary,
  SearchResultItem,
} from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error (${res.status}): ${errText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getHealth: () => fetchJson<HealthResponse>(`${API_BASE}/health`),

  listRepositories: () =>
    fetchJson<RepositorySummary[]>(`${API_BASE}/repositories`),

  analyzeRepository: (source: string, name?: string) =>
    fetchJson<RepositorySummary>(`${API_BASE}/repositories`, {
      method: "POST",
      body: JSON.stringify({ source, name }),
    }),

  getRepositoryDetail: (repoId: string) =>
    fetchJson<RepositoryDetail>(`${API_BASE}/repositories/${repoId}`),

  getFileContent: (repoId: string, filePath: string) =>
    fetchJson<FileContentResponse>(
      `${API_BASE}/repositories/${repoId}/files/content?path=${encodeURIComponent(
        filePath
      )}`
    ),

  getGraph: (
    repoId: string,
    params?: {
      node_type?: string;
      directory?: string;
      search?: string;
      focus_node_id?: string;
      hops?: number;
      include_declares?: boolean;
    }
  ) => {
    const qs = new URLSearchParams();
    if (params?.node_type && params.node_type !== "all")
      qs.set("node_type", params.node_type);
    if (params?.directory) qs.set("directory", params.directory);
    if (params?.search) qs.set("search", params.search);
    if (params?.focus_node_id) qs.set("focus_node_id", params.focus_node_id);
    if (params?.hops) qs.set("hops", String(params.hops));
    if (params?.include_declares) qs.set("include_declares", "true");
    const queryStr = qs.toString() ? `?${qs.toString()}` : "";
    return fetchJson<ReactFlowGraphResponse>(
      `${API_BASE}/repositories/${repoId}/graph${queryStr}`
    );
  },

  searchCode: (repoId: string, query: string, limit = 8) =>
    fetchJson<SearchResultItem[]>(
      `${API_BASE}/repositories/${repoId}/search?q=${encodeURIComponent(
        query
      )}&limit=${limit}`
    ),

  askAssistant: (repoId: string, question: string, topK = 6) =>
    fetchJson<AssistantResponse>(`${API_BASE}/repositories/${repoId}/ask`, {
      method: "POST",
      body: JSON.stringify({ question, top_k: topK }),
    }),

  runImpactAnalysis: (repoId: string, targetId: string) =>
    fetchJson<ImpactReport>(
      `${API_BASE}/repositories/${repoId}/impact-analysis`,
      {
        method: "POST",
        body: JSON.stringify({ target_id: targetId }),
      }
    ),
};

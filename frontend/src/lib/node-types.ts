/**
 * Shared visual metadata for code-graph entities and relations.
 * Tones map to the `.tone-*` scopes in globals.css; hex values are the
 * matching `--tone-*-solid` colours for SVG / canvas contexts (edges,
 * minimap) where CSS classes cannot be applied.
 */

export type Tone = "emerald" | "violet" | "sky" | "amber" | "tomato";

export const TONE_SOLID: Record<Tone, string> = {
  emerald: "#3ecf8e",
  violet: "#7c65e0",
  sky: "#3b8ee8",
  amber: "#f2a516",
  tomato: "#ef6a3c",
};

export const NODE_TYPE_META: Record<string, { label: string; tone: Tone }> = {
  file: { label: "File", tone: "sky" },
  class: { label: "Class", tone: "amber" },
  function: { label: "Function", tone: "violet" },
  method: { label: "Method", tone: "violet" },
  api_endpoint: { label: "API endpoint", tone: "emerald" },
  model: { label: "Model", tone: "tomato" },
};

export const nodeTypeMeta = (type: string) =>
  NODE_TYPE_META[type] ?? { label: type.replace(/_/g, " "), tone: "sky" as Tone };

export const RELATION_TONE: Record<string, Tone> = {
  ROUTES_TO: "emerald",
  CALLS: "violet",
  QUERIES: "tomato",
  IMPORTS: "sky",
};

export const relationColor = (rel: string) =>
  RELATION_TONE[rel] ? TONE_SOLID[RELATION_TONE[rel]] : "#9a9a9a";

// Chart / language accents (DESIGN.md allows accents in data visualisation).
const LANGUAGE_COLORS: Record<string, string> = {
  typescript: "#3b8ee8",
  javascript: "#f2b134",
  python: "#3ecf8e",
  java: "#ef6a3c",
  go: "#22b8cf",
  rust: "#c4693d",
  csharp: "#7c65e0",
};
const FALLBACK_LANGUAGE_COLORS = ["#7c65e0", "#e0569b", "#22b8cf", "#9a9a9a"];

export const languageColor = (lang: string, idx = 0) =>
  LANGUAGE_COLORS[lang.toLowerCase()] ??
  FALLBACK_LANGUAGE_COLORS[idx % FALLBACK_LANGUAGE_COLORS.length];

/** Split a forward-slash path into directory and basename. */
export const splitPath = (p: string) => {
  const i = p.lastIndexOf("/");
  return i === -1 ? { dir: "", name: p } : { dir: p.slice(0, i + 1), name: p.slice(i + 1) };
};

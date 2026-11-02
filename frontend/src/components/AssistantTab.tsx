"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileCode,
  Loader2,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { nodeTypeMeta } from "@/lib/node-types";
import { AssistantResponse, SearchResultItem } from "@/types";

interface AssistantTabProps {
  repoId: string;
  onOpenCitation: (
    filePath: string,
    lineStart: number,
    lineEnd: number
  ) => void;
}

const SAMPLE_PROMPTS = [
  "How does user authentication work in this project?",
  "Which files and services handle checkout and payment processing?",
  "Where are JWT session tokens and admin roles verified?",
  "How does order refund processing interact with paymentService?",
];

export function AssistantTab({ repoId, onOpenCitation }: AssistantTabProps) {
  const [question, setQuestion] = useState(SAMPLE_PROMPTS[0]);
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [response, setResponse] = useState<AssistantResponse | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);

  const handleAsk = async (qText?: string) => {
    const q = (qText ?? question).trim();
    if (!q || !repoId) return;
    setQuestion(q);
    setLoadingAsk(true);
    try {
      const res = await api.askAssistant(repoId, q, 6);
      setResponse(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAsk(false);
    }
  };

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !repoId) return;
    setSearching(true);
    try {
      const res = await api.searchCode(repoId, searchQuery.trim(), 6);
      setSearchResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
      {/* Grounded GraphRAG assistant */}
      <div className="lg:col-span-7 space-y-4 sm:space-y-6 min-w-0">
        <section className="card p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="tone-icon tone-emerald w-9 h-9 shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-[18px] font-medium tracking-[-0.2px] text-ink">
                  Ask about this codebase
                </h2>
                <p className="text-[13px] text-ink-mute mt-0.5">
                  Hybrid GraphRAG answers, grounded in AST-verified source citations.
                </p>
              </div>
            </div>
            <span className="pill-soft tone-emerald !text-[var(--tfg)] !bg-[var(--tbg)] !border-[var(--tbd)] self-start shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Citation verified
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              aria-label="Question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask an architectural or execution-flow question..."
              className="field flex-1 !min-h-[42px] !text-[14px]"
            />
            <button
              type="submit"
              disabled={loadingAsk || !question.trim()}
              className="btn-primary !min-h-[42px] !px-5"
            >
              {loadingAsk ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Ask</span>
            </button>
          </form>

          <div className="space-y-2">
            <p className="section-label">Try asking</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleAsk(prompt)}
                  disabled={loadingAsk}
                  className="prompt-chip"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loadingAsk && !response && (
          <section className="card p-6 space-y-3 animate-pulse" aria-busy="true">
            <div className="h-4 w-2/3 rounded bg-[var(--hairline-cool)]" />
            <div className="h-3 w-full rounded bg-[var(--hairline-cool)]" />
            <div className="h-3 w-5/6 rounded bg-[var(--hairline-cool)]" />
            <div className="h-3 w-4/6 rounded bg-[var(--hairline-cool)]" />
          </section>
        )}

        {!response && !loadingAsk && (
          <section className="rounded-[12px] border border-dashed border-hairline-strong p-8 text-center">
            <p className="text-[14px] font-medium text-ink">No question asked yet</p>
            <p className="text-[13px] text-ink-mute mt-1">
              Pick a suggestion above or type your own. Answers include a traced execution
              flow and clickable source citations.
            </p>
          </section>
        )}

        {/* Grounded answer */}
        {response && (
          <section className={`card overflow-hidden transition-opacity ${loadingAsk ? "opacity-60" : ""}`}>
            <div className="px-5 sm:px-6 py-4 border-b border-hairline">
              <h3 className="text-[17px] font-medium tracking-[-0.2px] text-ink leading-snug">
                {response.question}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="pill-soft font-mono">{response.model_used}</span>
                <span className="pill-soft tabular-nums">
                  {response.retrieval_latency_ms} ms retrieval
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-7">
              <div className="text-[15px] text-ink-secondary whitespace-pre-line leading-[1.7]">
                {response.answer_markdown}
              </div>

              {/* Execution flow */}
              {response.execution_steps.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="section-label">Traced execution flow</span>
                    <span className="count">{response.execution_steps.length}</span>
                  </div>
                  <ol className="relative tone-violet">
                    {response.execution_steps.map((step, i) => (
                      <li key={step.step} className="relative flex gap-3 pb-4 last:pb-0">
                        {i < response.execution_steps.length - 1 && (
                          <span
                            className="absolute left-[13px] top-7 bottom-0 w-px bg-[var(--tbd)]"
                            aria-hidden
                          />
                        )}
                        <span className="tone-icon w-7 h-7 !rounded-full text-[12px] font-semibold shrink-0 tabular-nums">
                          {step.step}
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-mono text-[13px] font-medium text-ink">
                              {step.component}
                            </span>
                            <ArrowRight className="w-3 h-3 text-ink-mute-2" />
                            <span className="font-mono text-[12px] text-ink-mute break-all">
                              {step.file_path}
                            </span>
                          </div>
                          <p className="text-[13px] text-ink-secondary mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Citations */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="w-4 h-4 text-[#24b47e]" />
                  <span className="section-label">Verified source citations</span>
                  <span className="count">{response.citations.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {response.citations.map((cit, idx) => (
                    <button
                      type="button"
                      key={`${cit.file_path}-${cit.line_start}-${idx}`}
                      onClick={() =>
                        onOpenCitation(cit.file_path, cit.line_start, cit.line_end)
                      }
                      className="card-link group space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[13px] font-medium text-ink truncate group-hover:underline underline-offset-2">
                          {cit.symbol}
                        </span>
                        <span className="tone-emerald inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[var(--tbg)] text-[var(--tfg)] border border-[var(--tbd)] shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          L{cit.line_start}–{cit.line_end}
                        </span>
                      </div>
                      <div className="font-mono text-[11.5px] text-ink-mute truncate">
                        {cit.file_path}
                      </div>
                      {cit.snippet && (
                        <div className="code-surface rounded-[4px] px-2 py-1 font-mono text-[11px] truncate">
                          {cit.snippet}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Semantic code search */}
      <aside className="lg:col-span-5 lg:sticky lg:top-[88px] min-w-0">
        <section className="card p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="tone-icon tone-sky w-9 h-9 shrink-0">
                <Search className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-[18px] font-medium tracking-[-0.2px] text-ink">
                  Semantic code search
                </h2>
                <p className="text-[13px] text-ink-mute mt-0.5">
                  Find code by intent, not identifier names.
                </p>
              </div>
            </div>
            <span className="pill-soft font-mono shrink-0 hidden sm:inline-flex">1024-dim</span>
          </div>

          <form onSubmit={handleSemanticSearch} className="flex gap-2">
            <input
              type="text"
              aria-label="Semantic search query"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. verify a user can access protected routes"
              className="field flex-1 !text-[13px]"
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="btn-outline shrink-0 disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>

          {searchResults.length === 0 ? (
            <p className="text-[12.5px] text-ink-mute leading-relaxed">
              Try{" "}
              <button
                type="button"
                onClick={() => setSearchQuery("verify whether a user is allowed to access protected routes")}
                className="code-inline hover:border-hairline-strong"
              >
                verify whether a user is allowed to access protected routes
              </button>
            </p>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="section-label">Results</span>
                <span className="count">{searchResults.length}</span>
              </div>
              {searchResults.map((item) => {
                const meta = nodeTypeMeta(item.node_type);
                const pct = Math.max(0, Math.min(1, item.score)) * 100;
                return (
                  <button
                    type="button"
                    key={item.chunk_id}
                    onClick={() =>
                      onOpenCitation(item.file_path, item.line_start, item.line_end)
                    }
                    className={`card-link space-y-1.5 tone-${meta.tone}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCode className="w-3.5 h-3.5 text-[var(--tfg)] shrink-0" />
                        <span className="font-mono text-[13px] font-medium text-ink truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--tfg)] shrink-0">
                        {meta.label}
                      </span>
                    </div>
                    <div className="font-mono text-[11.5px] text-ink-mute truncate">
                      {item.file_path}:L{item.line_start}–{item.line_end}
                    </div>
                    {item.docstring && (
                      <p className="text-[12.5px] text-ink-secondary line-clamp-2">
                        {item.docstring}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-0.5 tone-sky">
                      <div className="meter flex-1">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono text-[11px] text-ink-mute tabular-nums">
                        {item.score.toFixed(3)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

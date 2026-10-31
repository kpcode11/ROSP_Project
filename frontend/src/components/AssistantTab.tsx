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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
      <div className="lg:col-span-7 space-y-4 min-w-0">
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 type-caption-bold text-fg">
              <Sparkles className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>Grounded Hybrid GraphRAG Codebase Assistant</span>
            </div>
            <span className="badge text-accent">100% Citation Verified</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleAsk(prompt)}
                className="chip text-start max-w-full overflow-hidden text-ellipsis"
                title={prompt}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex gap-2 min-w-0"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask an architectural or execution flow question..."
              className="field type-body flex-1 min-w-0"
            />
            <button
              type="submit"
              disabled={loadingAsk || !question.trim()}
              className="btn btn-primary shrink-0"
            >
              {loadingAsk ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Ask</span>
            </button>
          </form>
        </div>

        {response && (
          <div className="card p-6 space-y-6 min-w-0">
            <div className="hairline pb-3">
              <h3 className="type-caption-bold text-fg overflow-wrap-anywhere">
                {response.question}
              </h3>
              <p className="type-small text-fg-muted mt-1">
                Synthesized via{" "}
                <span className="font-code text-fg-soft">
                  {response.model_used}
                </span>{" "}
                in {response.retrieval_latency_ms} ms
              </p>
            </div>

            <div className="prose text-fg-soft whitespace-pre-line">
              {response.answer_markdown}
            </div>

            {response.execution_steps.length > 0 && (
              <div className="space-y-3">
                <h4 className="type-small-bold uppercase tracking-wide text-fg-muted">
                  Traced Execution Flow ({response.execution_steps.length} Steps)
                </h4>
                <div className="space-y-2">
                  {response.execution_steps.map((step) => (
                    <div
                      key={step.step}
                      className="p-3 rounded-md bg-bg flex items-start gap-3 min-w-0"
                    >
                      <span className="w-6 h-6 rounded-circle bg-surface-2 text-fg type-small-bold flex items-center justify-center shrink-0 mt-1">
                        {step.step}
                      </span>
                      <div className="space-y-1 type-small min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="font-code font-bold text-fg break-all">
                            {step.component}
                          </span>
                          <ArrowRight className="w-3 h-3 text-fg-muted rtl-flip" aria-hidden="true" />
                          <span className="font-code text-fg-muted break-all">
                            {step.file_path}
                          </span>
                        </div>
                        <p className="text-fg-soft">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 type-small-bold uppercase tracking-wide text-fg">
                <BookOpenCheck className="w-4 h-4 text-accent" aria-hidden="true" />
                <span>
                  Verified AST Source Citations ({response.citations.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {response.citations.map((cit, idx) => (
                  <button
                    key={`${cit.file_path}-${cit.line_start}-${idx}`}
                    type="button"
                    onClick={() =>
                      onOpenCitation(
                        cit.file_path,
                        cit.line_start,
                        cit.line_end
                      )
                    }
                    className="p-3 rounded-md bg-bg hover:bg-surface-4 text-start space-y-1 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="type-small-bold font-code text-fg truncate">
                        {cit.symbol}
                      </span>
                      <span className="badge shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-accent" aria-hidden="true" />
                        L{cit.line_start}–L{cit.line_end}
                      </span>
                    </div>
                    <div className="type-micro font-code text-fg-muted truncate">
                      {cit.file_path}
                    </div>
                    <div className="type-micro font-code text-fg-muted truncate">
                      {cit.snippet}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-5 space-y-4 min-w-0">
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 type-caption-bold text-fg">
              <Search className="w-4 h-4 text-fg-muted" aria-hidden="true" />
              <span>Semantic Code Search (Qdrant 1024-dim)</span>
            </div>
          </div>
          <p className="type-small text-fg-muted">
            Search by natural-language intent (e.g.,{" "}
            <code className="text-fg">
              verify whether a user is allowed to access protected routes
            </code>
            ) without needing exact identifier names.
          </p>

          <form onSubmit={handleSemanticSearch} className="flex gap-2 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-fg-muted absolute start-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code by behavior or intent..."
                className="field-search type-body"
                aria-label="Search code by behavior or intent"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="btn btn-primary shrink-0"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          <div className="space-y-3 pt-2">
            {searchResults.map((item) => (
              <button
                key={item.chunk_id}
                type="button"
                onClick={() =>
                  onOpenCitation(
                    item.file_path,
                    item.line_start,
                    item.line_end
                  )
                }
                className="w-full p-3 rounded-md bg-bg hover:bg-surface-4 text-start space-y-2 min-w-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <FileCode className="w-3.5 h-3.5 text-fg-muted shrink-0" aria-hidden="true" />
                    <span className="type-small-bold font-code text-fg truncate">
                      {item.name}
                    </span>
                  </div>
                  <span className="type-micro font-code text-fg-muted shrink-0">
                    score: {item.score.toFixed(3)}
                  </span>
                </div>
                <div className="type-micro font-code text-fg-muted">
                  {item.file_path}:L{item.line_start}–L{item.line_end}
                </div>
                {item.docstring && (
                  <p className="type-small text-fg-soft line-clamp-2">
                    {item.docstring}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

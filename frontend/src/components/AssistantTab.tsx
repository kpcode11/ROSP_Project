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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 7 Columns: Grounded Hybrid GraphRAG Assistant */}
      <div className="lg:col-span-7 space-y-4">
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Grounded Hybrid GraphRAG Codebase Assistant</span>
            </div>
            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              100% Citation Verified
            </span>
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleAsk(prompt)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition text-left"
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
            className="flex gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask an architectural or execution flow question..."
              className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loadingAsk || !question.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition"
            >
              {loadingAsk ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Ask</span>
            </button>
          </form>
        </div>

        {/* Grounded Answer Output */}
        {response && (
          <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {response.question}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synthesized via{" "}
                  <span className="font-mono text-indigo-300">
                    {response.model_used}
                  </span>{" "}
                  in {response.retrieval_latency_ms} ms
                </p>
              </div>
            </div>

            <div className="prose prose-invert max-w-none text-sm text-slate-200 whitespace-pre-line leading-relaxed">
              {response.answer_markdown}
            </div>

            {/* Step-by-Step Execution Flow Trace */}
            {response.execution_steps.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Traced Execution Flow ({response.execution_steps.length} Steps)
                </h4>
                <div className="space-y-2">
                  {response.execution_steps.map((step) => (
                    <div
                      key={step.step}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {step.step}
                      </span>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">
                            {step.component}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="font-mono text-slate-400">
                            {step.file_path}
                          </span>
                        </div>
                        <p className="text-slate-300">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verified Source Citations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <BookOpenCheck className="w-4 h-4" />
                <span>
                  Verified AST Source Citations ({response.citations.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {response.citations.map((cit, idx) => (
                  <button
                    key={`${cit.file_path}-${cit.line_start}-${idx}`}
                    onClick={() =>
                      onOpenCitation(
                        cit.file_path,
                        cit.line_start,
                        cit.line_end
                      )
                    }
                    className="p-3 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 text-left transition group space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-indigo-300 group-hover:underline truncate">
                        {cit.symbol}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />L{cit.line_start}–L
                        {cit.line_end}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {cit.file_path}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 truncate">
                      {cit.snippet}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right 5 Columns: Semantic Vector Code Search */}
      <div className="lg:col-span-5 space-y-4">
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Search className="w-4 h-4" />
              <span>Semantic Code Search (Qdrant 1024-dim)</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Search by natural-language intent (e.g.,{" "}
            <code className="text-slate-200">
              verify whether a user is allowed to access protected routes
            </code>
            ) without needing exact identifier names.
          </p>

          <form onSubmit={handleSemanticSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code by behavior or intent..."
              className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          <div className="space-y-2.5 pt-2">
            {searchResults.map((item) => (
              <div
                key={item.chunk_id}
                onClick={() =>
                  onOpenCitation(
                    item.file_path,
                    item.line_start,
                    item.line_end
                  )
                }
                className="cursor-pointer p-3 rounded-lg bg-slate-950 hover:bg-slate-800/70 border border-slate-800 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-mono font-bold text-white truncate">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    score: {item.score.toFixed(3)}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {item.file_path}:L{item.line_start}–L{item.line_end}
                </div>
                {item.docstring && (
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {item.docstring}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


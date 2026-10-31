"use client";

import React, { useState } from "react";
import {
  Cpu,
  FolderGit2,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { HealthResponse, RepositorySummary } from "@/types";

interface NavbarProps {
  repositories: RepositorySummary[];
  activeRepoId: string;
  onSelectRepo: (repoId: string) => void;
  onAnalyzeRepo: (source: string, name?: string) => Promise<void>;
  health: HealthResponse | null;
  isLoading: boolean;
}

export function Navbar({
  repositories,
  activeRepoId,
  onSelectRepo,
  onAnalyzeRepo,
  health,
  isLoading,
}: NavbarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [sourceInput, setSourceInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceInput.trim()) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      await onAnalyzeRepo(sourceInput.trim(), nameInput.trim() || undefined);
      setModalOpen(false);
      setSourceInput("");
      setNameInput("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSample = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      await onAnalyzeRepo("sample_ecommerce", "sample_ecommerce");
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  CodeIntel
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  GraphRAG + AST
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Local-First Codebase Intelligence & Blast-Radius Analyzer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Ollama Model Status Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Models:</span>
              <span className="text-slate-200 font-mono">
                {health?.llm_model || "qwen2.5:7b-instruct"}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-indigo-300 font-mono">
                {health?.embedding_model || "mxbai-embed-large"}
              </span>
            </div>

            {/* Active Repository Selector */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
              <FolderGit2 className="w-4 h-4 text-indigo-400" />
              <select
                aria-label="Select active repository"
                value={activeRepoId}
                onChange={(e) => onSelectRepo(e.target.value)}
                disabled={isLoading}
                className="bg-transparent text-sm text-slate-100 focus:outline-none pr-2"
              >
                {repositories.map((repo) => (
                  <option
                    key={repo.id}
                    value={repo.id}
                    className="bg-slate-900 text-slate-100"
                  >
                    {repo.name} ({repo.stats.files_parsed} files)
                  </option>
                ))}
              </select>
            </div>

            {/* Analyze New Repository Button */}
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              <span>Analyze Repo</span>
            </button>
          </div>
        </div>
      </header>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Analyze Repository
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Repository Path or GitHub HTTPS URL
                </label>
                <input
                  type="text"
                  placeholder="./data/sample_ecommerce or https://github.com/org/repo"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Display Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="my-service"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-200">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={submitting}
                  className="text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition"
                >
                  Load Sample E-Commerce Repo
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !sourceInput.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium"
                  >
                    {submitting && (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    )}
                    <span>Run AST + Graph Indexing</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


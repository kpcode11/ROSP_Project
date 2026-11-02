"use client";

import React, { useState } from "react";
import {
  Cpu,
  FolderGit2,
  Plus,
  RefreshCw,
  Sparkles,
  Moon,
  Sun,
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
  isDarkTheme: boolean;
  onToggleTheme: () => void;
}

export function Navbar({
  repositories,
  activeRepoId,
  onSelectRepo,
  onAnalyzeRepo,
  health,
  isLoading,
  isDarkTheme,
  onToggleTheme,
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
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#1c1c1c] flex items-center justify-center text-[#3ecf8e]">
              <Sparkles className="w-[18px] h-[18px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[19px] tracking-[-0.4px] text-neutral-900">
                  CodeIntel
                </span>
                <span className="hidden sm:inline-flex text-[10px] uppercase tracking-[0.08em] font-medium px-2 py-1 rounded-full bg-[#f3fbf7] text-[#247b58] border border-[#b9ead2]">
                  Local workspace
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5">
                Codebase intelligence, grounded in your repository
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={`Switch to ${isDarkTheme ? "light" : "dark"} theme`}
              title={`Switch to ${isDarkTheme ? "light" : "dark"} theme`}
              className="w-9 h-9 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center justify-center transition"
            >
              {isDarkTheme ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Ollama Model Status Badge */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-md bg-neutral-50 border border-neutral-200 text-[11px]">
              <span className={`w-1.5 h-1.5 rounded-full ${health?.ollama.reachable ? "bg-[#24b47e]" : "bg-[#a56a00]"}`} />
              <Cpu className="w-3.5 h-3.5 text-neutral-600" />
              <span className="text-neutral-500">Local models</span>
              <span className="text-neutral-900 font-mono">
                {health?.llm_model || "qwen2.5:7b-instruct"}
              </span>
            </div>

            {/* Active Repository Selector */}
            <div className="flex items-center gap-2 bg-white border border-neutral-300 rounded-md px-3 py-2">
              <FolderGit2 className="w-4 h-4 text-neutral-700" />
              <select
                aria-label="Select active repository"
                value={activeRepoId}
                onChange={(e) => onSelectRepo(e.target.value)}
                disabled={isLoading}
                className="bg-transparent text-sm text-neutral-900 focus:outline-none pr-2"
              >
                {repositories.map((repo) => (
                  <option
                    key={repo.id}
                    value={repo.id}
                    className="bg-white text-neutral-900"
                  >
                    {repo.name} ({repo.stats.files_parsed} files)
                  </option>
                ))}
              </select>
            </div>

            {/* Analyze New Repository Button */}
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-400 hover:bg-emerald-500 text-neutral-900 text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              <span>Analyze Repo</span>
            </button>
          </div>
        </div>
      </header>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#171717]/45 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl max-w-lg w-full p-7 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#707070]">New analysis</p>
                <h2 className="text-[22px] tracking-[-0.42px] font-medium text-neutral-900 mt-1">Analyze a repository</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Repository Path or GitHub HTTPS URL
                </label>
                <input
                  type="text"
                  placeholder="./data/sample_ecommerce or https://github.com/org/repo"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Display Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="my-service"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-emerald-500"
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
                  className="text-xs px-3 py-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-300 transition"
                >
                  Load Sample E-Commerce Repo
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm text-neutral-500 hover:text-neutral-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !sourceInput.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-500 disabled:opacity-50 text-neutral-900 text-sm font-medium"
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

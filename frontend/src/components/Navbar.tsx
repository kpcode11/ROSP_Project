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
      <header className="sticky top-0 z-30 border-b border-hairline bg-canvas">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          {/* Wordmark */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-[#1c1c1c] flex items-center justify-center text-[#3ecf8e] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-medium text-[18px] tracking-[-0.36px] text-ink">
              Code<span className="text-[#24b47e]">Intel</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Local model status */}
            <div
              className="hidden xl:flex items-center gap-2 h-9 px-3 rounded-md border border-hairline bg-canvas-soft text-[12px]"
              title={health?.ollama.reachable ? "Ollama reachable" : "Ollama not reachable"}
            >
              <span
                className={`tone-dot ${health?.ollama.reachable ? "tone-emerald" : "tone-amber"}`}
              />
              <Cpu className="w-3.5 h-3.5 text-ink-mute" />
              <span className="font-mono text-ink-secondary">
                {health?.llm_model || "qwen2.5:7b-instruct"}
              </span>
            </div>

            {/* Active repository selector */}
            <div className="relative min-w-0">
              <FolderGit2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute z-[1]" />
              <select
                aria-label="Select active repository"
                value={activeRepoId}
                onChange={(e) => onSelectRepo(e.target.value)}
                disabled={isLoading}
                className="field !min-h-[36px] !py-1.5 pl-9 pr-8 max-w-[150px] sm:max-w-[260px] truncate cursor-pointer"
              >
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.name} ({repo.stats.files_parsed} files)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={`Switch to ${isDarkTheme ? "light" : "dark"} theme`}
              title={`Switch to ${isDarkTheme ? "light" : "dark"} theme`}
              className="btn-icon shrink-0"
            >
              {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              aria-label="Analyze repository"
              className="btn-primary shrink-0 !px-2.5 sm:!px-4"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Analyze Repo</span>
            </button>
          </div>
        </div>
      </header>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[rgba(23,23,23,0.5)] backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="analyze-title"
        >
          <div className="bg-canvas border border-hairline rounded-t-[16px] sm:rounded-[16px] max-w-lg w-full p-6 sm:p-7 shadow-modal">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="eyebrow">New analysis</p>
                <h2
                  id="analyze-title"
                  className="text-[22px] tracking-[-0.42px] font-medium text-ink mt-1"
                >
                  Analyze a repository
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="btn-icon !w-8 !h-8 !border-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="repo-source" className="block text-[13px] font-medium text-ink-secondary mb-1.5">
                  Repository path or GitHub HTTPS URL
                </label>
                <input
                  id="repo-source"
                  type="text"
                  placeholder="./data/sample_ecommerce or https://github.com/org/repo"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  className="field font-mono !text-[13px]"
                />
              </div>

              <div>
                <label htmlFor="repo-name" className="block text-[13px] font-medium text-ink-secondary mb-1.5">
                  Display name <span className="text-ink-mute-2 font-normal">(optional)</span>
                </label>
                <input
                  id="repo-name"
                  type="text"
                  placeholder="my-service"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="field"
                />
              </div>

              {errorMsg && (
                <div className="tone-tomato p-3 rounded-md text-[13px] border bg-[var(--tbg)] border-[var(--tbd)] text-[var(--tfg)]">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={submitting}
                  className="btn-outline !text-[13px]"
                >
                  Load sample e-commerce repo
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn-outline !border-transparent flex-1 sm:flex-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !sourceInput.trim()}
                    className="btn-primary flex-1 sm:flex-none"
                  >
                    {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>Run indexing</span>
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

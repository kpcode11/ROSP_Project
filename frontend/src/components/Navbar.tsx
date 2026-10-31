"use client";

import React, { useEffect, useId, useRef, useState } from "react";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const errorId = useId();

  useEffect(() => {
    if (!modalOpen) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusables = () =>
      dialog?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) ?? [];
    const first = focusables()[0];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setModalOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(focusables());
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openerRef.current?.focus();
    };
  }, [modalOpen]);

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
      <header className="sticky top-0 z-30 bg-bg hairline pt-[env(safe-area-inset-top)]">
        <div className="max-w-[1600px] mx-auto px-4 xs:px-6 h-16 flex items-center justify-between gap-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-circle bg-surface-2 flex items-center justify-center text-accent shrink-0"
              aria-hidden="true"
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="type-feature text-fg truncate">CodeIntel</span>
                <span className="badge shrink-0">GraphRAG + AST</span>
              </div>
              <p className="type-small text-fg-muted hidden sm:block overflow-wrap-anywhere">
                Local-First Codebase Intelligence & Blast-Radius Analyzer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-pill bg-surface-2 type-small text-fg-muted min-w-0">
              <Cpu className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
              <span>Models:</span>
              <span className="text-fg font-code truncate">
                {health?.llm_model || "qwen2.5:7b-instruct"}
              </span>
              <span className="text-fg-muted" aria-hidden="true">
                |
              </span>
              <span className="text-fg-soft font-code truncate">
                {health?.embedding_model || "mxbai-embed-large"}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-surface-2 rounded-pill px-4 py-2 min-w-0">
              <FolderGit2 className="w-4 h-4 text-fg-muted shrink-0" aria-hidden="true" />
              <select
                aria-label="Select active repository"
                value={activeRepoId}
                onChange={(e) => onSelectRepo(e.target.value)}
                disabled={isLoading}
                className="bg-transparent type-caption text-fg focus:outline-none min-w-0 max-w-[180px] md:max-w-none"
              >
                {repositories.map((repo) => (
                  <option
                    key={repo.id}
                    value={repo.id}
                    className="bg-surface text-fg"
                  >
                    {repo.name} ({repo.stats.files_parsed} files)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Analyze Repo</span>
            </button>
          </div>
        </div>
      </header>

      {modalOpen && (
        <div className="fixed inset-0 z-50 scrim flex items-center justify-center p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="analyze-repo-title"
            className="card-elevated max-w-lg w-full p-6"
          >
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 id="analyze-repo-title" className="type-feature text-fg">
                Analyze Repository
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn btn-icon"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block type-small-bold text-fg-soft mb-1">
                  Repository Path or GitHub HTTPS URL
                </label>
                <input
                  type="text"
                  placeholder="./data/sample_ecommerce or https://github.com/org/repo"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  className={`field type-body ${errorMsg ? "field-invalid" : ""}`}
                  aria-invalid={Boolean(errorMsg)}
                  aria-describedby={errorMsg ? errorId : undefined}
                />
              </div>

              <div>
                <label className="block type-small-bold text-fg-soft mb-1">
                  Display Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="my-service"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="field type-body"
                />
              </div>

              {errorMsg && (
                <div
                  id={errorId}
                  className="alert type-small text-negative flex items-start gap-2"
                  role="alert"
                >
                  <span aria-hidden="true">!</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={submitting}
                  className="btn btn-outlined"
                >
                  Load Sample E-Commerce Repo
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !sourceInput.trim()}
                    className="btn btn-primary"
                  >
                    {submitting && (
                      <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
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

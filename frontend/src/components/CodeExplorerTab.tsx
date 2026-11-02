"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  FileCode2,
  GitFork,
  Loader2,
  Search,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { languageColor, nodeTypeMeta, splitPath } from "@/lib/node-types";
import { FileContentResponse, FileRecord } from "@/types";

interface CodeExplorerTabProps {
  repoId: string;
  files: FileRecord[];
  initialFilePath?: string;
  highlightRange?: { start: number; end: number } | null;
  onInspectGraphNode: (nodeId: string) => void;
  onRunImpact: (nodeId: string) => void;
}

export function CodeExplorerTab({
  repoId,
  files,
  initialFilePath,
  highlightRange,
  onInspectGraphNode,
  onRunImpact,
}: CodeExplorerTabProps) {
  const [selectedPath, setSelectedPath] = useState<string>(
    initialFilePath || files[0]?.path || ""
  );
  const [fileFilter, setFileFilter] = useState("");
  const [fileData, setFileData] = useState<FileContentResponse | null>(null);
  const [activeRange, setActiveRange] = useState<{
    start: number;
    end: number;
  } | null>(highlightRange || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialFilePath && files.some((f) => f.path === initialFilePath)) {
      setSelectedPath(initialFilePath);
    } else if (!files.some((f) => f.path === selectedPath) && files.length > 0) {
      setSelectedPath(files[0].path);
    }
  }, [initialFilePath, files, selectedPath]);

  useEffect(() => {
    setActiveRange(highlightRange || null);
  }, [highlightRange]);

  const effectivePath = files.some((f) => f.path === selectedPath)
    ? selectedPath
    : files[0]?.path || "";

  useEffect(() => {
    if (!repoId || !effectivePath) return;
    let cancelled = false;
    setLoading(true);
    api
      .getFileContent(repoId, effectivePath)
      .then((res) => {
        if (!cancelled) setFileData(res);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repoId, effectivePath]);

  // Scroll the first highlighted line into view when a range is set.
  useEffect(() => {
    if (!activeRange || loading) return;
    const el = document.getElementById(`code-line-${activeRange.start}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeRange, loading, fileData]);

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(fileFilter.toLowerCase())
  );

  const codeLines = fileData?.content.split("\n") || [];
  const currentPath = fileData?.file_path || selectedPath;
  const { dir: currentDir, name: currentName } = splitPath(currentPath);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-180px)] lg:min-h-[620px]">
      {/* Files */}
      <section className="card lg:col-span-3 flex flex-col overflow-hidden max-h-[360px] md:max-h-[460px] lg:max-h-none">
        <div className="panel-head">
          <span className="panel-title">Files</span>
          <span className="count">{filteredFiles.length}</span>
        </div>
        <div className="p-3 border-b border-hairline-cool">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Filter files"
              placeholder="Filter files..."
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value)}
              className="field !min-h-[34px] !py-1.5 !pl-9 !text-[13px]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filteredFiles.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-ink-mute">No files match.</p>
          )}
          {filteredFiles.map((file) => {
            const isSelected = file.path === effectivePath;
            const { dir, name } = splitPath(file.path);
            return (
              <button
                key={file.path}
                type="button"
                aria-current={isSelected}
                title={file.path}
                onClick={() => {
                  setSelectedPath(file.path);
                  setActiveRange(null);
                }}
                className="row-btn"
              >
                <span
                  className="w-2 h-2 rounded-[2px] shrink-0"
                  style={{ background: languageColor(file.language) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[12.5px] truncate">{name}</span>
                  {dir && (
                    <span className="block font-mono text-[11px] text-ink-mute-2 truncate">
                      {dir}
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-ink-mute-2 tabular-nums shrink-0">
                  {file.line_count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Symbols & calls */}
      <section className="card lg:col-span-3 flex flex-col overflow-hidden max-h-[460px] lg:max-h-none">
        <div className="panel-head">
          <div className="flex items-center gap-2">
            <span className="panel-title">Symbols</span>
            <span className="count">{fileData?.symbols.length || 0}</span>
          </div>
          {effectivePath && (
            <button
              type="button"
              onClick={() => onRunImpact(effectivePath)}
              className="btn-tone tone-tomato"
              title="Run impact analysis for this file"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              File impact
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {fileData && fileData.symbols.length === 0 && (
            <p className="px-2 py-6 text-center text-[13px] text-ink-mute">
              No symbols extracted from this file.
            </p>
          )}
          {fileData?.symbols.map((sym) => {
            const meta = nodeTypeMeta(sym.type);
            const isActive =
              activeRange?.start === sym.line_start && activeRange?.end === sym.line_end;
            return (
              <div
                key={`${sym.id}-${sym.line_start}`}
                className={`tone-${meta.tone} rounded-[8px] border p-3 space-y-2 transition ${
                  isActive
                    ? "border-[var(--tbd)] bg-[var(--tbg)]"
                    : "border-hairline bg-canvas hover:border-hairline-strong"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveRange({ start: sym.line_start, end: sym.line_end })
                    }
                    className="flex items-center gap-2 min-w-0 text-left group"
                    title="Highlight in source"
                  >
                    <span className="tone-dot" />
                    <span className="font-mono text-[13px] font-medium text-ink truncate group-hover:underline underline-offset-2">
                      {sym.name}
                    </span>
                  </button>
                  <span className="text-[11px] font-medium text-[var(--tfg)] shrink-0">
                    {meta.label}
                  </span>
                </div>
                <div className="font-mono text-[11.5px] text-ink-mute truncate" title={sym.signature}>
                  <span className="text-ink-secondary">
                    L{sym.line_start}–{sym.line_end}
                  </span>
                  {sym.signature && <> · {sym.signature}</>}
                </div>
                {sym.docstring && (
                  <p className="text-[12px] text-ink-mute leading-relaxed line-clamp-2">
                    {sym.docstring}
                  </p>
                )}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onInspectGraphNode(sym.id)}
                    className="btn-tone tone-violet !min-h-[26px] !px-2 !text-[11px]"
                  >
                    <GitFork className="w-3 h-3" />
                    Graph
                  </button>
                  <button
                    type="button"
                    onClick={() => onRunImpact(sym.id)}
                    className="btn-tone tone-tomato !min-h-[26px] !px-2 !text-[11px]"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    Impact
                  </button>
                </div>
              </div>
            );
          })}

          {fileData && fileData.calls.length > 0 && (
            <div className="pt-4 mt-2 border-t border-hairline-cool">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="section-label">Outgoing calls</span>
                <span className="count">{fileData.calls.length}</span>
              </div>
              <div className="space-y-0.5 tone-violet">
                {fileData.calls.slice(0, 20).map((c, idx) => (
                  <button
                    type="button"
                    key={`${c.caller}-${c.callee}-${idx}`}
                    onClick={() => setActiveRange({ start: c.line, end: c.line })}
                    className="row-btn !py-1.5 font-mono !text-[12px]"
                  >
                    <span className="truncate flex-1 flex items-center gap-1.5">
                      <span className="truncate text-ink-mute">{c.caller}</span>
                      <ArrowRight className="w-3 h-3 text-ink-mute-2 shrink-0" />
                      <span className="truncate text-[var(--tfg)] font-medium">{c.callee}()</span>
                    </span>
                    <span className="text-ink-mute-2 shrink-0 tabular-nums">L{c.line}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Source viewer */}
      <section className="card md:col-span-2 lg:col-span-6 flex flex-col overflow-hidden min-h-[480px]">
        <div className="panel-head">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode2 className="w-4 h-4 text-ink-mute shrink-0" />
            <span className="font-mono text-[13px] truncate" title={currentPath}>
              <span className="text-ink-mute">{currentDir}</span>
              <span className="text-ink font-medium">{currentName}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeRange && (
              <button
                type="button"
                onClick={() => setActiveRange(null)}
                className="btn-tone tone-emerald !min-h-[26px] !px-2 !text-[11px] font-mono"
                title="Clear highlight"
              >
                L{activeRange.start}
                {activeRange.end !== activeRange.start && `–${activeRange.end}`} ×
              </button>
            )}
            {fileData && (
              <span className="pill-soft hidden sm:inline-flex">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: languageColor(fileData.language) }}
                />
                <span className="capitalize">{fileData.language}</span>
                <span className="text-ink-mute-2">· {fileData.line_count} lines</span>
              </span>
            )}
          </div>
        </div>

        <div className="code-surface flex-1 overflow-auto py-3 font-mono text-[12.5px] leading-[1.7]">
          {loading ? (
            <div className="flex items-center gap-2 px-5 py-4 text-[#9a9a9a]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading source file...
            </div>
          ) : (
            <div className="min-w-max">
              {codeLines.map((line, index) => {
                const lineNum = index + 1;
                const isHighlighted =
                  !!activeRange &&
                  lineNum >= activeRange.start &&
                  lineNum <= activeRange.end;
                return (
                  <div
                    key={lineNum}
                    id={`code-line-${lineNum}`}
                    className="code-line"
                    data-hl={isHighlighted}
                  >
                    <span className="ln tabular-nums">{lineNum}</span>
                    <pre className="whitespace-pre">{line || " "}</pre>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

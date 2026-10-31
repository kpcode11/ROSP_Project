"use client";

import React, { useEffect, useState } from "react";
import {
  Code,
  FileCode2,
  GitCommit,
  Search,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
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

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(fileFilter.toLowerCase())
  );

  const codeLines = fileData?.content.split("\n") || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100dvh-145px)] min-h-[620px] min-w-0">
      <div className="lg:col-span-3 panel flex flex-col overflow-hidden min-w-0">
        <div className="p-3 hairline">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-fg-muted absolute start-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              placeholder="Filter files..."
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value)}
              className="field-search type-body"
              aria-label="Filter files"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredFiles.length === 0 && (
            <p className="type-small text-fg-muted px-3 py-2">No files match this filter.</p>
          )}
          {filteredFiles.map((file) => {
            const isSelected = file.path === selectedPath;
            return (
              <button
                key={file.path}
                type="button"
                onClick={() => {
                  setSelectedPath(file.path);
                  setActiveRange(null);
                }}
                aria-current={isSelected ? "true" : undefined}
                className={`w-full text-start px-3 py-2 rounded-md type-small flex items-center justify-between min-w-0 ${
                  isSelected
                    ? "bg-light text-on-light font-bold"
                    : "text-fg-soft hover:bg-surface-4"
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <FileCode2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate font-code">{file.path}</span>
                </div>
                <span className="type-micro ms-2 shrink-0 opacity-80">
                  {file.line_count}L
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-3 panel flex flex-col overflow-hidden min-w-0">
        <div className="p-3 hairline flex items-center justify-between gap-2">
          <span className="type-small-bold text-fg">
            AST Symbols ({fileData?.symbols.length || 0})
          </span>
          {selectedPath && (
            <button
              type="button"
              onClick={() => onRunImpact(selectedPath)}
              className="btn btn-outlined"
            >
              <ShieldAlert className="w-3 h-3" aria-hidden="true" />
              <span>File Impact</span>
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {fileData?.symbols.map((sym) => (
            <div
              key={`${sym.id}-${sym.line_start}`}
              className="p-3 rounded-md bg-bg space-y-2 min-w-0"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveRange({
                      start: sym.line_start,
                      end: sym.line_end,
                    })
                  }
                  className="type-small-bold font-code text-fg hover:underline truncate text-start min-w-0"
                >
                  {sym.name}
                </button>
                <span className="badge shrink-0">{sym.type}</span>
              </div>
              <div className="type-micro font-code text-fg-muted truncate">
                L{sym.line_start}–L{sym.line_end} • {sym.signature}
              </div>
              {sym.docstring && (
                <p className="type-small text-fg-muted line-clamp-2">
                  {sym.docstring}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => onInspectGraphNode(sym.id)}
                  className="btn btn-secondary"
                >
                  Focus in Graph
                </button>
                <button
                  type="button"
                  onClick={() => onRunImpact(sym.id)}
                  className="btn btn-outlined"
                >
                  Blast Radius
                </button>
              </div>
            </div>
          ))}

          {fileData && fileData.calls.length > 0 && (
            <div className="pt-3">
              <div className="divider mb-3" />
              <div className="type-small-bold text-fg mb-2 flex items-center gap-2">
                <GitCommit className="w-3.5 h-3.5 text-fg-muted" aria-hidden="true" />
                <span>Outgoing Calls ({fileData.calls.length})</span>
              </div>
              <div className="space-y-1">
                {fileData.calls.slice(0, 20).map((c, idx) => (
                  <button
                    key={`${c.caller}-${c.callee}-${idx}`}
                    type="button"
                    onClick={() =>
                      setActiveRange({ start: c.line, end: c.line })
                    }
                    className="w-full text-start type-micro font-code px-2 py-2 rounded-sm bg-bg hover:bg-surface-4 text-fg-soft flex items-center justify-between min-w-0"
                  >
                    <span className="truncate">
                      {c.caller} → {c.callee}()
                    </span>
                    <span className="text-fg-muted ms-2 shrink-0">L{c.line}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-6 panel flex flex-col overflow-hidden min-w-0">
        <div className="p-3 hairline flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Code className="w-4 h-4 text-fg-muted shrink-0" aria-hidden="true" />
            <span className="type-small font-code text-fg font-bold truncate">
              {fileData?.file_path || selectedPath}
            </span>
          </div>
          {activeRange && (
            <span className="chip chip-selected font-code shrink-0">
              Highlighted L{activeRange.start}–L{activeRange.end}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto p-3 font-code type-small bg-bg">
          {loading ? (
            <div className="text-fg-muted p-4 space-y-2">
              <div className="skeleton h-4 w-40" />
              <p>Loading source file...</p>
            </div>
          ) : (
            codeLines.map((line, index) => {
              const lineNum = index + 1;
              const isHighlighted =
                activeRange &&
                lineNum >= activeRange.start &&
                lineNum <= activeRange.end;
              return (
                <div
                  key={lineNum}
                  className={`flex px-2 py-1 rounded-sm min-w-0 ${
                    isHighlighted
                      ? "bg-surface-3 shadow-[inset_4px_0_0_var(--color-accent)]"
                      : "hover:bg-surface-2"
                  }`}
                >
                  <span className="w-10 shrink-0 text-fg-muted text-end pe-4">
                    {lineNum}
                  </span>
                  <pre className="text-fg-soft whitespace-pre overflow-x-auto min-w-0">
                    {line || " "}
                  </pre>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

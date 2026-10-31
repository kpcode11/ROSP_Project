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
    if (initialFilePath) {
      setSelectedPath(initialFilePath);
    }
  }, [initialFilePath]);

  useEffect(() => {
    setActiveRange(highlightRange || null);
  }, [highlightRange]);

  useEffect(() => {
    if (!repoId || !selectedPath) return;
    let cancelled = false;
    setLoading(true);
    api
      .getFileContent(repoId, selectedPath)
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
  }, [repoId, selectedPath]);

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(fileFilter.toLowerCase())
  );

  const codeLines = fileData?.content.split("\n") || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-145px)] min-h-[620px]">
      {/* Left Pane: Repository File Tree */}
      <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter files..."
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredFiles.map((file) => {
            const isSelected = file.path === selectedPath;
            return (
              <button
                key={file.path}
                onClick={() => {
                  setSelectedPath(file.path);
                  setActiveRange(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                  isSelected
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-300 hover:bg-slate-800/70"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate font-mono">{file.path}</span>
                </div>
                <span className="text-[10px] text-slate-500 ml-2 shrink-0">
                  {file.line_count}L
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Middle Pane: Extracted AST Symbols & Calls */}
      <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">
            AST Symbols ({fileData?.symbols.length || 0})
          </span>
          {selectedPath && (
            <button
              onClick={() => onRunImpact(selectedPath)}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>File Impact</span>
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {fileData?.symbols.map((sym) => (
            <div
              key={`${sym.id}-${sym.line_start}`}
              className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() =>
                    setActiveRange({
                      start: sym.line_start,
                      end: sym.line_end,
                    })
                  }
                  className="text-xs font-mono font-semibold text-indigo-300 hover:underline truncate text-left"
                >
                  {sym.name}
                </button>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {sym.type}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 truncate">
                L{sym.line_start}–L{sym.line_end} • {sym.signature}
              </div>
              {sym.docstring && (
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {sym.docstring}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onInspectGraphNode(sym.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Focus in Graph
                </button>
                <button
                  onClick={() => onRunImpact(sym.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300"
                >
                  Blast Radius
                </button>
              </div>
            </div>
          ))}

          {fileData && fileData.calls.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-purple-400" />
                <span>Outgoing Calls ({fileData.calls.length})</span>
              </div>
              <div className="space-y-1">
                {fileData.calls.slice(0, 20).map((c, idx) => (
                  <div
                    key={`${c.caller}-${c.callee}-${idx}`}
                    onClick={() =>
                      setActiveRange({ start: c.line, end: c.line })
                    }
                    className="cursor-pointer text-[11px] font-mono px-2 py-1 rounded bg-slate-950/60 hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                  >
                    <span className="truncate">
                      {c.caller} →{" "}
                      <span className="text-purple-300">{c.callee}()</span>
                    </span>
                    <span className="text-slate-500 ml-2">L{c.line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Source Code Viewer with Line Highlighting */}
      <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono text-white font-medium">
              {fileData?.file_path || selectedPath}
            </span>
          </div>
          {activeRange && (
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              Highlighted L{activeRange.start}–L{activeRange.end}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed bg-slate-950">
          {loading ? (
            <div className="text-slate-400 p-4">Loading source file...</div>
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
                  className={`flex px-2 py-0.5 rounded ${
                    isHighlighted
                      ? "bg-indigo-500/20 border-l-2 border-indigo-400"
                      : "hover:bg-slate-900/80"
                  }`}
                >
                  <span className="w-10 shrink-0 select-none text-slate-600 text-right pr-4">
                    {lineNum}
                  </span>
                  <pre className="text-slate-200 whitespace-pre overflow-x-auto">
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

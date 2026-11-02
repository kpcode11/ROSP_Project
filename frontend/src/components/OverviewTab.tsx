"use client";

import React from "react";
import {
  Code2,
  Database,
  FileCode,
  FolderOpen,
  GitFork,
  Globe,
  Layers,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { NodeType, RepositoryDetail } from "@/types";
import { Tone, languageColor, nodeTypeMeta } from "@/lib/node-types";

interface OverviewTabProps {
  detail: RepositoryDetail;
  onInspectFile: (filePath: string, lineStart?: number) => void;
  onInspectGraphNode: (nodeId: string) => void;
  onRunImpact: (nodeId: string) => void;
}

const fmt = (n: number) => n.toLocaleString("en-US");

export function OverviewTab({
  detail,
  onInspectFile,
  onInspectGraphNode,
  onRunImpact,
}: OverviewTabProps) {
  const { stats, languages, frameworks, central_modules } = detail;

  const languageEntries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const totalLangFiles =
    languageEntries.reduce((acc, [, v]) => acc + v, 0) || 1;

  const maxPagerank = Math.max(...central_modules.map((m) => m.pagerank), 0) || 1;
  const maxInDegree = Math.max(...central_modules.map((m) => m.in_degree), 0) || 1;

  const metricCards: {
    label: string;
    value: React.ReactNode;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: Tone;
  }[] = [
    {
      label: "Source files",
      value: fmt(stats.files_parsed),
      sub: `${fmt(stats.imports_discovered)} cross-file imports`,
      icon: FileCode,
      tone: "sky",
    },
    {
      label: "Functions & methods",
      value: fmt(stats.functions_discovered),
      sub: `${fmt(stats.call_relationships)} call expressions`,
      icon: Code2,
      tone: "violet",
    },
    {
      label: "Classes & models",
      value: fmt(stats.classes_discovered),
      sub: `${fmt(stats.models_discovered)} database models`,
      icon: Database,
      tone: "amber",
    },
    {
      label: "API endpoints",
      value: fmt(stats.api_endpoints_discovered),
      sub: "Express, FastAPI & Spring routes",
      icon: Globe,
      tone: "emerald",
    },
    {
      label: "Knowledge graph",
      value: (
        <>
          {fmt(stats.nodes_count)}
          <span className="text-ink-mute-2 text-[20px]"> / {fmt(stats.edges_count)}</span>
        </>
      ),
      sub: "Nodes / directed edges",
      icon: GitFork,
      tone: "tomato",
    },
  ];

  const rankClass = (idx: number) =>
    idx === 0 ? "rank rank-1" : idx < 3 ? "rank rank-top" : "rank";

  const TypePill = ({ type }: { type: NodeType }) => {
    const meta = nodeTypeMeta(type);
    return (
      <span className={`pill-soft tone-${meta.tone}`}>
        <span className="tone-dot !w-1.5 !h-1.5" />
        {meta.label}
      </span>
    );
  };

  const Actions = ({ id, filePath }: { id: string; filePath: string }) => (
    <>
      <button
        type="button"
        onClick={() => onInspectFile(filePath)}
        className="btn-tone tone-sky"
        title="Open source in Code Explorer"
      >
        <Code2 className="w-3.5 h-3.5" />
        Code
      </button>
      <button
        type="button"
        onClick={() => onInspectGraphNode(id)}
        className="btn-tone tone-violet"
        title="Inspect graph neighborhood"
      >
        <GitFork className="w-3.5 h-3.5" />
        Graph
      </button>
      <button
        type="button"
        onClick={() => onRunImpact(id)}
        className="btn-tone tone-tomato"
        title="Estimate change blast radius"
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        Impact
      </button>
    </>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Repository overview</p>
          <h1 className="mt-1.5 text-[28px] sm:text-[36px] leading-[1.15] tracking-[-0.72px] font-medium text-ink break-words">
            {detail.name}
          </h1>
          <p className="mt-2 text-[15px] text-ink-mute max-w-2xl">
            A deterministic map of the code, its relationships, and the change surface.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <span className="pill-soft max-w-full" title={detail.source_path}>
            <FolderOpen className="w-3.5 h-3.5 text-ink-mute shrink-0" />
            <span className="font-mono truncate max-w-[260px]">{detail.source_path}</span>
          </span>
          <span className="pill-soft capitalize">{detail.source_type}</span>
        </div>
      </header>

      {/* KPI cards */}
      <section
        aria-label="Repository metrics"
        className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4"
      >
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`card-kpi p-4 sm:p-5 flex flex-col gap-4 tone-${card.tone} ${
                idx === metricCards.length - 1 ? "col-span-2 lg:col-span-1" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="tone-icon w-8 h-8 shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-[13px] font-semibold text-ink-secondary leading-tight">
                  {card.label}
                </span>
              </div>
              <div>
                <div className="text-[26px] sm:text-[28px] leading-none tracking-[-0.42px] font-semibold text-ink tabular-nums">
                  {card.value}
                </div>
                <div className="text-[12px] text-ink-mute mt-2">{card.sub}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Architectural summary & language breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="card-night lg:col-span-2 p-6 sm:p-8 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="tone-icon tone-emerald w-8 h-8">
                <Layers className="w-4 h-4" />
              </span>
              <h2 className="text-[18px] font-semibold tracking-[-0.2px]">
                Architectural summary
              </h2>
            </div>
            <span className="pill-soft tone-emerald font-mono !text-[11px] uppercase tracking-[0.08em] hidden sm:inline-flex">
              deterministic
            </span>
          </div>
          <p className="night-body text-[15px] leading-[1.65]">
            {detail.architectural_summary}
          </p>
          {frameworks.length > 0 && (
            <div className="mt-auto pt-4 border-t border-hairline">
              <p className="night-mute text-[12px] font-medium mb-2.5">
                Detected frameworks &amp; stack
              </p>
              <div className="flex flex-wrap gap-2">
                {frameworks.map((fw) => (
                  <span key={fw} className="night-chip">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#24b47e]" />
                    {fw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-6 flex flex-col gap-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[18px] font-medium tracking-[-0.2px] text-ink">
              Languages
            </h2>
            <span className="text-[12px] text-ink-mute tabular-nums">
              {fmt(totalLangFiles)} files
            </span>
          </div>

          <div
            className="flex h-2.5 w-full gap-[2px] rounded-full overflow-hidden"
            role="img"
            aria-label="Language distribution"
          >
            {languageEntries.map(([lang, count], idx) => (
              <div
                key={lang}
                style={{
                  width: `${(count / totalLangFiles) * 100}%`,
                  background: languageColor(lang, idx),
                }}
                className="h-full first:rounded-l-full last:rounded-r-full"
                title={`${lang}: ${count} files`}
              />
            ))}
          </div>

          <ul className="space-y-3">
            {languageEntries.map(([lang, count], idx) => {
              const pct = (count / totalLangFiles) * 100;
              return (
                <li key={lang} className="flex items-center gap-3 text-[13px]">
                  <span
                    className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                    style={{ background: languageColor(lang, idx) }}
                  />
                  <span className="capitalize text-ink font-medium flex-1 truncate">
                    {lang}
                  </span>
                  <span className="text-ink-mute tabular-nums">{fmt(count)}</span>
                  <span className="w-12 text-right font-medium text-ink-secondary tabular-nums">
                    {pct < 1 ? "<1" : Math.round(pct)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Central components (PageRank) */}
      <section className="card overflow-hidden" aria-labelledby="central-title">
        <div className="px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-hairline">
          <div className="flex items-start gap-3">
            <span className="tone-icon tone-emerald w-9 h-9 shrink-0">
              <Trophy className="w-4 h-4" />
            </span>
            <div>
              <h2 id="central-title" className="text-[18px] font-medium tracking-[-0.2px] text-ink">
                Top central components
              </h2>
              <p className="text-[13px] text-ink-mute mt-0.5">
                Ranked by dependency-graph PageRank. Open the source, explore the graph,
                or estimate the blast radius of a change.
              </p>
            </div>
          </div>
          <span className="pill-soft self-start sm:self-center tabular-nums">
            {central_modules.length} components
          </span>
        </div>

        {central_modules.length === 0 ? (
          <p className="px-6 py-12 text-center text-[14px] text-ink-mute">
            No central components were detected for this repository.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="data-table w-full text-left border-collapse text-[14px]">
                <thead>
                  <tr>
                    <th className="w-14">#</th>
                    <th>Component</th>
                    <th>Type</th>
                    <th className="w-[170px]">Dependents</th>
                    <th className="text-right">Out-degree</th>
                    <th className="w-[190px]">PageRank</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {central_modules.map((mod, idx) => (
                    <tr key={mod.id}>
                      <td>
                        <span className={rankClass(idx)}>{idx + 1}</span>
                      </td>
                      <td className="max-w-[360px]">
                        <div className="font-mono text-[13px] font-medium text-ink truncate" title={mod.label}>
                          {mod.label}
                        </div>
                        <div className="font-mono text-[12px] text-ink-mute truncate mt-0.5" title={mod.file_path}>
                          {mod.file_path}
                        </div>
                      </td>
                      <td>
                        <TypePill type={mod.type} />
                      </td>
                      <td className="tone-sky">
                        <div className="flex items-center gap-3">
                          <span className="w-8 font-medium text-ink tabular-nums">
                            {fmt(mod.in_degree)}
                          </span>
                          <div className="meter flex-1">
                            <span style={{ width: `${(mod.in_degree / maxInDegree) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="text-right text-ink-secondary tabular-nums">
                        {fmt(mod.out_degree)}
                      </td>
                      <td className="tone-emerald">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[13px] font-medium text-[var(--tfg)] tabular-nums">
                            {mod.pagerank.toFixed(4)}
                          </span>
                          <div className="meter flex-1">
                            <span style={{ width: `${(mod.pagerank / maxPagerank) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <Actions id={mod.id} filePath={mod.file_path} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet cards */}
            <ul className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--hairline-cool)]">
              {central_modules.map((mod, idx) => (
                <li key={mod.id} className="bg-canvas p-4 sm:p-5 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <span className={rankClass(idx)}>{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[13px] font-medium text-ink break-all">
                          {mod.label}
                        </span>
                        <TypePill type={mod.type} />
                      </div>
                      <div className="font-mono text-[12px] text-ink-mute mt-1 break-all">
                        {mod.file_path}
                      </div>
                    </div>
                  </div>

                  <dl className="grid grid-cols-3 gap-2 text-[12px]">
                    <div className="rounded-md bg-canvas-soft border border-hairline-cool px-3 py-2">
                      <dt className="text-ink-mute">Dependents</dt>
                      <dd className="text-[16px] font-medium text-ink tabular-nums mt-0.5">
                        {fmt(mod.in_degree)}
                      </dd>
                    </div>
                    <div className="rounded-md bg-canvas-soft border border-hairline-cool px-3 py-2">
                      <dt className="text-ink-mute">Out-degree</dt>
                      <dd className="text-[16px] font-medium text-ink tabular-nums mt-0.5">
                        {fmt(mod.out_degree)}
                      </dd>
                    </div>
                    <div className="tone-emerald rounded-md bg-[var(--tbg)] border border-[var(--tbd)] px-3 py-2">
                      <dt className="text-ink-mute">PageRank</dt>
                      <dd className="font-mono text-[14px] font-medium text-[var(--tfg)] tabular-nums mt-0.5">
                        {mod.pagerank.toFixed(4)}
                      </dd>
                    </div>
                  </dl>

                  <div className="grid grid-cols-3 gap-2 [&>button]:min-h-[36px]">
                    <Actions id={mod.id} filePath={mod.file_path} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

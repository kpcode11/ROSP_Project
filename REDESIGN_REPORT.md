# Redesign report

**Date:** 2026-10-31  
**Branch:** `ui/design-system-redesign`  
**Sources:** `DESIGN.md`, `REDESIGN_PROMPT.md`

## 1. Summary

The Next.js dashboard was restyled to a near-black, achromatic UI with a single green accent (`#1ed760`), pill/circle controls, compact Figtree type, and heavy elevation shadows. Routes, data fetching, tab state, API calls, and copy are unchanged. Proprietary Spotify fonts were not used.

Concept mapping: album cards → KPI/content cards; circular play → primary CTA per region (Analyze Repo, Ask, Search, Recompute, Focus neighborhood); sidebar → existing top navbar (kept); search pill → file filter and semantic/graph search; now-playing bar omitted (no prior persistent global bar).

## 2. Files changed (by phase)

### Phase 0
- Branch `ui/design-system-redesign`
- Inventory of `frontend/src` (single App Router page + five workspace tabs)

### Phase 1
- `frontend/src/app/globals.css` — tokens, type roles, primitives, a11y, print, React Flow overrides
- `frontend/tailwind.config.ts` — Tailwind v3 theme mapped to CSS variables
- `frontend/src/app/layout.tsx` — Figtree, `lang="en"`, dark color-scheme, theme-color
- `frontend/package.json` / lockfile — `@fontsource/figtree` (400/600/700, `font-display: swap`)

### Phase 2–3
- `frontend/src/app/page.tsx` — tablist restyle, `100dvh`, empty/loading skeleton
- `frontend/src/components/Navbar.tsx` — pills, modal dialog (Esc, focus trap, restore focus)
- `frontend/src/components/OverviewTab.tsx`
- `frontend/src/components/CodeExplorerTab.tsx`
- `frontend/src/components/KnowledgeGraphTab.tsx`
- `frontend/src/components/AssistantTab.tsx`
- `frontend/src/components/ImpactAnalysisTab.tsx`
- `frontend/src/lib/layout-graph.ts` — edge strokes via CSS variables

### Phase 4
- `frontend/src/app/not-found.tsx` — previously unstyled default 404
- Dead slate/indigo/emerald/rose/purple/blue literals removed from TSX

## 3. Deviations from `DESIGN.md`

| What | Why | Where |
|------|-----|--------|
| Figtree instead of SpotifyMixUI / CircularSp | Proprietary fonts disallowed | `--font-ui`, `@fontsource/figtree` |
| Pills use `9999px` not `500px` | Prompt §3.4 | `--radius-pill` |
| `:focus-visible` 2px white outline | `#000` focus is invisible on `#1f1f1f` | `globals.css` |
| Derived hover / pressed / disabled / scrim / skeleton | Not in `DESIGN.md` | Prompt §3.9 |
| Dark-only; no theme toggle existed | Prompt §3.10 | `color-scheme: dark` |
| Top navbar kept (not a left sidebar) | Prompt §3.11 | `Navbar.tsx` |
| No now-playing bar | Site had no persistent global bar | N/A |
| `themeColor: "#121212"` in `layout.tsx` | HTML meta cannot read CSS variables before paint | `layout.tsx` |
| System monospace for code | Code identifiers need a mono stack; not in `DESIGN.md` | `--font-mono` |
| Graph node types use accent + muted + semantic colors | Data viz palette limit | `KnowledgeGraphTab` |
| Custom 404 page | Prompt: unstyled rare pages are bugs | `not-found.tsx` |

## 4. Assumptions and interpretations

- Card grid: `<425` 1 col, `425–767` 2, `768–1023` 3, `≥1024` 5.
- Language chart series order: accent, muted, info, warning, negative, with labels so color is not the only cue.
- Edge mapping: ROUTES_TO=accent, CALLS=info, QUERIES=negative, IMPORTS=muted.
- Five workspace tabs stay a top tab bar (≤5 destinations; existing pattern).
- Display type token defined but unused (no hero H1).
- Inline `style={{ width }}` on bars is layout percentage, not color/radius/font.

## 5. Derived tokens/values (Prompt §3.9 only)

- Surface hover ladder: `#181818` → `#1f1f1f` → `#252525` → `#272727`
- Dark pill hover `#272727`, pressed `#181818`
- Green button hover/pressed: `scale(1.04)` / `scale(0.98)`
- Disabled: `opacity: .5`, `cursor: not-allowed`
- Scrim: `rgba(0,0,0,0.7)`
- Skeleton: `#181818` pulse to `#252525`
- Selected chip: `#eeeeee` / `#181818`
- Motion: 160ms ease-out behind `prefers-reduced-motion: no-preference`

## 6. Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | Passed |
| `npm run build` | Passed (Next.js 14.2.35) |
| Hex search outside tokens | Only `layout.tsx` `themeColor` (documented) |
| Spotify / CircularSp strings | None |
| `!important` | React Flow UA stylesheet only, each commented |
| Contrast (muted `#b3b3b3` on `#181818`) | ~8.6:1 (AA) |
| Text on green (`#000` on `#1ed760`) | ~7.6:1 (AA) |
| Semantic on `#252525` | Negative ~4.6:1, warning ~7.3:1, info ~5.3:1 |
| Browser at 320/375/425/576/768/896/1024/1280/1536 | Partial — see below |
| Keyboard / 200% zoom / RTL / reduced-motion | NOT VERIFIED: not fully exercised |
| Backend unit tests | Not re-run (UI-only change) |

**Manual / visual:** Demo was already running (`python scripts/tasks.py demo`). Overview was opened in the in-IDE browser at desktop width after the restyle.

## 7. Needs owner input

- Licensed font swap into `--font-ui` / `--font-title` if Figtree is not the long-term choice
- Dedicated logo asset for dark backgrounds (current mark is a Lucide icon)
- No third-party embeds found

## 8. Known issues and follow-ups

- Next.js default error overlay / `_error` pages besides `not-found` were not customized (no `error.tsx`)
- Graph search uses a Filter icon in the pill (search semantics unchanged)
- Navbar model chips truncate on mid widths; overflow is ellipsis, not wrap
- Print uses `Canvas` / `CanvasText` so ink is not forced dark
- No snapshot tests existed; none updated

# Fix Conditional Hooks & Nested Components

Goal: eliminate the 18 Rules-of-Hooks violations and 6 nested-component definitions surfaced by `react-doctor`, without changing any visible behavior or rendered output.

## Background — why these are real bugs

- **Rules of Hooks**: React relies on hooks being called in the **same order on every render**. When a component does an early `return` (or runs hooks inside an `if`) above a `useRef` / `useState` / `useMemo` / `useCallback`, React's internal hook index drifts on the next render and the component can crash with `"Rendered fewer hooks than expected"` or silently associate state with the wrong hook.
- **Nested component definitions**: When `function SquareLogo()` lives inside `MatchCard`, a *brand-new component type* is created on every render. React unmounts and remounts the subtree each time — destroying local state, re-running effects, and breaking memoization. Visually it "works", but it's a perf and correctness landmine.

## Exact files & line numbers (from react-doctor)

### A. Conditional hooks — 18 violations across 5 files

| File | Lines | Hook(s) | Cause |
|---|---|---|---|
| `src/hooks/playoffs/usePlayoffViewModel.ts` | 55–58 | `usePlayoffBracketData`, `usePlayoffMatches`, `usePlayoffTeams`, `usePlayoffActions` | Early `return` block at line 31 when `bracketId` is empty runs before these hooks |
| `src/components/playoffs/viewer/BracketsViewerComponent.tsx` | 35, 36, 37, 40, 41, 44, 47, 86 | `useRef`×2, `useState`×3, `useBracketsViewerScript`, `useCallback`, `useBracketsViewerRenderer` | Early `return` for invalid bracket at line 28–32 sits above all the hooks |
| `src/components/playoffs/BracketView.tsx` | 140, 146, 150 | `useMemo`×2, `useCallback` | Empty-bracket-id early return at line ~117 runs above these hooks |
| `src/components/history/HistoricalStandingsTable.tsx` | 293, 300 | `useCallback`×2 | `if (teams.length === 0) return …` at line 283 runs above the `useCallback`s |
| `src/components/playoffs/form/bracket-teams/components/BracketFormTeamsContainer.tsx` | 169 | `useCallback` | Loading / error / empty-state early returns above line 169 |

### B. Nested component definitions — 6 violations across 6 files

| File | Line | Inner component | Parent |
|---|---|---|---|
| `src/components/home/MatchCard.tsx` | 19 | `SquareLogo` | `MatchCard` |
| `src/components/teams/MatchCard.tsx` | 39 | `SquareLogo` | `MatchCard` |
| `src/components/stats/PowerScoreChart.tsx` | 53 | `CustomPowerScoreTooltip` (+ `CustomLabel` nearby) | `PowerScoreChart` |
| `src/components/stats/WinLossBarChart.tsx` | 33 | nested chart helper | `WinLossBarChart` |
| `src/components/stats/HeadToHeadRecords.tsx` | 89 | nested row/cell component | `HeadToHeadRecords` |
| `src/components/stats/desktop/DivisionRankingsTable.tsx` | 53 | nested row component | `DivisionRankingsTable` |

## Fix strategy

### Pattern 1 — Hoist hooks above early returns

Move every hook call to the top of the component/hook body, then perform the early-return *after* all hooks. Where the early return needs to skip work that the hook would do, push the guard *into* the hook call:

- React Query hooks → use the `enabled` option (e.g. `useQuery({ ..., enabled: Boolean(bracketId) })`) so the query no-ops without skipping the hook itself.
- `useMemo` / `useCallback` → harmless to call unconditionally; just guard the body with the same condition that the early return used.
- `useState` / `useRef` → always safe to call unconditionally.

Per-file actions:

1. **`usePlayoffViewModel.ts`** — call `usePlayoffBracketData`, `usePlayoffMatches`, `usePlayoffTeams`, `usePlayoffActions` first; pass a "disabled" sentinel (or rely on existing `enabled` flags) when `bracketId` is empty; then return the safe-defaults object. Verify each child hook either already accepts `null` or add an `enabled: !!bracketId` flag in its underlying `useQuery`.
2. **`BracketsViewerComponent.tsx`** — move the `if (!bracket || !bracket.id)` check to *after* all `useRef`/`useState`/`useCallback`/`useBracketsViewerScript`/`useBracketsViewerRenderer` calls. The renderer hook already no-ops on missing data; if not, pass a guard flag.
3. **`BracketView.tsx`** — move the invalid-bracket-id early return below the `useMemo`/`useCallback` block (around line 117 → after line 158).
4. **`HistoricalStandingsTable.tsx`** — move the `teams.length === 0` empty-state return below the two `useCallback`s.
5. **`BracketFormTeamsContainer.tsx`** — hoist the `handleSeedChange` `useCallback` to the top of the component, above the loading/error/empty-state returns.

### Pattern 2 — Extract nested components

For each nested component, move the definition to **module scope** in the same file (or, if it's reused, a sibling file). Replace closure variables with explicit props.

- `home/MatchCard.tsx` & `teams/MatchCard.tsx`: lift `SquareLogo` to module scope; it already only uses props (`src`, `alt`, `fallback`).
- `stats/PowerScoreChart.tsx` (and the same pattern for `WinLossBarChart`, `HeadToHeadRecords`, `DivisionRankingsTable`): lift the recharts `CustomTooltip` / `CustomLabel` / row component to module scope. Where they currently close over values like `colors` or `isMobile`, accept them as props and pass them in via the recharts `content={<MyTooltip colors={colors} />}` form (recharts merges its own `active`/`payload` props automatically) or via a stable `useCallback` factory that returns JSX.

## Safety / verification

- Pure refactor — no behavior changes, no prop changes at the call sites of these components.
- After each file, run targeted tests:
  - `npm run test:file -- src/components/playoffs/viewer` (and the rest)
  - `npm run test:file -- src/pages/__tests__/Playoffs.test.tsx`
  - `npm run test:file -- src/pages/__tests__/History.test.tsx`
  - `npm run test:file -- src/pages/__tests__/Index.test.tsx` (covers `home/MatchCard`)
- Final verification: `npx react-doctor@latest` should report **0** Rules-of-Hooks and **0** nested-component-definition violations.
- Manual smoke check in preview: `/playoffs`, `/history`, `/stats`, `/teams/<slug>`, and the home page recent-matches list.

## Out of scope (intentionally not touched)

- The 67 hydration `new Date()` warnings, 22 cascading-setState warnings, the 1,355 architecture/Tailwind-shorthand items, and the 726 dead-code findings. Those are separate cleanups.
- `useEffect` cleanup leaks (6 of them) — important but a different bug class; can be a follow-up plan if you want.

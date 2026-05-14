# Plan: SSR-Safe Time Rendering (67 callsites)

## Goal
Eliminate the 67 react-doctor "hydration mismatch (time)" warnings by ensuring no `new Date()` value (or anything derived from `Date.now()` / `new Date()`) is rendered directly during the initial render pass. Behavior on the live SPA must be identical — same text, same formatting, same update cadence.

## Why this is safe
The app is a pure Vite SPA (no SSR today), so these warnings are latent. The fix is defensive: it makes the components SSR-ready without changing any visible output for current users. The only observable difference would appear *if* SSR were enabled later, where the first paint would briefly show a fallback (e.g. empty string or a stable placeholder) before the client effect fills in the live time.

## Strategy

Three categories cover all 67 callsites. We classify each callsite, then apply the matching pattern.

### Category A — Pure formatting of a stable input prop (most common, ~50 sites)
Examples: `formatDate(match.scheduled_at)`, `new Date(dateString).toLocaleDateString(...)` inside `home/utils.ts`, `teams/MatchCard.tsx`, `schedule/DateMatchGroup.tsx`, etc.

These are deterministic given the input string, but `toLocaleDateString` / `toLocaleTimeString` can produce different output on server vs client (locale, timezone). They are NOT actually hydration bugs in an SPA, but react-doctor flags any `new Date()` reachable from JSX.

**Fix:** Leave the formatting helpers alone (they're pure given input + runtime locale). Mark the components that render them with a tiny `useClientOnlyDate` hook OR — preferred for minimal churn — add a `suppressHydrationWarning` on the single `<span>`/`<time>` wrapping the formatted value. We will add a small shared component:

```tsx
// src/components/shared/ClientDate.tsx
export const ClientDate: React.FC<{ value: string | Date | null; format: (d: Date) => string; fallback?: string }> = ({ value, format, fallback = '' }) => {
  const [text, setText] = useState(fallback);
  useEffect(() => { if (value) setText(format(new Date(value))); }, [value, format]);
  return <span suppressHydrationWarning>{text || fallback}</span>;
};
```
Adopt it at the JSX boundary in each affected card/list. The current SPA renders identically because `useEffect` runs synchronously before paint commit on the first client render — users see the same text in the same paint frame.

### Category B — "Now" comparisons computed inside render (~12 sites)
Examples: `MatchCountdown` (already correct), but several spots compute `new Date() > matchDate` directly in JSX (e.g. `isPastMatch`, "Live" badges, "Today" labels in `DateStrip.tsx` via `isToday()`).

**Fix:** Move the comparison into `useState` seeded with a stable default (`false` / `null`), compute the real value in `useEffect`, optionally refresh on an interval if the component already does so. For `isToday`-style labels that don't change during a session, a one-shot `useEffect` is enough.

### Category C — `useMemo(() => [...dates], [])` with empty deps (~5 sites)
Example: `DateStrip.tsx` builds a 14-day window from `new Date()` inside `useMemo`. Renders during SSR would differ from client.

**Fix:** Initialize the array via `useState(() => buildDates())` inside `useEffect` on mount, with a stable empty/loading skeleton on first render. For DateStrip specifically, we render the same skeleton width to avoid CLS.

## Execution order

1. **Inventory** — re-run `npx react-doctor@latest` and dump the 67 file:line pairs to a temp list. Bucket each into A/B/C.
2. **Add shared primitive** — create `src/components/shared/ClientDate.tsx` and `src/hooks/useClientNow.ts` (returns `Date | null`, updates per `intervalMs`).
3. **Apply Category A** in batches by folder: `components/home/`, `components/teams/`, `components/schedule/`, `components/playoffs/`, `components/stats/`, `components/history/`, `components/admin/`. One PR-sized commit per folder so diffs stay reviewable.
4. **Apply Category B** — convert "now-derived" booleans to state-driven values.
5. **Apply Category C** — convert date-window `useMemo`s to mount-time `useState`.
6. **Verify** after each folder:
   - `npm run test:file` for any colocated `__tests__` (Index, History, Playoffs, MyTeam, TeamDetails, Timeslots are the relevant suites).
   - Visual spot-check on `/`, `/schedule`, `/playoffs`, `/teams/:id`, `/history` at mobile viewport.
7. **Final scan** — re-run react-doctor; expect hydration-time count to drop to 0. Confirm no new Rules-of-Hooks regressions were introduced.

## Out of scope
- The 22 cascading-setState warnings.
- The 6 `useEffect` cleanup leaks.
- The 1,355 architecture/Tailwind shorthand items.
- The 726 dead-code findings.
- Enabling SSR — this plan only makes the code SSR-*ready*.

## Risk & rollback
Risk is minimal because every change is additive (wrapper component or extra `useState`). If any visual regression appears (e.g. a card briefly showing empty date on first paint), we revert that single file — the shared primitive and other folders remain intact. No DB, service, or business-logic files are touched.

## Deliverable shape
- 1 new file: `src/components/shared/ClientDate.tsx`
- 1 new file: `src/hooks/useClientNow.ts`
- ~30–40 component edits, each touching only the JSX that renders a date and (where needed) the small block of state/effect that feeds it.
- 0 changes to services, hooks that fetch data, types, or tests' expected output.

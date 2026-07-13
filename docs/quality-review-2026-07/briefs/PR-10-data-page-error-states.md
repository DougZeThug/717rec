# PR-10 — Visible error + retry states for data pages (no more infinite skeletons), plus mobile navbar truncation fix

| | |
|---|---|
| **Phase** | 4 — UI, UX, accessibility, and mobile |
| **Tier** | 2 — High value (a real league-night failure mode: bad venue Wi-Fi) |
| **Priority** | Medium-high |
| **Recommended agent** | Claude Code (state handling); Lovable is acceptable for the visual part if given this brief verbatim |
| **Difficulty** | Medium |
| **Risk** | Low-medium |
| **Expected score improvement** | +1.3 overall (UX 80→90, UI 85→88, Mobile 85→86) |
| **Parallel-safe?** | Yes |
| **Depends on** | PR-01 |

## Background and problem statement

- **Observed during this review's browser walk-through** (39 page-loads, 3 viewports, backend unreachable — simulating exactly what bad venue Wi-Fi does): when data queries fail, `/stats` (Standings), `/compare`, and `/insights` render **indefinite loading skeletons or near-blank pages at every viewport** — no error message, no retry button (`evidence/exploration-results.json`: `hasContent:false` for those 3 routes × 3 viewports; `evidence/standings-mobile.png` shows the skeleton wall). Other data pages (teams, schedule, history, home) keep their shell but their data areas behave similarly.
- The repo's own July 2026 confidence audit flagged this exact pattern ("errors look like empty screens") as a residual — it is still present. The app-level `QueryClient` retries once; after that, `useQuery` exposes `isError`, but these pages don't render it.
- Also observed: at 375 px the navbar wordmark "717Rec" is clipped/overlapped by the Login button (`evidence/home-mobile.png`, `404-mobile.png`) — cosmetic but on every page.
- Status: **confirmed by observation** in a degraded-network environment; the same states will occur for real users on flaky connections. Preserve: skeletons as the *initial* loading state (they're good); the existing `EmptyState`/`LoadingState` components in `src/components/ui/`; realtime retry behavior.

## Objective

Every public data page distinguishes three states — loading (skeleton), failed (visible message + Retry button), loaded-but-empty (existing empty state) — and the mobile navbar never clips the brand.

## Exact scope

1. **Shared error state**: use/extend the existing `src/components/ui/empty-state.tsx` pattern (inspect it first — an error variant may exist) into an `QueryErrorState` with: plain-language message ("Couldn't load standings — check your connection"), a Retry button wired to `refetch`, consistent with design tokens. No new visual language.
2. **Wire it into the pages verified broken**: `/stats` (Stats.tsx + `components/stats/` containers), `/compare` (Compare.tsx), `/insights` (Insights.tsx + `LeagueInsightsContainer`). For each: find the hook (`useRankingsData`, comparison hooks, insights hooks), surface `isError`/`refetch` to the page container, render `QueryErrorState` instead of eternal skeletons when `isError && !data`.
3. **Sweep the remaining public pages** (`/`, `/teams`, `/schedule`, `/history`, `/playoffs`, `/message-board`, team details) for the same pattern; apply where a primary data query can strand a skeleton. Keep the diff per page minimal — this is state wiring, not redesign.
4. **Navbar**: at <400 px, ensure the brand text truncates with ellipsis or hides gracefully instead of being overlapped by the Login pill (`src/components/layout/Navbar.tsx` / `navbar/`). Flex/min-width fix, not a redesign.
5. **Out of scope:** offline PWA caching, retry/backoff tuning in QueryClient, admin pages (separate audience, lower stakes), realtime reconnect UX.

## Likely files and systems affected

- `src/components/ui/empty-state.tsx` (or new sibling `query-error-state.tsx`) + test
- `src/pages/Stats.tsx`, `src/pages/Compare.tsx`, `src/pages/Insights.tsx` and their container components (locate the actual query owners by reading each page's component tree before editing)
- `src/components/layout/Navbar.tsx` (+ `navbar/`)
- Tests alongside each touched component

## Implementation instructions

1. For each page, trace: page → container → hook. Identify which query's failure leaves the skeleton up. (Run the app with devtools offline mode to reproduce — `npm run dev`, then Network → Offline; this reproduces the review's observation.)
2. Build/extend the error component once; reuse everywhere. Message text per page, one sentence, no jargon, no error codes (log those via the existing `errorLog`).
3. Retry = TanStack `refetch()` on the failed queries — not a full page reload.
4. Keep skeletons for `isLoading`; error state only when `isError && !data`; stale-data-plus-background-error keeps showing data (default TanStack behavior — don't regress it).
5. Navbar: reproduce at 375 px, fix with `min-w-0` + `truncate` (or hide the wordmark below a breakpoint, keeping the logo); verify against `evidence/home-mobile.png` framing.

## Database requirements

None.

## UI and UX requirements

- **Journey:** player at the venue, Wi-Fi drops, opens Standings → sees skeleton briefly → "Couldn't load standings — check your connection" + Retry. Taps Retry when signal returns → data appears. Never an eternal skeleton.
- All three viewports; error component must not overflow at 375 px (add it to the overflow check habit).
- Loading state: unchanged skeletons. Empty state: unchanged. Success: unchanged.
- Accessibility: error message in a landmark/`role="status"` or `aria-live="polite"` region; Retry is a real button, keyboard reachable, ≥44 px touch target.
- Visual consistency: design-system tokens, same card/empty-state styling as `empty-state.tsx`.

## Testing requirements

- Component tests per wired page-container: mock hook → `isError:true, data:undefined` → error state renders with Retry; click Retry → `refetch` called; `isLoading` → skeleton; data → normal render. (Setup/action/expected per case.)
- `QueryErrorState` unit test incl. axe check if PR-09 landed (compose, don't conflict).
- Navbar: test that brand + Login coexist at 375 px without overlap (jsdom can assert the truncate class/structure; visual proof via manual check).
- Full suite green.

## Required validation commands

```bash
npm run test:file -- src/pages src/components/stats src/components/layout src/components/ui
npm run test:coverage
npm run typecheck && npm run lint && npm run build
npm run e2e   # smoke + a11y must stay green (CI)
```

## Manual verification checklist (for Doug)

1. Phone (or devtools 375 px): open the site, browse Standings — normal.
2. Devtools → Network → Offline (or airplane mode), refresh Standings. **Expect:** within ~5 seconds, a friendly error with a Retry button — NOT endless grey boxes.
3. Go back online, tap Retry. **Expect:** standings load without a full page refresh.
4. At phone width, look at the top bar. **Expect:** logo and Login button both fully visible, no clipped text.

## Acceptance criteria

- [ ] With all `*.supabase.co` requests blocked, `/stats`, `/compare`, `/insights` each show an error state with a working Retry within the retry window (no `hasContent:false` blank) at 375/768/1440 px.
- [ ] Retry recovers without page reload once network returns.
- [ ] Navbar brand is not clipped at 375 px.
- [ ] No regressions: e2e smoke/a11y green, full suite green, no new console errors on happy path.

## Non-goals and guardrails

- No redesign of skeletons, cards, or navigation.
- No QueryClient global config changes.
- No service-worker/offline caching work.
- Don't convert pages to different data hooks (PR-11's job where applicable).

## Rollback

Client-only; git revert. No data risk.

## Deliverables from the implementing agent

Per-page list of which query was stranding the skeleton; screenshots (or e2e artifacts) of the three states per page at 375 px; test/build outputs; any page found already handling errors correctly (skip list).

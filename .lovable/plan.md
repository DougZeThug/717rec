# League Night Status admin tab

## Scope
New admin tab, `league-night-status`, showing at-a-glance operational health for a league-night incident commander. Read-only surface — actions are links, not new mutations.

## Files

### New — `src/services/opsHealth/OpsHealthService.ts`
Thin service (follows the standard `handleDatabaseError` / explicit columns pattern):
- `fetchLastPowerSnapshot(): Promise<{ created_at: string; week_number: number; season_id: string; row_count: number } | null>` — reads the most recent row from `power_score_snapshots` (order by `created_at desc limit 1`) plus a `count(*)` grouped by that snapshot's `created_at` (so we can show "27 teams captured").
- `fetchPendingCounts(): Promise<{ pendingMatches: number; pendingRequests: number; pendingScoreSubmissions: number; unreadContact: number }>` — head-count queries against `matches` (unapproved), `team_requests` (pending), `score_submissions` (pending), `contact_requests` (new). Each is a `select('id', { count: 'exact', head: true })`.

### New — `src/hooks/useOpsHealth.ts`
- `useLastPowerSnapshot()` — TanStack Query, staleTime 60s, refetchInterval 60s.
- `usePendingOpsCounts()` — TanStack Query, staleTime 30s, refetchInterval 30s.
- `useRealtimeHealth()` — subscribes to a lightweight heartbeat channel inside `useEffect`, returns `{ state: 'connecting' | 'connected' | 'error' | 'closed', lastChangeAt: Date | null }`. Cleans up with `supabase.removeChannel` per the project realtime rule.

### New — `src/components/admin/league-night-status/LeagueNightStatusTab.tsx`
Single tab component composed of three cards + a quick-actions row:

1. **Realtime health card** — colored dot (green/yellow/red) driven by `useRealtimeHealth`, label + "last state change" timestamp, one-line hint ("Refresh a scorer's browser if red").
2. **Last power-snapshot card** — from `useLastPowerSnapshot`: relative time ("Ran 2 days ago"), absolute EST timestamp (project timezone rule), week + row count, and a warning badge when `created_at` is older than 8 days.
3. **Pending queue card** — four small stat tiles from `usePendingOpsCounts` (Matches / Requests / Score reports / Contact). Each tile is a button that switches `activeTab` to the relevant existing admin tab via `sessionStorage.setItem('adminActiveTab', …)` + a page reload — matching how `AdminSidebar` already reads its initial tab from sessionStorage. (Simpler than plumbing a global setter; matches existing pattern.)
4. **Quick actions strip** — external links (open in new tab) to:
   - Supabase status page (`https://status.supabase.com`)
   - Lovable status (`https://status.lovable.dev`)
   - Supabase SQL editor (deep link with the reconciliation query URL-encoded)
   - `docs/OPERATIONS.md` League-night playbook on GitHub (URL config lives in a small `OPS_LINKS` constant at the top of the file for easy editing)
   - Internal links: Live Corrections tab, Mass Score Entry tab (same sessionStorage-switch trick)

### Modified — `src/components/admin/dashboard/AdminSidebar.tsx` and `AdminMobileNav.tsx`
- Add `LeagueNightStatusTab` lazy import.
- New menu entry `{ id: 'league-night-status', label: 'League Night', icon: Activity }` inserted at the **top** of `adminMenuItems`.
- In mobile nav, add the id to a new group (or reuse `corrections`) — I'll add it as the first entry in a new `Operations` group so it's discoverable during an incident. Also add a Quick Access button that swaps `Timeslots` for `League Night` when there is any red signal (realtime error OR stale snapshot OR pending>0) — implemented purely inside `AdminMobileNav` by accepting an optional `hasIncidentSignal` prop from the sidebar, which reads the same hooks. If wiring that cleanly gets messy, fall back to always showing the Quick Access button — the tab is discoverable either way.

No other admin files change.

## Tests

### `src/services/opsHealth/__tests__/OpsHealthService.test.ts`
- Mocks `@/integrations/supabase/client` via the shared `supabaseMock` factory.
- Covers: last snapshot returns row + count; last snapshot returns null when table is empty; each pending count returns `count ?? 0` when the RPC returns null; error paths throw via `handleDatabaseError`.

### `src/hooks/__tests__/useOpsHealth.test.tsx`
- Renders each hook inside a `QueryClientProvider`, asserts data flows through and that stale/refetch intervals are set (spies on `queryOptions`).
- Realtime hook: mock `supabase.channel(...).on(...).subscribe((status) => …)`, drive the callback through `connecting → connected → error`, assert returned state transitions and that `removeChannel` is called on unmount.

### `src/components/admin/league-night-status/__tests__/LeagueNightStatusTab.test.tsx`
- Renders the tab with mocked hooks. Cases:
  - Happy path: green realtime dot, snapshot card shows "Ran … ago" and no stale badge, pending tiles render zeros.
  - Stale snapshot: `created_at` = 10 days ago → renders "Stale" badge.
  - Incident path: realtime returns `error` → red dot + hint text present.
  - Clicking the "Score reports" tile writes `pending-matches` … actually `pending-matches` for pending matches, `requests` for team requests, etc. — assert `sessionStorage.setItem('adminActiveTab', <expected>)` + `window.location.reload` was called (mocked).
  - Quick-action links have `target="_blank"` and `rel="noopener noreferrer"`.

### `src/pages/__tests__/AdminDashboard.test.tsx` (if it exercises the menu)
- Extend existing menu-item snapshot / count expectation, if any, to include the new tab. If the current test only checks that admin loads, no change needed — I'll re-read and adjust minimally.

## Verification

1. `npm run test:file -- src/services/opsHealth/__tests__/OpsHealthService.test.ts`
2. `npm run test:file -- src/hooks/__tests__/useOpsHealth.test.tsx`
3. `npm run test:file -- src/components/admin/league-night-status/__tests__/LeagueNightStatusTab.test.tsx`
4. `npx eslint . --fix`
5. Confirm the tab renders in the running preview (browse to `/admin`, click **League Night**) — screenshot via Playwright, redacting no secrets since it's a read-only dashboard.

## Non-goals
- No new DB tables, migrations, RLS, or edge functions.
- No changes to the cron job, `capture-power-snapshots`, or `OPERATIONS.md` beyond what was already done.
- No changes to authentication or admin gating — the tab lives inside the existing `AdminSidebar`, which is already behind `useAdminAccess`.
- No new mutations. Every "action" is either an internal tab switch or an external link.

## Rollback
Delete the three new files and revert the two nav files.



## Fix Excessive Network Requests on Page Load

The logs show **~50+ requests** firing within 1 second of page load. Two root causes:

### Problem 1: `useTeamMembership` duplicates (~6x)
This hook uses raw `useEffect` + `useState` instead of React Query. Every component that calls it (`useMyNextMatch`, `useMessageApi`, `useMatchInteractions`, plus the home page) triggers **independent** fetches for both `team_memberships` and `teams`. That's 6+ duplicate requests for each.

### Problem 2: N+1 badge queries (~20x)
`TeamBadgeCollection` calls `useTeamBadges(teamId)` per team. On the rankings page with ~20 teams, this fires **20 individual** `team_badge_events` queries. A `fetchAllTeamBadges()` function and hook (`useAllTeamBadges`) already exist but aren't used in list views.

---

### Fix 1: Convert `useTeamMembership` to React Query

**File: `src/hooks/useTeamMembership.ts`**

- Replace `useEffect` + `useState` for fetching with `useQuery` from TanStack
- Query key: `['team-membership', user?.id]`
- Query key for available teams: `['available-teams']`
- Add `staleTime: 5 * 60 * 1000` so it deduplicates across all consumers
- Keep `joinTeam` and `leaveTeam` as mutation functions that invalidate the query
- This alone eliminates ~10 duplicate requests per page load

### Fix 2: Bulk-fetch badges in list views

**File: `src/components/badges/TeamBadgeCollection.tsx`**

- Add an optional `prefetchedBadges` prop so parent components can pass pre-fetched data
- When `prefetchedBadges` is provided, skip the per-team `useTeamBadges` call

**File: `src/components/stats/RankingTableRow.tsx`** and **`src/components/stats/RankingCard.tsx`**

- In the parent list component, call `useAllTeamBadges()` once
- Filter badges by `team_id` and pass them down as `prefetchedBadges` to each `TeamBadgeCollection`
- This replaces ~20 queries with 1

**File: `src/components/home/TeamCard.tsx`** (used in a grid)

- Same pattern: parent grid calls `useAllTeamBadges()` once, passes filtered badges down

### Files to edit
- `src/hooks/useTeamMembership.ts` — rewrite to React Query
- `src/components/badges/TeamBadgeCollection.tsx` — add `prefetchedBadges` prop
- `src/components/stats/RankingTableRow.tsx` — accept prefetched badges
- `src/components/stats/RankingCard.tsx` — accept prefetched badges
- Parent components that render ranking lists and team grids — call `useAllTeamBadges()` and pass data down

### Impact
Reduces initial page load from ~50+ Supabase requests to ~25-30 by eliminating all duplicates.


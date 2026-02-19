

## Safe Slug-Based Team URLs

### Overview
Add human-readable slugs to team URLs (e.g., `/teams/came-from-dicks` instead of `/teams/af3bf12d-...`) without touching the critical `useTeamDetails` hook. A new resolver hook handles slug-to-UUID conversion, and the existing data-fetching logic stays exactly as-is.

### Architecture

```text
URL param (slug or UUID)
        |
  useResolveTeamSlug()     <-- NEW: resolves to UUID
        |
  resolved UUID
        |
  useTeamDetails(uuid)     <-- UNTOUCHED
  useTeamMatches(uuid)     <-- UNTOUCHED
```

### Files to Create

**1. `src/utils/teamSlug.ts`** -- Pure utility functions
- `toTeamSlug(name: string): string` -- converts a team name to a URL-safe slug
  - Lowercase, spaces to hyphens, strip apostrophes/ampersands/special chars, collapse multiple hyphens, trim
  - Examples: `"Came from Dicks"` -> `"came-from-dicks"`, `"Baggin' & Braggin'"` -> `"baggin-braggin"`
- `isUUID(str: string): boolean` -- checks if a string matches UUID format (used to decide whether to resolve or pass through)

**2. `src/hooks/useResolveTeamSlug.ts`** -- New resolver hook
- Takes the raw URL param (could be UUID or slug)
- If it looks like a UUID, returns it immediately (no extra queries)
- If it looks like a slug, uses the already-cached `useTeamsQuery` data to find the matching team by computing `toTeamSlug(team.name)` against the param
- Returns `{ teamId: string | undefined, isResolving: boolean }`
- Uses the existing teams cache (5-minute stale time), so no extra network requests in most cases

### Files to Modify

**3. `src/pages/TeamDetails.tsx`** -- Single integration point
- Import `useResolveTeamSlug`
- Replace `const { teamId } = useParams()` usage:
  ```
  const { teamId: teamParam } = useParams();
  const { teamId, isResolving } = useResolveTeamSlug(teamParam);
  ```
- Pass `teamId` (resolved UUID) to `useTeamDetails`, `useTeamMatches`, and ranking lookups as before
- Add `isResolving` to the loading state check
- Everything else in the page stays identical

**4. ~20 component files** -- Update links to use slugs
All files that currently link to `/teams/${teamId}` need updating to `/teams/${toTeamSlug(teamName)}`. Each file already has access to both the team ID and name. Key files:

| File | Context |
|------|---------|
| `TeamCardGrid.tsx` | Team cards on Teams page |
| `TeamCardList.tsx` | List view of teams |
| `MatchCard.tsx` | Match history cards |
| `TeamGameScoreRow.tsx` | Score display rows |
| `RankingTableRow.tsx` | Rankings table |
| `RankingCard.tsx` | Rankings cards |
| `TeamOfTheWeekCard.tsx` | Home page card |
| `TeamCardCompact.tsx` | Compact team cards |
| `TeamLogo.tsx` (ui/team) | Clickable team logos |
| `TeamImage.tsx` | Clickable team images |
| `TeamLogo.tsx` (stats/rank) | Rankings logos |
| `CompactStandings.tsx` | Standings widget |
| `CareerRankingsDesktopView.tsx` | Career stats table |
| `CareerRankingsMobileView.tsx` | Career stats mobile |
| `AllTeamsCareerPowerScoreChart.tsx` | Chart tooltips/legend |
| `TimeslotGrouping.tsx` | Schedule groupings |
| `HeadToHeadRecords.tsx` | H2H section |
| `RivalryHighlights.tsx` | Rivalry section |
| `ScheduleMatchRow.tsx` | Schedule rows |
| `UserMenu.tsx` | User's team link |

For components that only have `teamId` (UUID) and no team name available, they will need the team name passed in or looked up. Most already have it.

### What Stays Untouched
- `useTeamDetails.ts` -- zero changes
- `useTeamMatches.ts` -- zero changes
- `useTeamRankings.ts` -- zero changes
- `App.tsx` route definition -- `/teams/:teamId` stays the same, it just accepts slugs now
- Database schema -- no migrations needed

### Backward Compatibility
- UUID URLs continue to work (the resolver detects UUID format and passes through)
- Any bookmarked or shared UUID links will still load correctly

### Edge Cases
- If a slug doesn't match any team, `useResolveTeamSlug` returns `undefined`, and the existing "Team Not Found" UI in TeamDetails handles it
- Team name changes would change the slug, but since we resolve client-side from cached data, it always uses the current name


Add JSON-LD structured data across the SEO-facing league pages using the existing `SeoHead` component (which already supports a `jsonLd` prop rendered via `react-helmet-async`).

**1. `src/pages/TeamDetails.tsx`** — currently has no `<Helmet>`. Add `SeoHead` with per-team metadata plus `SportsTeam` JSON-LD:
- `@type: SportsTeam`, `name`, `sport: 'Cornhole'`, `url` (`/teams/{teamParam}`), `logo` (`team.logoUrl` or `imageUrl` if absolute), `memberOf: { @type: SportsOrganization, name: '717REC' }`, `athlete: team.players?.map(name => ({ @type: 'Person', name }))`.
- Title: `${team.name} | 717REC Cornhole League`. Description mentions record and division.
- Only render `SeoHead` after `team` resolves (skip during loading state).

**2. `src/pages/Schedule.tsx`** — add `ItemList` of upcoming matches to existing `SeoHead`:
- `@type: ItemList`, `itemListElement`: first ~20 upcoming matches as `SportsEvent` with `name` ("Team A vs Team B"), `startDate` (match.date), `location` (match.location), `homeTeam`/`awayTeam` as `SportsTeam { name }`, `sport: 'Cornhole'`, `eventStatus` mapped from `status` (postponed/canceled → EventPostponed/EventCancelled, otherwise EventScheduled).

**3. `src/pages/Stats.tsx`** — augment existing `CollectionPage` LD with an `ItemList` of the current rankings (top 20) using `useTeamRankings`:
- `mainEntity`: `{ @type: ItemList, itemListElement: [{ @type: ListItem, position, name: teamName, url: /teams/{slug or id} }] }`. Since `Stats` doesn't currently call `useTeamRankings`, use the existing `latestMatches` + `useRankingsData` context — actually simpler: import `useTeamRankings()` (no args, uses cached teams/matches internally) inside Stats and pass results into the LD.

**4. `src/pages/TeamsPage.tsx`** — extend the current `SportsOrganization` LD to also include an `ItemList` of every team (pass an array of LD objects). Fetch via `useTeamsQuery()`.

No new dependencies. No component API changes beyond `SeoHead` already accepting `Record<string, unknown> | Record<string, unknown>[]`. Existing tests for these pages mock `SeoHead` indirectly through Helmet; will verify with a quick build/test pass after the edits.
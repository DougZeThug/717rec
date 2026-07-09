## Match Recap: richer summary + schedule-page popup

Turn the completed-match view into a scannable "event recap" and make it pop up (dialog) directly from the Schedule page for live-scored matches. Non-live-scored completed matches keep their current card behavior (no dialog).

### Scope

- Only live-scored completed matches get the recap dialog. The existing "View match recap" CTA on `MatchCard` already appears only when `liveScoredMatchIds.has(match.id)` — we swap that link for a dialog trigger.
- The same recap content is rendered at the top of the existing full-page `CompletedMatchReview` (`/matches/:id/live` after finalization), so both surfaces stay in sync.

### Recap content (new)

- **Winner headline** — `Team A beat Team B, 2–1` (keeps existing trophy block).
- **Top Performer** — highest PPR among players with ≥2 rounds; show `Name — X.X PPR, YY% hole rate` (hole rate only if bag data exists).
- **Most Consistent** — lowest off-board rate among players with ≥4 bag-tracked bags; show `Name — YY% off-board rate`. Hidden if no bag data.
- **Key Game** — the game with the smallest final margin; show `Game N, Winner won A–B`. Falls back to Game 1 if only one game.
- **Round Stats** — per team:
  - Team totals line: `Team: X in, Y on, Z off` (from bag-tracked rounds only)
  - Per-player rows attributed to that team: `Name — X.X PPR · YY% in · YY% on` (bag percents omitted when player has no bag data)

All percentages/PPR reuse existing `pointsPerRound`, `percentage`, `formatPercent`, `formatRatio` helpers — no fake 0% when data is missing.

### Files

New:
- `src/utils/liveScoring/matchRecap.ts` — pure `computeMatchRecap({ rounds, games, playerNames, team1Id, team2Id, team1Name, team2Name })` returning `{ topPerformer, mostConsistent, keyGame, teams: [{ name, side, bagTotals, players[] }] }`. Player-to-team attribution comes from `team_players` data already available in `useLiveMatch` (passed in as a `Record<playerId, teamSide>` map).
- `src/components/live-scoring/MatchRecapSummary.tsx` — presentational component that renders the four sections from the helper output. Empty sections are omitted.
- `src/components/live-scoring/MatchRecapDialog.tsx` — shadcn `Dialog` wrapper. Uses `useLiveMatch(matchId)` internally, enabled only when open. Loading skeleton while fetching; content = `MatchRecapSummary` + a footer link `Open full recap →` to `/matches/:id/live` for the deep view (round-by-round log, admin reopen).
- Tests:
  - `src/utils/liveScoring/__tests__/matchRecap.test.ts` — top performer selection & tie-break, most-consistent min-bag gate, key-game closest-margin pick, team totals sum only bag-tracked rounds, per-player attribution.
  - `src/components/live-scoring/__tests__/MatchRecapSummary.test.tsx` — renders each section from a fixture; hides Most Consistent when no bag data.
  - `src/components/live-scoring/__tests__/MatchRecapDialog.test.tsx` — closed by default, opens on trigger, shows loading then content, "Open full recap" link points at `/matches/:id/live`. Mocks `useLiveMatch`.

Edited:
- `src/components/live-scoring/CompletedMatchReview.tsx` — insert `<MatchRecapSummary />` under the trophy header (before Games list). Existing Games / Player stats table / Round-by-round / Reopen sections unchanged.
- `src/components/schedule/MatchCard.tsx` — replace the `TransitionLink` "View match recap" (lines 262–274) with a `<MatchRecapDialog matchId={match.id} team1Name team2Name />` trigger button (same visual style).
- `src/components/live-scoring/__tests__/CompletedMatchReview.test.tsx` — add one assertion that a recap section (e.g. "Top Performer") renders when bag data is present.
- `src/components/schedule/__tests__/MatchCard.test.tsx` — replace the link assertion with a dialog-open assertion for live-scored completed matches.

### Out of scope

- No schema/service changes — all data comes from `match_rounds` + `games` already fetched by `useLiveMatch`.
- No changes to non-live-scored completed matches (they never showed the CTA to begin with).
- No new "Big rounds" stat.
- No changes to admin corrections or reopen flow.

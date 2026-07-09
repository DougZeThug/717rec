## Goal

Make the completed-match review (game scores, per-player PPR/bag stats, round-by-round history) reachable in one tap from any completed match card on the schedule.

## What exists today

- `/matches/:matchId/live` already renders `CompletedMatchReview` automatically once a match is officially completed (`LiveMatchView` branches on `match.iscompleted`).
- Schedule `MatchCard` shows a "Live score this match" CTA only for **upcoming** matches. Completed cards have no link into the review.
- `CompletedMatchReview` currently shows: final score card, per-game totals, and a per-player stats table (PPR, Hole%, Board%, 4B). It does **not** yet show the round-by-round log — that's only rendered in the in-progress/decided views via `RoundLog`.

## Changes

### 1. Add "View match recap" CTA on completed schedule cards

In `src/components/schedule/MatchCard.tsx`, mirror the existing "Live score this match" block for the completed case:

- When `isCompleted && !hasSpecialStatus`, render a `TransitionLink` to `/matches/${match.id}/live` styled as a secondary CTA (muted background, `Trophy` or `ClipboardList` icon, label "View match recap").
- Placed in the same slot as the current live-scoring CTA (just below the H2H / prediction area, above the admin actions).
- No permission gating — the recap page is already public-readable; anyone who can see the card can open the recap.

### 2. Add round-by-round history to the recap page

In `src/components/live-scoring/CompletedMatchReview.tsx`:

- Add a new "Round-by-round" section beneath the existing Player-stats card that reuses the existing `RoundLog` component (`src/components/live-scoring/RoundLog.tsx`) so the presentation matches the in-progress view exactly.
- Pass `rounds`, `team1Name`, `team2Name`, and `playerNames` (all already props of `CompletedMatchReview`).
- If `games.length > 1`, group rounds by game (one `RoundLog` per game with a small "Game N" subheading) so the reader can see the flow of each game separately. If there's only one game, render a single log.

No other files need to change — `LiveMatchView` already forwards the correct props, and `/matches/:matchId/live` route + `LiveScoring.tsx` page already handle the completed case.

### Technical notes

- No service, hook, or DB changes.
- No new dependencies.
- Round grouping in `CompletedMatchReview` is a pure client-side filter (`rounds.filter(r => r.game_id === g.game.id)`); `games` already contains its own sorted `rounds` array on `LiveGameDerived`, which we can use directly to avoid re-filtering.
- The CTA is safe to always show for completed matches — if a match was completed the old way (no live-scored rounds), the recap page still renders a valid final-score card and simply omits the empty sections.

## Out of scope

- No changes to the playoff `PlayoffMatchCard` (user asked about schedule/match card).
- No changes to team-page "Player Stats" visibility (separate open question).
- No new leaderboard or navigation entries elsewhere.
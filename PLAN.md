# Implementation Plan: Enhanced Team Stats for Engagement

## Overview
This plan covers 4 feature areas that build on existing data with no schema changes required. Each feature adds new calculation utilities, hooks, and UI components.

---

## Feature 1: Match Outcome Context

### What it adds
- **Comeback wins** — matches where a team won the series 2-1 (dropped a game but came back to win)
- **Clutch record** — W-L record in decisive game 3s (matches that went to a 3rd game)

### Data source
Matches table already stores `team1_game_wins`, `team2_game_wins`, `winner_id`, `loser_id`. A match that went to game 3 is any completed match where `team1_game_wins + team2_game_wins === 3`. A comeback win is when the team won 2-1 (since losing game 1 and winning games 2+3 is the only path to a 2-1 win after being down 0-1).

> **Note:** We don't have individual game sequence data (game 1 result, game 2 result, etc.), only totals (`team1_game_wins`, `team2_game_wins`). A "comeback win" as defined here is any 2-1 match win — the team won 2 games and lost 1. In a best-of-3, any 2-1 win means the team lost one game and came back to win the series, so this is a reasonable proxy. We cannot distinguish the exact sequence (lost game 1 vs. lost game 2).

### New files
1. **`src/utils/teamDetailsUtils/matchOutcomeUtils.ts`** — Pure calculation functions:
   - `calculateMatchOutcomeStats(teamId, matches)` → returns `{ comebackWins, comebackLosses, clutchWins, clutchLosses, game3Matches }`
   - A "comeback win" = team won the match 2-1 (they dropped a game but still won the series)
   - A "clutch win" = team won a match that went to game 3
   - A "clutch loss" = team lost a match that went to game 3

### Modified files
2. **`src/components/teams/StatBreakdown.tsx`** — Add to the **Game tab** (where close match losses and sweep rate already live):
   - "Comeback Wins" stat with count and rate (e.g., "3 of 8 wins were comebacks")
   - "Clutch Record" stat showing game-3 W-L (e.g., "4-2 in Game 3s")
   - These fit naturally alongside the existing "Close Match Losses" and "Sweep Rate" stats

3. **`src/pages/TeamDetails.tsx`** — Pass the new stats down through the existing data flow. The `useTeamDetails` hook already fetches matches for the team, so we calculate the new stats from the same match data.

### Where it displays
- **Team Detail Page → StatBreakdown → Game tab** — This is the natural home. The Game tab already shows close match losses and sweep rate. Comeback wins and clutch record are the same category of "how does this team win/lose."

---

## Feature 2: Momentum / Form Metrics

### What it adds
- **Recent form (Last 5/10)** — Rolling W-L record as a queryable/sortable stat, not just the visual dots in TeamTrend
- **Power score velocity** — Rate of power score change over recent weeks (e.g., "+8.3 in 3 weeks")

### Data source
- Recent form: calculated from matches table (same data TeamTrend already uses, but as a numeric stat)
- Power score velocity: calculated from `power_score_snapshots` table (weekly snapshots already exist)

### New files
1. **`src/utils/teamDetailsUtils/momentumUtils.ts`** — Pure calculation functions:
   - `calculateRecentForm(teamId, matches, window?)` → returns `{ recentWins, recentLosses, recentWinPct, formString }` for last N matches (default 5)
   - `calculatePowerScoreVelocity(snapshots, weeks?)` → returns `{ delta, weeksTracked, weeklyRate, direction }` showing power score change over recent N weeks

2. **`src/hooks/useTeamMomentum.ts`** — Hook that combines:
   - Recent form from current season matches
   - Power score velocity from snapshots
   - Returns a `TeamMomentum` object

### Modified files
3. **`src/components/teams/StatBreakdown.tsx`** — Add a new **"Form" tab** (4th tab alongside Core, Game, Advanced):
   - Recent Form: "Last 5: 4-1 (80%)" with the W/L dot indicators (reuse TeamTrend visual style)
   - Power Score Velocity: "+6.2 over 3 weeks" or "-3.1 over 3 weeks" with trend arrow
   - Current streak is already shown on the rankings table but not on the team detail page stat breakdown — this tab would also surface the streak

4. **`src/components/stats/RankingsTable.tsx`** (specifically `RankingTableRow`) — Add a "Form" column showing last-5 record as a compact indicator (e.g., "4-1") color-coded. This makes form a sortable, comparable stat across teams in the standings.

5. **`src/hooks/useWeeklyPowerScoreTrends.ts`** — Potentially extend to expose velocity data, or the new `useTeamMomentum` hook can query snapshots directly.

### Where it displays
- **Team Detail Page → StatBreakdown → new "Form" tab** — Dedicated tab for momentum/form metrics. Keeps the Core/Game/Advanced tabs from getting cluttered.
- **Stats Page → Rankings Table** — A new "Form" column (compact, like "4-1") so users can sort/compare team form league-wide. This is the "rankable stat" version the brief asks for.

---

## Feature 3: Head-to-Head Rivalries

### What it adds
- **Most-played opponents** — Top N opponents by total matches across all seasons
- **Closest rivalries** — Opponents with near-.500 records (e.g., 4-5 lifetime)
- **Dominant matchups** — Opponents the team has never lost to, or always lost to
- **Matchup preview on schedule** — When two teams are about to play, surface their rivalry context

### Data source
- `v_head_to_head` view and `get_head_to_head_records` RPC already return all the data needed
- The existing `HeadToHeadRecords` component on team detail pages already displays H2H data — we just need to classify and highlight certain records

### New files
1. **`src/utils/teamDetailsUtils/rivalryUtils.ts`** — Pure classification functions:
   - `classifyRivalries(h2hRecords)` → returns `{ mostPlayed, closestRivalries, dominantMatchups, nemeses }`
   - Most played: sorted by `matches_played` desc, top 3
   - Closest: records where `|wins - losses| <= 1` and `matches_played >= 3`
   - Dominant: records where `wins > 0 && losses === 0` and `matches_played >= 2`
   - Nemeses: records where `wins === 0 && losses > 0` and `matches_played >= 2`

2. **`src/components/teams/RivalryHighlights.tsx`** — A compact card/section showing:
   - "Top Rival" — closest rivalry opponent with record
   - "Dominated" — team they always beat
   - "Nemesis" — team they can't beat
   - Each with opponent logo, name, and record

### Modified files
3. **`src/components/stats/HeadToHeadRecords.tsx`** — Add rivalry badges/tags to rows:
   - "Rival" badge on closest-rivalry opponents
   - "Dominated" badge on perfect-record opponents
   - "Nemesis" badge on unbeaten opponents
   - These are visual enhancements to the existing table

4. **`src/components/schedule/MatchCard.tsx`** — Enhance the existing `MatchHeadToHead` line for upcoming matches:
   - When teams have a notable rivalry (close record, unbeaten, etc.), show a "Rivalry Match" tag or contextual text like "Nemesis matchup: Team A is 0-4 all-time vs Team B"
   - This builds on the existing `MatchHeadToHead` component which already shows H2H record on schedule cards

5. **`src/components/schedule/MatchHeadToHead.tsx`** — Extend to accept rivalry classification and display contextual labels

### Where it displays
- **Team Detail Page → new "Rivalry Highlights" section** — Positioned above the full Head-to-Head Records table. A compact 2-3 card layout showing the most interesting H2H narratives at a glance, before the user digs into the full table.
- **Team Detail Page → HeadToHeadRecords table** — Existing table gets rivalry badges on relevant rows.
- **Schedule Page → MatchCard (upcoming matches)** — Enhanced H2H line shows rivalry context when it exists, giving upcoming matches more narrative weight.

---

## Feature 4: Playoff / Postseason Narrative Stats

### What it adds
- **Seed vs. finish** — Did a team over/underperform their playoff seed? A #6 seed finishing #2 is a Cinderella story.
- **Playoff consistency** — How often does a team make playoffs across seasons? "Made playoffs in 8 of 10 seasons."

### Data source
- Seed data: `team_season_stats` table stores `playoff_rank` (finish position). Seed data may need to come from the brackets/participants data or be derived from regular season final standings.
- Playoff consistency: `team_season_stats` stores `playoff_rank` per season — if non-null, the team made playoffs that season.
- Season count: number of entries in `team_season_stats` for that team.

### New files
1. **`src/utils/career/calculatePlayoffNarratives.ts`** — Pure calculation functions:
   - `calculatePlayoffConsistency(seasonStats)` → returns `{ seasonsPlayed, seasonsInPlayoffs, playoffRate, playoffAppearances[] }`
   - `calculateSeedPerformance(seasonStats)` → returns array of `{ seasonName, seed, finish, differential, label }` where label is "Cinderella" (big overperformance), "Expected" (close to seed), or "Underperformed"
   - Seed data: if available in `team_season_stats` (e.g., a `seed` or `regular_season_rank` field), use it. If not, we can derive it from the final regular season standings rank.

### Modified files
2. **`src/components/teams/TeamAdvancedStatsSection.tsx`** — Enhance the **Insights tab**:
   - Add "Playoff Consistency" card: "Made playoffs in X of Y seasons (Z%)"
   - Add "Seed vs. Finish" highlights: Show the most notable over/underperformances with labels like "Cinderella run" or "Upset exit"
   - These fit alongside the existing "Best Season", "Strongest Against", and "Championship History" cards

3. **`src/components/teams/TeamTotals.tsx`** — Add "Playoff Consistency" stat alongside existing Championships and Runner-ups:
   - "Playoff Rate: 8/10 seasons (80%)" — compact display in the career stats grid

4. **`src/utils/career/types.ts`** — Extend `TeamTotals` type with:
   - `playoff_consistency: { seasonsPlayed: number, seasonsInPlayoffs: number, playoffRate: number }`

5. **`src/hooks/career/useTeamTotalsComputed.ts`** — Wire in the new playoff narrative calculations

### Where it displays
- **Team Detail Page → Career Statistics section (TeamTotals)** — Playoff consistency stat in the career stats grid, alongside championships and runner-ups.
- **Team Detail Page → Advanced Stats → Insights tab** — Seed vs. finish narratives and playoff consistency card. This is the storytelling home — the Insights tab is already designed for narrative stats like "Best Season."
- **Team Detail Page → Advanced Stats → Season-by-Season tab** — The existing playoff column could show seed→finish (e.g., "Seed #5 → Finished #2") instead of just the finish rank.

---

## Implementation Order

The features are listed in dependency order (least to most dependent on other features):

1. **Feature 1: Match Outcome Context** — Standalone, touches only team detail page
2. **Feature 4: Playoff Narratives** — Standalone, extends existing career stats
3. **Feature 2: Momentum / Form** — Touches both team detail and rankings table
4. **Feature 3: Head-to-Head Rivalries** — Most complex, touches team detail + schedule page

Each feature is self-contained and can be shipped independently.

---

## Summary of Files Changed per Feature

| Feature | New Files | Modified Files |
|---------|-----------|----------------|
| 1. Match Outcome | 1 util | StatBreakdown, TeamDetails page |
| 2. Momentum/Form | 1 util, 1 hook | StatBreakdown, RankingsTable |
| 3. H2H Rivalries | 1 util, 1 component | HeadToHeadRecords, MatchCard, MatchHeadToHead |
| 4. Playoff Narratives | 1 util | TeamAdvancedStatsSection, TeamTotals, career types, useTeamTotalsComputed |

**Total: ~4 new files, ~10 modified files. No database schema changes.**

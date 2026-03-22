

## Fix: Upset scores should show game wins + stacked mobile layout

### Problem
1. **Wrong score displayed**: The upset `matchResult` shows `team1_score–team2_score` (which is `1–0` for match win/loss), not the actual game wins like `2–1` or `2–0`.
2. **Layout wraps inconsistently on mobile**: Long team names cause the horizontal layout to break awkwardly. Should stack vertically for consistency.

### Changes

**File: `src/services/WeeklyRecapService.ts`**
- Add `team1_game_wins, team2_game_wins` to the match select query (line ~129)
- Change `matchResult` construction to use game wins instead of match scores:
  ```
  winnerGameWins = isWinnerTeam1 ? match.team1_game_wins : match.team2_game_wins
  loserGameWins  = isWinnerTeam1 ? match.team2_game_wins : match.team1_game_wins
  matchResult = `${winnerGameWins}–${loserGameWins}`
  ```

**File: `src/components/home/WeeklyRecapCard.tsx`**
- Refactor `UpsetRow` to use a stacked vertical layout:
  - Row 1: Winner logo + name + "def." + Loser logo + name
  - Row 2 (right-aligned): Game score + Upset badge
- Change from `flex-wrap` horizontal to a vertical `flex-col` block so it renders consistently regardless of name length


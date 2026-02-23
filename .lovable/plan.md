

## Fix: Load existing playoff_games when editing a match

### Problem

The `usePlayoffEditMatch` hook fetches match data without joining `playoff_games`, so the editor always initializes with a single default 0-0 game instead of actual historical scores. Saving overwrites the real game data.

### Changes

**File: `src/hooks/playoffs/usePlayoffEditMatch.ts`**

1. Add `playoff_games(*)` to the Supabase select query for the playoff_matches fetch (the UUID branch around line 136)

2. Map the fetched `playoff_games` rows onto the `PlayoffMatch.games` property, sorted by `game_number`

3. For the brackets-manager (integer ID) branch, games are stored differently (via `match_game` table / `child_count`), so no change needed there -- that path already works via the brackets-manager library

### Technical detail

```
// In the UUID branch (~line 136), change the select to:
.select(`
  *,
  bracket:brackets!playoff_matches_bracket_id_fkey(id, uses_brackets_manager),
  playoff_games(*)
`)

// Then when building playoffMatch (~line 178), add:
games: ((matchData as any).playoff_games || [])
  .sort((a: any, b: any) => a.game_number - b.game_number)
  .map((g: any) => ({
    id: g.id,
    matchId: g.match_id,
    gameNumber: g.game_number,
    team1Score: g.team1_score,
    team2Score: g.team2_score,
    winnerId: g.winner_id,
  })),
```

This ensures `useMatchScoreState` receives the real games array and initializes the editor with actual scores instead of the fallback default.

### Scope

Only `src/hooks/playoffs/usePlayoffEditMatch.ts` is modified. No other files need changes -- `useMatchScoreState` already handles the `match.games` array correctly when it's populated.


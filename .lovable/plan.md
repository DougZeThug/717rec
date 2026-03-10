

## Fix: Non-atomic pending match approval and tie operations

### Problem
`approveMutation` and `tieMutation` in `usePendingMatches.ts` perform multiple independent database writes (match update + team stats) without transactional atomicity. Partial failures corrupt standings, and retries double-count or double-subtract stats.

### Solution
Create two new PostgreSQL RPC functions that wrap both operations in a single transaction, then call them from the hook instead of the current multi-step approach.

### Database changes (2 new RPC functions)

**1. `approve_match_result(p_match_id, p_winner_id, p_loser_id, p_winner_game_wins, p_loser_game_wins)`**
- Updates matches SET winner_id, loser_id WHERE id = p_match_id AND winner_id IS NULL (idempotency guard)
- If row was updated (not already approved), calls the existing `update_team_stats` logic inline
- Returns boolean indicating whether the operation was applied

**2. `mark_match_as_tie(p_match_id)`**
- Fetches current match state within the transaction
- If match has winner_id/loser_id, reverses stats (same logic as `reverse_team_stats`)
- Updates matches SET winner_id = NULL, loser_id = NULL
- Idempotent: if already a tie (no winner), skips stat reversal
- Calls `upsert_team_season_stats()` at the end

Both functions use `SECURITY DEFINER` with explicit `search_path` (consistent with existing RPCs like `update_team_stats`).

### Code changes

**`src/hooks/usePendingMatches.ts`**
- `approveMutation`: Replace `approveMatch()` + `applyMatchResult()` with single `supabase.rpc('approve_match_result', {...})` call
- `tieMutation`: Replace `fetchMatchForTie()` + `reverseTeamStats()` + `upsertTeamSeasonStats()` + `setMatchAsTie()` with single `supabase.rpc('mark_match_as_tie', {...})` call
- Remove unused imports (`approveMatch`, `reverseTeamStats`, `setMatchAsTie`, `upsertTeamSeasonStats`, `fetchMatchForTie`, `applyMatchResult`)

**`src/services/matches/MatchWriteService.ts`** — No changes needed (existing functions stay for other callers).

### Migration SQL sketch

```sql
CREATE OR REPLACE FUNCTION approve_match_result(
  p_match_id uuid,
  p_winner_id uuid,
  p_loser_id uuid,
  p_winner_game_wins integer,
  p_loser_game_wins integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rows_affected integer;
BEGIN
  -- Idempotent: only update if not already approved
  UPDATE matches
  SET winner_id = p_winner_id, loser_id = p_loser_id
  WHERE id = p_match_id AND winner_id IS NULL;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RETURN false; -- already approved or not found
  END IF;

  -- Apply team stats atomically (same logic as update_team_stats)
  PERFORM update_team_stats(p_winner_id, p_loser_id, p_winner_game_wins, p_loser_game_wins);

  -- Refresh season stats
  PERFORM upsert_team_season_stats();

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION mark_match_as_tie(p_match_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_winner_id uuid;
  v_loser_id uuid;
  v_winner_game_wins integer;
  v_loser_game_wins integer;
  v_team1_id uuid;
BEGIN
  -- Lock the row and get current state
  SELECT winner_id, loser_id, team1_id, team1_game_wins, team2_game_wins
  INTO v_winner_id, v_loser_id, v_team1_id, v_winner_game_wins, v_loser_game_wins
  FROM matches WHERE id = p_match_id FOR UPDATE;

  -- Already a tie
  IF v_winner_id IS NULL THEN
    RETURN false;
  END IF;

  -- Calculate correct game wins based on who was winner
  IF v_winner_id = v_team1_id THEN
    -- winner was team1, so winner_game_wins = team1_game_wins, loser = team2
    PERFORM reverse_team_stats(v_winner_id, v_loser_id, v_winner_game_wins, v_loser_game_wins);
  ELSE
    -- winner was team2, so swap
    PERFORM reverse_team_stats(v_winner_id, v_loser_id, v_loser_game_wins, v_winner_game_wins);
  END IF;

  -- Clear winner/loser
  UPDATE matches SET winner_id = NULL, loser_id = NULL WHERE id = p_match_id;

  -- Refresh season stats
  PERFORM upsert_team_season_stats();

  RETURN true;
END;
$$;
```

### Hook changes (simplified)

```typescript
// approveMutation
mutationFn: async ({ match, winnerTeamIndex }) => {
  const winnerId = winnerTeamIndex === 1 ? match.team1Id : match.team2Id;
  const loserId = winnerTeamIndex === 1 ? match.team2Id : match.team1Id;
  const winnerGameWins = winnerTeamIndex === 1 ? match.team1_game_wins || 0 : match.team2_game_wins || 0;
  const loserGameWins = winnerTeamIndex === 1 ? match.team2_game_wins || 0 : match.team1_game_wins || 0;

  const { error } = await supabase.rpc('approve_match_result', {
    p_match_id: match.id,
    p_winner_id: winnerId,
    p_loser_id: loserId,
    p_winner_game_wins: winnerGameWins,
    p_loser_game_wins: loserGameWins,
  });
  if (error) throw error;
}

// tieMutation
mutationFn: async (matchId) => {
  const { error } = await supabase.rpc('mark_match_as_tie', { p_match_id: matchId });
  if (error) throw error;
}
```


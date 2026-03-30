

## Fix: Season-Scoped Power Score Snapshots

### Problem
The `capture-power-snapshots` edge function reads from `v_team_details`, which aggregates **all** completed matches regardless of season. Snapshots are then labeled with the active season's ID, making them unreliable if matches from prior seasons exist in the `matches` table.

### Approach
Create a new database function `get_season_team_power_scores(p_season_id uuid)` that mirrors the `v_team_details` power score formula but filters matches by `m.season_id = p_season_id`. Then update the edge function to call this RPC instead of querying the view.

### Changes

**1. New SQL migration — `get_season_team_power_scores` function**

A `SECURITY DEFINER` function that accepts a season UUID and returns one row per team with: `team_id`, `power_score`, `sos`, `wins`, `losses`, `game_wins`, `game_losses`, `division_id`.

The query is structurally identical to the `v_team_details` view (same 40/45/15 weighted formula), but every `LEFT JOIN matches m` clause adds `AND m.season_id = p_season_id` so only that season's completed matches contribute.

**2. Edge function update — `capture-power-snapshots/index.ts`**

Replace:
```typescript
const { data: teams } = await supabase
  .from('v_team_details')
  .select('team_id, power_score, sos, wins, losses, game_wins, game_losses, division_id')
  .not('power_score', 'is', null);
```

With:
```typescript
const { data: teams } = await supabase
  .rpc('get_season_team_power_scores', { p_season_id: activeSeason.id });
```

The RPC already filters out teams with NULL power scores (no matches that season), so the `.not()` filter is no longer needed.

No other files change — the snapshot insert logic and all downstream consumers (`RankingSnapshotService`, `PowerScoreTrendsCard`, etc.) remain the same since they already filter by `season_id`.

### Technical detail

The function uses `RETURNS TABLE(...)` so the Supabase client returns it as an array of objects, matching the current shape. The formula inside replicates:
- 40% weighted match win %
- 45% SOS (avg opponent division weight)
- 15% weighted game win %

All filtered to `m.season_id = p_season_id AND m.iscompleted = true`.


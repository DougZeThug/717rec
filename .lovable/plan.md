## Fix MCP standings/teams tools querying non-existent columns

Confirmed against the live database: `team_season_stats` has `season_id, team_id, match_wins, match_losses, game_wins, game_losses, sos, power_score, recorded_at, playoff_rank, champion, runner_up, division_name`. There is no `wins`, `losses`, `ties`, `team_name`, or `current_rank`. A foreign key `team_season_stats.team_id -> teams(id)` exists, so PostgREST can embed `teams(name)`.

### Changes

1. `src/lib/mcp/tools/get-standings.ts`
   - Select `team_id, division_name, match_wins, match_losses, game_wins, game_losses, power_score, playoff_rank, teams(name)`.
   - Drop `ties` entirely.
   - Order by `power_score` descending (nulls last) instead of the non-existent `current_rank`, and return a derived `rank` position in the flattened output; keep `playoff_rank` as its own field.
   - Flatten the embedded `teams.name` into `team_name` so the tool's JSON output shape stays friendly for the assistant.

2. `src/lib/mcp/tools/list-teams.ts`
   - Select `team_id, division_name, match_wins, match_losses, power_score, teams(name)`; flatten to `team_name`. Keep the existing division filter and power-score ordering.

3. Regenerate the MCP manifest and redeploy the `mcp` edge function, since `supabase/functions/mcp/index.ts` is generated from these source files and the live endpoint only updates on deploy.

### Verification

Query the same shapes directly against the database to confirm they return rows, then confirm the manifest extraction and deploy both succeed.

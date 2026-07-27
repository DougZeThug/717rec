# Fix MCP tools querying non-existent columns

## Problem (verified)

The `matches` table has columns `date`, `iscompleted`, `team1_id`, `team2_id` — **not** `match_date`, `is_completed`, `team1_name`, `team2_name`, or `division_name`. The `teams` table has `division_id` and no `power_score` (power score lives on `team_season_stats`). Four MCP tool files under `src/lib/mcp/tools/` still query the wrong columns, so their first PostgREST call returns error `42703`.

## Files to change

1. `src/lib/mcp/tools/get-my-upcoming-matches.ts`
2. `src/lib/mcp/tools/get-my-recent-matches.ts`
3. `src/lib/mcp/tools/get-schedule.ts`
4. `src/lib/mcp/tools/get-my-team.ts`

## Changes

**Match-list tools** (`get-my-upcoming-matches`, `get-my-recent-matches`, `get-schedule`):

- Replace `match_date` → `date` (in `select`, `.order`).
- Replace `is_completed` → `iscompleted` (in `.eq`).
- Remove `team1_name`, `team2_name`, `division_name` from the flat select; add embedded joins:
  ```
  team1:teams!matches_team1_id_fkey(id, name, division:divisions(name)),
  team2:teams!matches_team2_id_fkey(id, name, division:divisions(name))
  ```
- Keep `team1_score`, `team2_score`, `team1_id`, `team2_id` where already selected.
- Keep the `.or('team1_id.eq.X,team2_id.eq.X')` filter — those columns are real.

**`get-my-team.ts`**:

- Change the embedded teams select from `teams(id, name, division_name, wins, losses, power_score)` to `teams(id, name, wins, losses, division:divisions(name))`.
- After resolving `team_id` + active `season_id`, fetch `power_score` and `division_name` from `team_season_stats` in a second query (already the source of truth used by `get-standings`) and merge into the returned payload.

## Verification

- No DB migration needed — read-only tool code fix.
- After edits: run `app_mcp_server--extract_mcp_manifest` to confirm the entry still bundles, then deploy the `mcp` edge function so live clients pick up the fix.
- Optional smoke: `curl` each tool via the MCP endpoint with a valid bearer token and confirm no `42703` error.

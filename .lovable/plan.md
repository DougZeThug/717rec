## Plan: Apply live-scoring migration

Execute the pre-written SQL at `supabase/migrations/20260708120000_live_scoring.sql` (842 lines, idempotent) against the Supabase database exactly as written. No edits, reorders, or "improvements".

### Steps

1. **Run the migration via `supabase--migration`** — pass the file contents verbatim as the `query`. This triggers your approval prompt; on approval it executes and auto-regenerates `src/integrations/supabase/types.ts`.
2. **Verify** with two read-only queries:
   - `select count(*) from team_players;` — confirms roster seeded from `teams.players`.
   - `select * from v_player_season_stats limit 1;` — confirms the view exists.
3. **Report back** with the row counts and confirm the live-scoring page should now load.

### Explicitly NOT doing

- Not modifying the SQL contents.
- Not touching other tables, policies, functions, or data.
- Not deleting the temp shim (`src/services/liveScoring/dbTypes.ts` / `liveDb.ts`) — that's a follow-up you can request separately once you've confirmed the regenerated types look right.
- No frontend changes (the live-scoring page is already wired).

### Notes

- The migration only ADDS objects and fixes the dormant `games` table (deletes rows with no `match_id`, dedupes `(match_id, game_number)` duplicates in that unused table). Existing workflows (admin score entry, standings, playoffs) are untouched.
- Approve the migration when prompted to proceed.

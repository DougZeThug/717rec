## Phase D — Orphan edge function decision

Both `create-bracket` and `update_team_stats` edge functions have **zero call sites** in the frontend:
- `rg "invoke('create-bracket'|'update_team_stats')"` → no matches
- The only `update_team_stats` reference in `src/` is the Postgres RPC call in `TeamStatsService.ts` (which is unrelated and stays)
- Bracket creation in the UI uses the `brackets-manager` library + `BracketsService`, not this edge function

Recommendation: **delete both**. Keeping them means maintaining auth, CORS, tests, and config for code that never runs — pure attack surface for no benefit.

### Steps

1. Delete directories:
   - `supabase/functions/create-bracket/`
   - `supabase/functions/update_team_stats/`
2. Remove their `[functions.create-bracket]` and `[functions.update_team_stats]` blocks from `supabase/config.toml`.
3. Call `supabase--delete_edge_functions(["create-bracket", "update_team_stats"])` to remove the deployed functions.
4. Leave `supabase/functions/_shared/auth.ts` in place — it's still useful for any future admin-gated function (and for `send-support-email` if we later add admin-only ops). Optional: delete it too if we want zero unused code; flag in note.
5. Leave the Postgres `update_team_stats` RPC untouched — it's the real implementation.
6. Verify: `npm run lint`, `npm run typecheck`, `npm test` (no test should reference these edge functions).

### Out of scope

- Touching `capture-power-snapshots` or `send-support-email`
- Any DB migration (RPC stays as-is)
- Frontend changes (none needed)

### Question for you

Keep `supabase/functions/_shared/auth.ts` as a reusable helper for future admin functions, or delete it now since nothing uses it post-cleanup?
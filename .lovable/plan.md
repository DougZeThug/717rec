## Goal

Add the migration `supabase/migrations/20260713120000_harden_security_definer_search_paths.sql` exactly as shown in the pasted diff. It hardens active `SECURITY DEFINER` functions by pinning an explicit `search_path = 'pg_catalog', 'public'`, closing a known Supabase linter warning ("Function Search Path Mutable").

## Why this is safe

- `CREATE OR REPLACE FUNCTION` on the three `get_*_badges` RPCs only changes the function body's schema qualification and adds the `SET search_path` clause. Return shape and semantics are unchanged, so `TeamBadgeService` and `useTeamBadges` keep working.
- `ALTER FUNCTION ... SET search_path` on the six remaining functions changes only their runtime search_path — no logic, signature, or ownership change.
- All targets are existing functions in `public`; no new tables, no RLS changes, no grants needed.

## What to build

1. Create the migration file with the exact SQL from the diff (no edits).
2. Nothing else — no app code, types, or tests change.

## Verification after apply

- Re-run `supabase--linter` and confirm the "Function Search Path Mutable" warnings for these nine functions are gone.
- Smoke: badges still load on a team page (exercises `get_team_badges` / RLS path unaffected since `TeamBadgeService` queries the table directly, but the RPC variants remain callable).

## Risks / notes

- If any of the six `ALTER FUNCTION` targets doesn't exist in the current DB (renamed/dropped in a later migration), the migration will fail. Worth a quick check against the live schema before applying; if any is missing, we drop that specific `ALTER` line. Otherwise apply as-is.

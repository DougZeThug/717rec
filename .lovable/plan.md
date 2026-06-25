## Goal
Clear the Postgres collation version mismatch warning (glibc 2.39 → 2.40) without changing app behavior.

## Approach
Run a single Supabase migration with two statements:

1. `REINDEX DATABASE CONCURRENTLY postgres` — rebuilds all indexes using the new collation rules. `CONCURRENTLY` = no table locks, safe for live traffic.
2. `ALTER DATABASE postgres REFRESH COLLATION VERSION` — updates the recorded version 2.39 → 2.40 so the warning stops.

## Why this is safe
- No schema, data, RLS, policies, functions, triggers, or grants change.
- No frontend code changes; `types.ts` regeneration is unnecessary.
- `CONCURRENTLY` avoids blocking queries while indexes rebuild.
- The only possible behavior change is *correcting* any text index that silently drifted — a fix, not a regression. With English-only data (usernames, team names), observable change is extremely unlikely.

## Caveats
- `REINDEX … CONCURRENTLY` is slower (several minutes on your DB) but non-blocking.
- If Supabase's migration runner rejects `ALTER DATABASE … REFRESH COLLATION VERSION` (the global rule only blocks settings changes, not this maintenance command, but tooling sometimes pattern-matches `ALTER DATABASE`), the fallback is to run that one line manually in the Supabase SQL Editor. The REINDEX is the part that actually matters; the REFRESH is just metadata.

## Verification
- Warning disappears from new Postgres logs.
- App continues to load `/schedule`, standings, rankings normally.

## Rollback
Not applicable — REINDEX produces logically identical indexes; there is nothing to undo.

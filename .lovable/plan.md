## Root cause

The `archive_season()` Postgres function has this statement in Step 5b (reset teams stats):

```sql
UPDATE public.teams
SET wins = 0, losses = 0, game_wins = 0, game_losses = 0;
```

No `WHERE` clause. Supabase's safety guard rejects bare `UPDATE` statements with "UPDATE requires a WHERE clause", which is why archiving fails for every season.

## Fix

Migration to `CREATE OR REPLACE FUNCTION public.archive_season(...)` with the exact same body as today, except that one line becomes:

```sql
UPDATE public.teams
SET wins = 0, losses = 0, game_wins = 0, game_losses = 0
WHERE id IS NOT NULL;
```

(`WHERE id IS NOT NULL` satisfies the guard while keeping the original intent of resetting every team. `id` is the primary key so it's never null.)

No other changes to the function and no app/frontend changes.

## Verify

After the migration, you re-try archiving Spring 2026 from the admin UI (with champion / runner-up / third-place selected). It should succeed; standings + champions then appear on `/history`.

Reply **"go"** and I'll ship the migration.

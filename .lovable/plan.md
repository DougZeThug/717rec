
## Plan: Fix "UPDATE requires a WHERE clause" when partial-archiving a season

### What's broken

When you click **Archive Season → Keep playoffs active** in admin, it errors out with:

> DatabaseError: Failed to partially archive season: UPDATE requires a WHERE clause

### Root cause

The Postgres function `partial_archive_season` runs this statement to reset every team's win/loss counters for the next season:

```sql
UPDATE public.teams
SET wins = 0, losses = 0, game_wins = 0, game_losses = 0;
```

Postgres now rejects unqualified `UPDATE`s on this database (a safety setting that blocks accidental table-wide updates). The companion `archive_season` function does not have this problem — every UPDATE there is already scoped with `WHERE season_id = …`.

The intent of the statement is genuinely "reset all teams" (counters apply league-wide, not per season), so the fix is to add a WHERE clause that's explicit about the bulk reset rather than narrowing the scope.

### The fix (one migration, no app code changes)

Recreate `partial_archive_season` with a single line changed:

```sql
UPDATE public.teams
SET wins = 0, losses = 0, game_wins = 0, game_losses = 0
WHERE id IS NOT NULL;   -- explicit WHERE satisfies safe-update mode; still resets every team
```

Everything else in the function stays identical. No frontend, hook, or service changes are needed — `SeasonService.partialArchiveSeason` and `useSeasonMutations.partialArchiveSeason` already invalidate the right caches once the RPC succeeds.

### Verification steps after the fix

1. As an admin, open a season → **Archive Season** → check **Keep playoffs active** → confirm.
2. Expect a success toast: "…archived; playoffs remain in progress."
3. Verify in the Standings page that team win/loss counters are reset to 0.
4. Verify the playoff bracket for that season is still editable from Season Management.

### Files touched

- New migration: recreate `public.partial_archive_season` with the WHERE clause added.
- No TypeScript / React file changes.

### Rollback

Re-run a migration that restores the previous function body. One step.

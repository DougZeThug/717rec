# Fix the two Supabase security errors

## What I found

**1. Security Definer View — real, 3 views**

These three views have no `security_invoker` setting, so they run with the owner's
permissions instead of the caller's:

- `v_division_rateable` — rateable (non-hidden) divisions
- `v_team_current_division` — team to current division
- `v_team_last_known_division` — team to last division seen in power-score snapshots

They only read public league data (`divisions`, `teams`, `power_score_snapshots`).
They also have **no grants** to `anon` or `authenticated`, so nothing in the app or
the public API can query them today. Risk is low, but they break the project rule
that every view uses `security_invoker = on`.

**2. RLS Disabled in Public — no longer true**

I checked every table in the `public` schema. **All of them have RLS enabled.**
Nothing matches this finding. It is stale — most likely the backup stats table that
was locked down in an earlier change.

**3. Contact requests — no action**

The scanner itself says there is no issue. It is a pass, not a problem.

## The plan

1. One small migration: set `security_invoker = on` on the three views.
2. Before applying, confirm the three source tables allow public read, so the change
   cannot hide rows from the app.
3. Re-run the linter to confirm the Security Definer errors are gone.
4. Mark both errors resolved in the Security tab — the view one as fixed, the RLS one
   as fixed (already resolved), with a note.
5. Add a short line to the security memory: these three power-score helper views are
   invoker views with no `anon` grants.

## Technical detail

```sql
ALTER VIEW public.v_division_rateable        SET (security_invoker = on);
ALTER VIEW public.v_team_current_division    SET (security_invoker = on);
ALTER VIEW public.v_team_last_known_division SET (security_invoker = on);
```

No app code, no types, and no data change. Power-score SQL that reads these views
runs inside `SECURITY DEFINER` functions, so it keeps the same access it has now.

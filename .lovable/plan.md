# Fix read access to team season stats

## What I checked

The reported cause is not what the database actually shows.

- `team_season_stats` **does** already have a public read policy: `Anyone can view team season stats`, SELECT, role `public`, condition `true`.
- What it does **not** have is any table-level permission grant. A query of the grants for this table returns zero rows — neither `anon`, `authenticated`, nor `service_role` has been granted access.

Supabase does not hand out default permissions on new tables. Without an explicit grant, the API layer rejects reads with a permission error before row-level rules are even considered. That matches the symptom (no data for normal users, works with service-role credentials, which bypass this layer).

So adding another SELECT policy would change nothing.

## The fix

One database migration that grants the missing permissions on `team_season_stats`:

- read access for signed-out visitors (matching the existing public read rule)
- read/write access for signed-in users (writes still restricted to admins by the existing rules)
- full access for internal/server-side code

No policy changes — the existing rules already express the intended access.

## Technical detail

```sql
GRANT SELECT ON public.team_season_stats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_season_stats TO authenticated;
GRANT ALL ON public.team_season_stats TO service_role;
```

## Verification

- Re-query `information_schema.role_table_grants` for the table and confirm the three roles appear.
- Load the standings/history pages signed out and confirm season stats render.

## Follow-up worth considering (not in this change)

Other tables may have the same missing-grant gap. If you want, I can audit every table in the public schema for tables with policies but no grants and report the list before changing anything.

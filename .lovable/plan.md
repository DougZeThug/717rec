## Why nothing loads for anon (or any non-admin) users

The recent security migration revoked `SELECT` on `team_season_opt_out` from `anon` and `PUBLIC`. I confirmed via the live anon REST API:

```
GET /rest/v1/teams       → 42501 permission denied for table team_season_opt_out
GET /rest/v1/v_pending_matches → 42501 permission denied for table team_season_opt_out
```

The `teams` table RLS policy "Public read teams" contains a subquery against `team_season_opt_out`:

```sql
NOT EXISTS (SELECT 1 FROM team_season_opt_out o JOIN seasons s ...)
```

RLS policy expressions execute **as the calling role**, not as the table owner (the earlier assumption in the security memory was wrong). With anon now lacking `SELECT` on `team_season_opt_out`, every read of `teams` fails — which cascades to:

- `v_pending_matches` (security_invoker view → joins teams) → "Failed to load pending matches"
- `ChampionsHeroCard` → `HeroCardService.fetchChampionTeams` → "Unable to load champions"
- Standings, Teams page, anything joining/reading teams.

## Fix

Wrap the opt-out check in a `SECURITY DEFINER` helper so the policy doesn't require callers to read the table directly. This keeps `team_season_opt_out` locked down (per the original security finding) while restoring public team reads.

### Migration

```sql
CREATE OR REPLACE FUNCTION public.is_team_opted_out_active(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_season_opt_out o
    JOIN seasons s ON s.id = o.season_id AND s.is_active
    WHERE o.team_id = _team_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_team_opted_out_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_team_opted_out_active(uuid) TO anon, authenticated;

DROP POLICY "Public read teams" ON public.teams;
CREATE POLICY "Public read teams" ON public.teams
  FOR SELECT
  USING (NOT public.is_team_opted_out_active(id));
```

### Verification

After migration, re-test the anon REST endpoints — both `teams` and `v_pending_matches` should return rows. The Champions card and pending-matches section should load on the live site for signed-out visitors.

### Update security memory

Note that RLS subqueries run as the invoking role (correcting the prior note), and document `is_team_opted_out_active` as the sanctioned bridge into `team_season_opt_out`.

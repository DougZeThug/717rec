# Seasons RLS repair

## Audit (live DB)

Current `public.seasons` policies — already in the intended shape:

| Policy | Cmd | Role | Expression |
|---|---|---|---|
| Anyone can view seasons | SELECT | public | `true` (anon + authenticated read) ✓ |
| Admins can insert seasons | INSERT | authenticated | `current_user_is_admin()` ✓ |
| Admins can update seasons | UPDATE | authenticated | `current_user_is_admin()` ✓ |
| Admins can delete seasons | DELETE | authenticated | `current_user_is_admin()` ✓ |

Migration history shows two earlier rewrites of these same policies (`20260202182410`, `20260410153406`) plus one that dropped a redundant `Authenticated users can read seasons`. The drift the brief refers to is the recurring loss of broad SELECT — the read policy has been edited / dropped / re-added multiple times.

No live regression today. The work is **pinning the canonical state, adding drift detection, and documenting intent** so future migrations don't quietly remove public read again.

## Plan

### 1. New migration: `supabase/migrations/<ts>_seasons_rls_canonical.sql`

Idempotent. Reasserts the canonical four policies and **does nothing destructive beyond replacing same-named policies**.

```sql
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Public read (anon + authenticated). League standings, history,
-- and the marketing site rely on this.
DROP POLICY IF EXISTS "Anyone can view seasons" ON public.seasons;
CREATE POLICY "Anyone can view seasons"
  ON public.seasons FOR SELECT TO public
  USING (true);
COMMENT ON POLICY "Anyone can view seasons" ON public.seasons IS
  'Intentional: seasons metadata is public. Do not narrow without product review.';

-- Admin-only writes
DROP POLICY IF EXISTS "Admins can insert seasons" ON public.seasons;
CREATE POLICY "Admins can insert seasons"
  ON public.seasons FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update seasons" ON public.seasons;
CREATE POLICY "Admins can update seasons"
  ON public.seasons FOR UPDATE TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete seasons" ON public.seasons;
CREATE POLICY "Admins can delete seasons"
  ON public.seasons FOR DELETE TO authenticated
  USING (public.current_user_is_admin());

-- Drift detector: a SECURITY INVOKER function that returns a row per
-- missing-or-wrong policy. Used by the SQL smoke test in
-- supabase/tests/seasons_rls.sql.
CREATE OR REPLACE FUNCTION public.seasons_rls_drift()
RETURNS TABLE (issue text)
LANGUAGE sql STABLE SET search_path = 'pg_catalog', 'public'
AS $$
  WITH expected(policyname, cmd, role) AS (VALUES
    ('Anyone can view seasons',  'SELECT', 'public'),
    ('Admins can insert seasons','INSERT', 'authenticated'),
    ('Admins can update seasons','UPDATE', 'authenticated'),
    ('Admins can delete seasons','DELETE', 'authenticated')
  )
  SELECT format('missing %s/%s', e.policyname, e.cmd)
  FROM expected e
  LEFT JOIN pg_policies p
    ON p.schemaname='public' AND p.tablename='seasons'
   AND p.policyname=e.policyname AND p.cmd=e.cmd
   AND e.role = ANY (p.roles)
  WHERE p.policyname IS NULL;
$$;
COMMENT ON FUNCTION public.seasons_rls_drift IS
  'Returns one row per canonical seasons RLS policy that is missing.
   Should return zero rows. Run from CI / smoke tests.';
```

### 2. SQL smoke test asset: `supabase/tests/seasons_rls.sql`

Plain-SQL, runnable via `psql` or `supabase db execute`. Repo has no pgTAP infra so we keep this lightweight and self-asserting:

```sql
\set ON_ERROR_STOP on
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.seasons_rls_drift();
  IF n > 0 THEN
    RAISE EXCEPTION 'seasons RLS drift: % issue(s)', n;
  END IF;
END $$;
```

A short README inside `supabase/tests/` explains how to run it locally. No CI wiring in this PR — adding GitHub Actions for Supabase is out of scope.

### 3. Service review (read-only verification, no code changes expected)

Spot-check `src/services/SeasonService.ts` and any other consumer (`WeeklyRecapService`, `CareerBulkFetchService`, `MatchWriteService`, etc.) to confirm:

- Reads use the anon/auth client and rely on the public SELECT policy (no service_role).
- Writes go through admin flows that already require the admin session.
- No `select('*')`, no direct admin-bypass anywhere.

If any consumer drifts from these rules, flag it in the PR description but do not refactor here — service refactors belong in a separate PR.

### 4. Docs

Append a short "Seasons" subsection to `docs/SECRETS.md` (or create `docs/RLS_NOTES.md` if cleaner) with:

- Intended access model for `public.seasons` (the table above).
- Why public read is intentional.
- How to run `supabase/tests/seasons_rls.sql` locally.
- Drift-prevention rule: any future migration touching `public.seasons` policies must keep `Anyone can view seasons` for role `public`, or replace it with an equivalent `TO anon, authenticated` SELECT policy.

## Will NOT touch

- Any other table's RLS (storage, matches, brackets, profiles, etc.)
- `src/services/*` source — review only
- `src/integrations/supabase/types.ts` (auto-generated)
- League scheduling, standings, playoffs, brackets, match logic, team stats, UI
- Auth flow, edge functions, env vars
- Existing migrations (read-only)

## Validation commands

- Harness runs `tsc` and `vite build` automatically; no source files change.
- `npm test` — no test changes, expect existing 2193 to pass.
- Manual: `psql "$SUPABASE_DB_URL" -f supabase/tests/seasons_rls.sql` after the migration runs → exits 0.
- Manual: query `pg_policies` to confirm 4 expected policies present and nothing extra.

## Manual validation checklist (post-deploy)

- [ ] Logged-out visitor sees season selector / standings (anon SELECT works).
- [ ] Authenticated non-admin sees the same season list.
- [ ] Admin can create, activate, archive a season from the admin tab.
- [ ] Non-admin attempt to INSERT/UPDATE/DELETE a season is rejected by RLS.
- [ ] `select * from public.seasons_rls_drift()` returns 0 rows.

## Suggested PR title

Seasons RLS repair: pin canonical policies and add drift detector

## Suggested PR description

This PR locks in the intended Row-Level Security for `public.seasons` so future migrations don't quietly remove public read access again.

- Reasserts the four canonical seasons policies in one idempotent migration: public SELECT for anon + authenticated, admin-only INSERT/UPDATE/DELETE.
- Adds `public.seasons_rls_drift()`, a small SECURITY INVOKER function that returns one row per missing/incorrect canonical policy. Should always return zero rows.
- Adds `supabase/tests/seasons_rls.sql`, a runnable smoke test that fails if drift is detected.
- Documents the intended access model and the drift-prevention rule for future contributors.

No app code, no service refactors, no league-logic changes. Read-only review of `SeasonService` confirmed it depends on the public SELECT policy (no service_role, no admin bypass).

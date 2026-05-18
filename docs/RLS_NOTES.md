# RLS notes

Plain-English notes on intentional Row-Level Security decisions that future
contributors should not silently undo. Pair this with the per-table policies
visible in the Supabase dashboard.

## `public.seasons`

Seasons metadata (name, dates, active flag, champion ids, archive flag) is
public information. The marketing site, standings pages, and history views
all read it without an auth session.

### Canonical policies

| Policy | Cmd | Role | Rule |
|---|---|---|---|
| Anyone can view seasons | SELECT | `public` | `true` |
| Admins can insert seasons | INSERT | `authenticated` | `current_user_is_admin()` |
| Admins can update seasons | UPDATE | `authenticated` | `current_user_is_admin()` |
| Admins can delete seasons | DELETE | `authenticated` | `current_user_is_admin()` |

### Drift-prevention rule

Any migration touching `public.seasons` policies MUST keep
`Anyone can view seasons` for role `public`, or replace it with an
equivalent `TO anon, authenticated` SELECT policy. **Do not narrow
public read without product review** — it will break logged-out league
pages.

### Verifying

After any migration that touches seasons policies, run:

```bash
psql "$SUPABASE_DB_URL" -f supabase/tests/seasons_rls.sql
```

Or query the helper directly:

```sql
SELECT * FROM public.seasons_rls_drift();
-- 0 rows = healthy
```

### History

The seasons read policy has been dropped or rewritten multiple times in the
past (`20260202182410`, `20260410153406`). The
`<ts>_seasons_rls_canonical.sql` migration pins the intended state and adds
the drift detector so the next accidental narrowing is caught fast.
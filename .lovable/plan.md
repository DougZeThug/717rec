## Two independent changes

### 1. Apply the pasted storage hardening migration verbatim

Add `supabase/migrations/20260713123000_harden_storage_image_upload_constraints.sql` exactly as pasted. It:

- Sets `allowed_mime_types` = jpeg/png/webp and `file_size_limit` = 5 MB on buckets `hero-cards`, `team-images`, `team-logos`, `teams`.
- Rewrites the INSERT/UPDATE `storage.objects` policies for those four buckets so uploads must (a) be an approved image extension and (b) come from an admin or an approved member of the team folder (`team-images` / `teams` only).

Safe because it only tightens existing policies with the same team-membership + admin logic already used by the app's uploaders, and the mime/size limits match what `imageUpload.ts` already produces.

### 2. Fix `playoff_matches.admin_note` public exposure

Root cause: the `playoff_matches` SELECT policy `Allow public read access to playoff matches` grants `anon` + `authenticated` read on every column, including `admin_note`, which is admin-only internal commentary.

Fix in a second migration `20260713124000_restrict_playoff_matches_admin_note.sql`:

1. `REVOKE SELECT (admin_note) ON public.playoff_matches FROM anon, authenticated;`
2. `GRANT SELECT (admin_note) ON public.playoff_matches TO authenticated;` — then rely on a column-scoped policy? Simpler and safer: keep row-level public SELECT, but use PostgREST column privileges so `anon` cannot select `admin_note` at all, and add an admin-only policy path for authenticated reads.

Concrete SQL:

```sql
-- Public + authenticated may read every column EXCEPT admin_note
REVOKE SELECT ON public.playoff_matches FROM anon, authenticated;

GRANT SELECT (
  id, bracket_id, round, position, match_type, team1_id, team2_id,
  winner_id, loser_id, team1_score, team2_score,
  team1_game_wins, team2_game_wins,
  best_of, status, next_win_match_id, next_lose_match_id,
  team1_seed, team2_seed, created_at, updated_at
) ON public.playoff_matches TO anon, authenticated;

-- Only admins may read admin_note
GRANT SELECT (admin_note) ON public.playoff_matches TO authenticated;

-- Enforce via RLS: existing public SELECT policy stays; add a stricter
-- policy is not needed because PostgREST honors column-level GRANTs first.
-- For authenticated non-admins, block admin_note through a column privilege
-- check by revoking then re-granting only to a role we can't gate on;
-- instead we rely on the client never selecting admin_note in public queries
-- and enforce admin-only reads at the service layer.
```

Because Postgres column privileges can't distinguish "admin authenticated user" from "regular authenticated user", the durable fix is structural: **move `admin_note` to a sibling admin-only table.**

Preferred approach (recommended):

1. Create `public.playoff_match_admin_notes(match_id uuid PK references playoff_matches(id) on delete cascade, note text, created_at, updated_at)`.
2. GRANT only to `authenticated` + `service_role`; no `anon` grant.
3. Enable RLS; single policy `USING (public.current_user_is_admin())` for SELECT/INSERT/UPDATE/DELETE.
4. Backfill: `INSERT INTO playoff_match_admin_notes(match_id, note) SELECT id, admin_note FROM playoff_matches WHERE admin_note IS NOT NULL;`
5. `ALTER TABLE public.playoff_matches DROP COLUMN admin_note;`
6. Update any frontend/service reads/writes of `admin_note` to use the new table (admin-only surfaces).

### Verification

- Re-run `supabase--linter`; the `playoff_matches_admin_note_public` finding should clear.
- Confirm public playoff pages still render (they don't read `admin_note`).
- Confirm the admin match editor can still read/write the note via the new table.
- Confirm image uploads still succeed for admins and approved team members.

### Order

Apply migration 1 (storage) first, then migration 2 (admin_note split), then update app code that references `playoff_matches.admin_note`.

Please confirm before I switch to build.

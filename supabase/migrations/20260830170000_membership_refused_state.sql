-- ============================================================
-- A refused membership request keeps its row
-- ============================================================
--
-- WHY
--   team_memberships had one state column, is_approved, a non-null boolean.
--   false meant "pending", true meant "approved", and there was no third value
--   for "refused". So rejecting a request had to DELETE the row: flipping
--   is_approved to false on an already-pending row is a no-op and would leave
--   it in the admin queue forever.
--
--   Deleting it meant the person was never told. Their screen went back to
--   looking exactly as it had before they asked, because fetchTeamMembership
--   returns null for "no row" and the join form is what null draws. They could
--   not tell a refusal from a request that was never received, and asking again
--   looked brand new to the admin.
--
--   rejected_at is the third state. A refused row is is_approved = false with
--   rejected_at set; a pending row is is_approved = false with rejected_at
--   null. rejected_by records which admin did it, mirroring approved_by.
--
-- SCOPE
--   Adds two nullable columns and one index. Existing rows are unaffected:
--   every one of them has rejected_at null, which is what "pending or approved"
--   already means. Re-running is safe.
--
--   No RLS change. The UPDATE policy from 20260818195805 already allows a user
--   to update their own row while is_approved = false, which is exactly the
--   path that clears a refusal when they ask again. Its WITH CHECK still pins
--   is_approved = false, approved_by IS NULL and approved_at IS NULL, so a
--   person still cannot approve themselves. Admins keep the broader grant.
--
--   idx_one_membership_per_user (20260827120000) is a TOTAL unique index on
--   user_id, so a kept refused row occupies the person's only slot. Asking
--   again must therefore UPDATE that row rather than insert a second one.
--   joinTeamMembership already takes the update path when a row exists; it now
--   also clears rejected_at and rejected_by.

ALTER TABLE public.team_memberships
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES public.profiles(id);

COMMENT ON COLUMN public.team_memberships.rejected_at IS
  'When an admin refused this join request. NULL means pending or approved. '
  'Before this column existed, rejecting DELETEd the row, so the person was '
  'never told and could not tell refusal from a request never received.';

COMMENT ON COLUMN public.team_memberships.rejected_by IS
  'The admin who refused the request. Mirrors approved_by, and like it '
  'references profiles(id), not auth.users.';

-- The admin queue reads pending requests. Without rejected_at in the predicate
-- a refused row is still is_approved = false and would sit in that queue for
-- good, which is the failure the DELETE existed to avoid.
CREATE INDEX IF NOT EXISTS idx_team_memberships_pending_not_rejected
  ON public.team_memberships (team_id)
  WHERE is_approved = false AND rejected_at IS NULL;

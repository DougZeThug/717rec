-- ============================================================
-- A declined request may be aimed at a different team
-- ============================================================
--
-- WHY
--   20260830170000 made a refused join request keep its row so the person can
--   be told they were refused. Because idx_one_membership_per_user is a TOTAL
--   unique index on user_id, that row is the person's only slot, so asking
--   again has to UPDATE it rather than insert a second one.
--
--   trg_prevent_team_membership_reassignment (20260713190745) refuses every
--   non-admin change to team_id with 42501. Before the row was kept this was
--   unreachable from the app: a refused person had no row, so asking again took
--   the INSERT path, and the join form is never drawn for somebody who already
--   has a membership. Keeping the row made the UPDATE path reachable and turned
--   "declined by team A, ask team B" into a raw permission error.
--
--   Asking the SAME team again still worked, which is what made this easy to
--   miss: only the different-team case failed, and that is the likely one.
--
-- SCOPE
--   Loosens exactly one condition: team_id may move when the row being updated
--   is a declined request (rejected_at set and not approved). Everything else
--   the trigger locks is unchanged — user_id, is_approved, approved_by and
--   approved_at are still immutable to non-admins, so this cannot approve
--   anybody or move a real membership.
--
--   This grants nothing new. "Users can create their membership" already lets a
--   person insert a pending row for any team, and "Delete membership (admin or
--   owner)" lets them delete their own, so delete-then-insert always achieved
--   the same end. The difference is that one UPDATE is atomic and cannot strand
--   the person with no row if the second statement fails.

CREATE OR REPLACE FUNCTION public.prevent_team_membership_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may reassign / approve freely.
  IF public.current_user_is_admin() THEN
    RETURN NEW;
  END IF;

  -- A declined request is not a membership: the person was never on that team.
  -- The app puts the join form back underneath the "Request declined" card, and
  -- re-aiming this row is how they use it.
  IF NEW.team_id IS DISTINCT FROM OLD.team_id
     AND NOT (OLD.rejected_at IS NOT NULL AND OLD.is_approved = false) THEN
    RAISE EXCEPTION 'team_id cannot be changed on an existing membership'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be changed on an existing membership'
      USING ERRCODE = '42501';
  END IF;

  -- Non-admins may never flip approval state or set approver metadata.
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'approval fields can only be modified by an admin'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_team_membership_reassignment() IS
  'Keeps team_id, user_id and the approval fields immutable to non-admins. '
  'The one exception is a declined request (rejected_at set, not approved), '
  'whose team_id may move: that row is the person''s only slot under '
  'idx_one_membership_per_user, so asking a different team has to reuse it.';

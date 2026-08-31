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
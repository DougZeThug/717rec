
-- Fix 1: allow submitters to view their own score_submissions rows.
DROP POLICY IF EXISTS "Users can view their own score submissions" ON public.score_submissions;
CREATE POLICY "Users can view their own score submissions"
ON public.score_submissions
FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND user_id = (SELECT auth.uid()));

-- Fix 2: enforce team_id immutability on team_memberships via trigger.
-- The previous WITH CHECK subquery referenced the NEW row itself and was
-- a tautology; a BEFORE UPDATE trigger reliably blocks non-admin changes
-- to team_id (and to the approval fields the owner shouldn't touch).
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

  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
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

DROP TRIGGER IF EXISTS trg_prevent_team_membership_reassignment ON public.team_memberships;
CREATE TRIGGER trg_prevent_team_membership_reassignment
BEFORE UPDATE ON public.team_memberships
FOR EACH ROW
EXECUTE FUNCTION public.prevent_team_membership_reassignment();

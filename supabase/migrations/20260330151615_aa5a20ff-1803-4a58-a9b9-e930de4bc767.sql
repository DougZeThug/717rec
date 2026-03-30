
CREATE OR REPLACE FUNCTION public.validate_membership_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_approved = true AND (OLD.is_approved = false OR OLD.is_approved IS NULL) THEN
    IF NEW.approved_by IS NULL THEN
      RAISE EXCEPTION 'approved_by is required when approving membership';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.approved_by AND is_admin = true) THEN
      RAISE EXCEPTION 'approved_by must be an admin';
    END IF;
    IF NEW.approved_by = NEW.user_id THEN
      RAISE EXCEPTION 'Cannot approve own membership';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public';

CREATE TRIGGER validate_membership_approval_trigger
  BEFORE UPDATE ON public.team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_membership_approval();

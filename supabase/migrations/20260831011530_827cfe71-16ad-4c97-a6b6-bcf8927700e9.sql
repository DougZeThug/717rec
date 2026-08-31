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

CREATE INDEX IF NOT EXISTS idx_team_memberships_pending_not_rejected
  ON public.team_memberships (team_id)
  WHERE is_approved = false AND rejected_at IS NULL;
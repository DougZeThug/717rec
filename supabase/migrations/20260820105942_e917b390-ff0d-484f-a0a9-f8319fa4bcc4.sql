CREATE UNIQUE INDEX IF NOT EXISTS idx_one_approved_membership_per_user
  ON public.team_memberships (user_id)
  WHERE is_approved = true;
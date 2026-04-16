CREATE POLICY "Admins can update teams"
  ON public.teams
  FOR UPDATE
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
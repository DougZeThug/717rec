CREATE POLICY "Admins can insert playoff team records"
  ON public.playoff_team_records FOR INSERT
  TO authenticated
  WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can update playoff team records"
  ON public.playoff_team_records FOR UPDATE
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can delete playoff team records"
  ON public.playoff_team_records FOR DELETE
  TO authenticated
  USING (current_user_is_admin());
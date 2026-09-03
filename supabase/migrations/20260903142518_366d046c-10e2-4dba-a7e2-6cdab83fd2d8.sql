-- match_comments: restore INSERT/DELETE for authenticated users.
-- The Phase 1 hardening migration kept SELECT but dropped all write access.

CREATE POLICY "Users can add their own match comments"
  ON public.match_comments
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own match comments"
  ON public.match_comments
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Admins can moderate (delete) any comment.
CREATE POLICY "Admins can delete any match comment"
  ON public.match_comments
  FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());

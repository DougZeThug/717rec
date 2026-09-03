-- Consolidate match_comments policies: the older "Users can ... their own comments"
-- policies were scoped TO public. Replace them with the authenticated-scoped set.

DROP POLICY IF EXISTS "Users can insert their own comments" ON public.match_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.match_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.match_comments;

CREATE POLICY "Users can edit their own match comments"
  ON public.match_comments
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

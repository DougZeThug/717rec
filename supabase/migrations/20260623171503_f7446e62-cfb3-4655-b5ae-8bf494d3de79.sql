DROP POLICY IF EXISTS "Allow authenticated users to view score submissions" ON public.score_submissions;

CREATE POLICY "Admins can view score submissions"
ON public.score_submissions
FOR SELECT
TO authenticated
USING (public.current_user_is_admin());
-- Drop the anonymous INSERT policy on score_submissions
DROP POLICY IF EXISTS "Allow anonymous score submissions" ON public.score_submissions;

-- Revoke INSERT from anon (service_role retains all access)
REVOKE INSERT ON public.score_submissions FROM anon;
REVOKE INSERT ON public.score_submissions FROM authenticated;

-- Defense-in-depth: hard length caps at the database layer
ALTER TABLE public.score_submissions
  ADD CONSTRAINT score_submissions_submitter_name_length CHECK (char_length(submitter_name) <= 120),
  ADD CONSTRAINT score_submissions_submitter_team_length CHECK (submitter_team IS NULL OR char_length(submitter_team) <= 120),
  ADD CONSTRAINT score_submissions_message_length CHECK (char_length(message) <= 2000);
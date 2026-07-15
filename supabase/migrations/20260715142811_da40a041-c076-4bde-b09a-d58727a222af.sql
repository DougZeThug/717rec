DROP INDEX IF EXISTS public.score_submissions_pending_dedupe;
CREATE UNIQUE INDEX score_submissions_pending_dedupe
  ON public.score_submissions (match_id, md5(message), submitter_name)
  WHERE status = 'pending';
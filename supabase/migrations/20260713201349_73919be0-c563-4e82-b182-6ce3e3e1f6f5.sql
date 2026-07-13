-- PR-05: De-duplicate public score reports (DB backstop).
-- 1) One-time cleanup: collapse existing byte-identical PENDING duplicates
--    (same match_id + same message), keeping the oldest row per group.
-- 2) Add a partial unique index so racing requests can't both land.
--
-- Reversible: DROP INDEX restores prior behavior. The delete step is
-- destructive but bounded to rows that are byte-identical to a kept sibling,
-- preserving the original submission and its created_at timestamp.

DO $$
DECLARE
  victims bigint;
BEGIN
  WITH ranked AS (
    SELECT id,
           row_number() OVER (
             PARTITION BY match_id, message
             ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM public.score_submissions
    WHERE status = 'pending'
  ),
  deleted AS (
    DELETE FROM public.score_submissions s
    USING ranked r
    WHERE s.id = r.id
      AND r.rn > 1
    RETURNING s.id
  )
  SELECT count(*) INTO victims FROM deleted;

  RAISE NOTICE '[PR-05] Collapsed % duplicate pending score_submissions rows', victims;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS score_submissions_pending_dedupe
  ON public.score_submissions (match_id, md5(message))
  WHERE status = 'pending';
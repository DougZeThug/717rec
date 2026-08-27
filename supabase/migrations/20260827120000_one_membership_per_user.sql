-- ============================================================
-- One team membership row per user
-- ============================================================
--
-- WHY
--   idx_one_approved_membership_per_user (20260820105942) is PARTIAL, on
--   is_approved = true. Two pending rows, or one approved plus one pending,
--   were all legal. fetchTeamMembership reads team_memberships by user_id, and
--   maybeSingle() returns PGRST116 when more than one row comes back, so the
--   read threw and useTeamMembership handed every consumer a null membership:
--   no scoring, no next-match card, and /my-team quietly showing the join form.
--   Pressing that form's only button inserted another row, so the account could
--   not be repaired from inside the app.
--
--   A duplicate appeared whenever the membership read failed or was stale while
--   a row already existed: a dropped request (the query retries once), or a
--   second tab holding a cached "no membership" through its five-minute stale
--   window. One press of Request to Join then inserted a second row.
--
--   team_memberships has no season_id, so one row per user is what the data
--   model means. The constraint that matches it is a TOTAL unique index.
--
-- SCOPE
--   Deletes duplicate rows, keeping one per user. Nothing has a foreign key to
--   team_memberships.id, so no other row is touched. Re-running is safe, and on
--   a database with no duplicates the DELETE is a no-op.
--
--   The kept row is the one the app already reads: the approved row if there is
--   one, then the oldest request. Because the choice matches
--   fetchTeamMembership, no member sees their team change.
--
--   Rows with a NULL user_id are left alone. They are orphans, not duplicates,
--   and Postgres treats NULLs as distinct in a unique index.

-- De-duplicate and index in one block. The lock is taken first and held to the
-- end of it: without the lock a member could send a join request in the gap
-- between the DELETE and the index build, and the build would then fail on a
-- duplicate the DELETE never saw, so the migration would not deploy.
-- SHARE ROW EXCLUSIVE stops writers and lets readers through, so the app carries
-- on serving while this runs. A DO block is one statement, so the three steps
-- share one transaction whether or not the runner opens one of its own.
DO $$
BEGIN
  LOCK TABLE public.team_memberships IN SHARE ROW EXCLUSIVE MODE;

  -- 1) Keep one row per user, so the total index can be created.
  DELETE FROM public.team_memberships tm
  USING (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY user_id
        ORDER BY is_approved DESC, joined_at ASC NULLS LAST, id ASC
      ) AS rn
    FROM public.team_memberships
    WHERE user_id IS NOT NULL
  ) ranked
  WHERE tm.id = ranked.id
    AND ranked.rn > 1;

  -- 2) Replace the approved-only index with one that covers every row.
  DROP INDEX IF EXISTS public.idx_one_approved_membership_per_user;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_one_membership_per_user
    ON public.team_memberships (user_id);
END $$;

COMMENT ON INDEX public.idx_one_membership_per_user IS
  'One team membership row per user, approved or pending. A second row made '
  'fetchTeamMembership''s maybeSingle() throw, which removed every member '
  'ability and could not be repaired from inside the app. Switching teams '
  'updates this row; it is never a second insert.';

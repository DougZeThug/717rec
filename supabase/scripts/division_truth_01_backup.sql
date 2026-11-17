-- Division truth, script 01: BACKUP (hand-apply step 1).
--
-- NOT A MIGRATION. Paste the WHOLE file into the Supabase SQL Editor and run it
-- once. Order of the six scripts and the reason for all of this:
-- docs/OPERATIONS.md section 6g.
--
-- Run it BEFORE the migration 20261117130000 and BEFORE any override row exists.
-- It saves, for the six seasons the fix can touch, two things:
--   1. the numbers stored today (power_score, career_power_score, sos, recorded_at
--      and every other column of team_season_stats), and
--   2. the numbers the CURRENT rules give (live_power_score, live_sos,
--      live_career_power_score, read from v_team_season_agg). With no override
--      rows these are "today's rules, no fix". The preview script (03) uses
--      them to split a change into "old rule changes" and "this fix".
--
-- The six seasons: Spring 2025, Summer 1 2025, Summer 2 2025, Fall 2025,
-- Winter 1 2026, Winter 2 2026.
--
-- Safe to re-run. It NEVER overwrites: if the backup table is already there, it
-- keeps the first one and says so. It STOPS (nothing saved) if an override row
-- already exists, because the "live rules" numbers would then include the fix.
--
-- The table is locked like the other backups (service_role only). Drop it only
-- when Doug has accepted the new numbers:
--   DROP TABLE public.team_season_stats_pre_division_truth;
--
-- The result at the bottom is the only thing the editor shows. Read it.

DO $$
DECLARE
  v_override_rows bigint;
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    -- EXECUTE, because the table does not exist yet when this runs first.
    IF to_regclass('public.power_score_division_override') IS NOT NULL THEN
      EXECUTE 'SELECT count(*) FROM public.power_score_division_override' INTO v_override_rows;
      IF v_override_rows > 0 THEN
        RAISE EXCEPTION 'STOP: override rows already exist, so the live-rules numbers would include the fix. Nothing was saved.';
      END IF;
    END IF;

    CREATE TABLE public.team_season_stats_pre_division_truth AS
    WITH six(season_id) AS (VALUES
      ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a'::uuid),  -- Spring 2025
      ('e537c594-3ba9-4d79-ba63-f6ed90c89e30'::uuid),  -- Summer 1 2025
      ('d50bb12e-99be-4170-802a-695a402373ce'::uuid),  -- Summer 2 2025
      ('34cd19e2-abf5-43b8-a16f-6d73a0e998ac'::uuid),  -- Fall 2025
      ('4b90a1d8-b90a-4e47-8e8c-b89a7b54e106'::uuid),  -- Winter 1 2026
      ('9cd55eb8-672c-4a43-a9df-3552a7759cca'::uuid)   -- Winter 2 2026
    )
    SELECT s.season_id, s.team_id, s.match_wins, s.match_losses, s.game_wins, s.game_losses,
           s.division_name, s.playoff_rank, s.power_score, s.sos, s.champion, s.runner_up,
           s.recorded_at, s.career_power_score,
           a.power_score        AS live_power_score,
           a.sos                AS live_sos,
           a.career_power_score AS live_career_power_score,
           now()                AS backed_up_at
    FROM public.team_season_stats s
    JOIN six ON six.season_id = s.season_id
    LEFT JOIN public.v_team_season_agg a
      ON a.season_id = s.season_id AND a.team_id = s.team_id;
  END IF;
END $$;

REVOKE ALL ON public.team_season_stats_pre_division_truth FROM PUBLIC, anon, authenticated;
ALTER TABLE public.team_season_stats_pre_division_truth ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.team_season_stats_pre_division_truth TO service_role;

COMMENT ON TABLE public.team_season_stats_pre_division_truth IS
  'team_season_stats (six seasons) as it stood before the division override fix, '
  'plus live_* columns: the numbers the rules of that day gave (v_team_season_agg). '
  'Source for the preview and for undo path 1. Drop when Doug accepts the new numbers.';

-- ONE result: what is in the backup, and does it match the live table?
WITH six(season_id) AS (VALUES
  ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a'::uuid),
  ('e537c594-3ba9-4d79-ba63-f6ed90c89e30'::uuid),
  ('d50bb12e-99be-4170-802a-695a402373ce'::uuid),
  ('34cd19e2-abf5-43b8-a16f-6d73a0e998ac'::uuid),
  ('4b90a1d8-b90a-4e47-8e8c-b89a7b54e106'::uuid),
  ('9cd55eb8-672c-4a43-a9df-3552a7759cca'::uuid)
),
live AS (
  SELECT count(*) AS n
  FROM public.team_season_stats s JOIN six ON six.season_id = s.season_id
),
saved AS (
  SELECT count(*) AS n, min(backed_up_at) AS taken_at,
         count(*) FILTER (WHERE live_power_score IS NOT NULL) AS with_live
  FROM public.team_season_stats_pre_division_truth
)
SELECT x.what, x.value
FROM (
  SELECT 1 AS ord, 'backup table' AS what, 'public.team_season_stats_pre_division_truth' AS value
  UNION ALL
  SELECT 2, 'taken at (UTC)', to_char(saved.taken_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') FROM saved
  UNION ALL
  SELECT 3, 'rows saved', saved.n::text FROM saved
  UNION ALL
  SELECT 4, 'rows in the live table now (same six seasons)', live.n::text FROM live
  UNION ALL
  SELECT 5, 'saved rows that carry a live-rules number', saved.with_live::text FROM saved
  UNION ALL
  SELECT 6, 'override rows today (0, or "no table yet")',
         -- query_to_xml reads the table only when the CASE reaches it, so this
         -- also works before the migration, when the table does not exist.
         CASE WHEN to_regclass('public.power_score_division_override') IS NULL THEN 'no table yet'
              ELSE (xpath('/row/c/text()', query_to_xml(
                      'SELECT count(*) AS c FROM public.power_score_division_override',
                      false, true, '')))[1]::text END
  UNION ALL
  SELECT 7, 'saved rows in ' || se.name, count(*)::text
    FROM public.team_season_stats_pre_division_truth b
    JOIN public.seasons se ON se.id = b.season_id
   GROUP BY se.name
  UNION ALL
  SELECT 99, 'verdict',
         CASE WHEN saved.n = live.n THEN 'OK: saved = live. The backup is complete.'
              ELSE 'CHECK: saved and live counts differ. Expected only if a team-season was added after the first backup; the first backup was kept.'
         END
    FROM saved, live
) x
ORDER BY x.ord, x.what;

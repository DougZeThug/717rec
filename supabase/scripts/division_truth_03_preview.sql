-- Division truth, script 03: PREVIEW (hand-apply step 5, read-only).
--
-- NOT A MIGRATION. Paste the WHOLE file into the Supabase SQL Editor and run it.
-- Run it AFTER the data script (02) and BEFORE the recompute (04). It changes no
-- stored number. (It makes one temporary view that vanishes with the session.)
-- Doug looks at the result and approves, or does not.
--
-- ONE row per team in each of the six seasons. Every score is on the 0-100 scale
-- the site shows. The columns:
--
--   stored      the score the site shows TODAY (from the backup, script 01)
--   live_rules  the score TODAY's rules give, with no fix (backup, live_* columns).
--               stored vs live_rules is an OLD rule change that was never
--               recomputed (the 62 team-seasons). It is NOT caused by this fix.
--   after       the score after the fix (what the recompute would store)
--   change      after - stored      (what a player would see change)
--   fix_part    after - live_rules  (the part caused by THIS fix)
--   rank_was    place in the season by stored score (1 = best, ties share)
--   rank_now    place in the season by after score
--   games_changed  games of this team whose opponent weight changed
--                  (or that were unrated and now are rated)
--   via_override   games of this team now rated by an override row
--
-- A team with games_changed = 0 must have fix_part = 0.00. If not, tell the
-- developer. Sorted: by season, then the biggest absolute change first.
-- Spring 2025 has about 15 teams, each other season 7 to 16. Paste the result back.

-- The OLD rule, for comparing. This is the body of v_power_score_team_matches_rated
-- exactly as migration 20261003183939 wrote it, without the override step, saved as
-- a TEMPORARY view: it lives only in this editor session and changes nothing.
DROP VIEW IF EXISTS pg_temp.division_truth_old_rated;
CREATE TEMP VIEW division_truth_old_rated AS
WITH resolved AS (
  SELECT tm.match_id, tm.season_id, tm.source, tm.team_id, tm.opponent_id,
    tm.is_win, tm.is_loss, tm.game_wins, tm.game_losses, tm.match_date,
    COALESCE(snap.division_id, tda_id.id, brk.division_id, hist.division_id, dcur.division_id, lastk.division_id) AS opp_division_id,
    CASE
      WHEN snap.division_id IS NOT NULL AND snap.at_or_before THEN 'snapshot_at_date'
      WHEN snap.division_id IS NOT NULL THEN 'snapshot_earliest_in_season'
      WHEN tda_id.id IS NOT NULL THEN 'archive_division_id'
      WHEN brk.division_id IS NOT NULL THEN 'bracket_division_id'
      WHEN hist.division_id IS NOT NULL THEN 'division_history'
      WHEN dcur.division_id IS NOT NULL THEN 'current_division'
      WHEN lastk.division_id IS NOT NULL THEN 'last_known_division'
      ELSE 'unresolved'
    END AS resolved_by
  FROM public.v_power_score_team_matches tm
  LEFT JOIN LATERAL (
    SELECT dr.id AS division_id,
      (s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date)) AS at_or_before
    FROM public.power_score_snapshots s
    JOIN public.v_division_rateable dr ON dr.id = s.division_id
    WHERE s.team_id = tm.opponent_id AND s.season_id = tm.season_id
    ORDER BY (s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date)) DESC,
      CASE WHEN s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date) THEN s.snapshot_date END DESC NULLS LAST,
      s.snapshot_date
    LIMIT 1) snap ON true
  LEFT JOIN public.team_details_archive tda ON tda.team_id = tm.opponent_id AND tda.season_id = tm.season_id
    AND NOT EXISTS (SELECT 1 FROM public.division_archive_distrust dd WHERE dd.season_id = tda.season_id)
  LEFT JOIN public.v_division_rateable tda_id ON tda_id.id = tda.division_id
    AND (tda.divisionname IS NULL
      OR lower(btrim(tda_id.display_division)) = lower(btrim(tda.divisionname))
      OR lower(btrim(tda_id.name)) = lower(btrim(tda.divisionname)))
  LEFT JOIN LATERAL (
    SELECT dr.id AS division_id
    FROM public.participants p
    JOIN public.brackets b ON b.id = p.bracket_id
    JOIN public.v_division_rateable dr ON dr.id = b.division_id
    WHERE p.team_id = tm.opponent_id AND b.season_id = tm.season_id
    ORDER BY b.created_at, b.id LIMIT 1) brk ON true
  LEFT JOIN LATERAL (
    SELECT h.division_id
    FROM public.team_division_history h
    JOIN public.v_division_rateable dr ON dr.id = h.division_id
    WHERE h.team_id = tm.opponent_id AND h.changed_at > COALESCE(tm.match_date, now())
    ORDER BY h.changed_at LIMIT 1) hist ON true
  LEFT JOIN public.v_team_current_division dcur ON dcur.team_id = tm.opponent_id
  LEFT JOIN public.v_team_last_known_division lastk ON lastk.team_id = tm.opponent_id
)
SELECT r.match_id, r.season_id, r.source, r.team_id, r.opponent_id, r.is_win, r.is_loss,
  r.game_wins, r.game_losses, r.match_date, r.opp_division_id,
  COALESCE(wh.weight, dw.division_weight) AS opp_weight,
  (COALESCE(wh.weight, dw.division_weight) IS NOT NULL) AS rates,
  r.resolved_by
FROM resolved r
LEFT JOIN LATERAL (
  SELECT h.weight FROM public.division_weight_history h
  WHERE h.division_id = r.opp_division_id AND h.valid_from <= COALESCE(r.match_date, now())
  ORDER BY h.valid_from DESC LIMIT 1) wh ON true
LEFT JOIN public.v_division_rateable dw ON dw.id = r.opp_division_id;

WITH
six(season_id) AS (VALUES
  ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a'::uuid),  -- Spring 2025
  ('e537c594-3ba9-4d79-ba63-f6ed90c89e30'::uuid),  -- Summer 1 2025
  ('d50bb12e-99be-4170-802a-695a402373ce'::uuid),  -- Summer 2 2025
  ('34cd19e2-abf5-43b8-a16f-6d73a0e998ac'::uuid),  -- Fall 2025
  ('4b90a1d8-b90a-4e47-8e8c-b89a7b54e106'::uuid),  -- Winter 1 2026
  ('9cd55eb8-672c-4a43-a9df-3552a7759cca'::uuid)   -- Winter 2 2026
),
games AS (
  SELECT n.season_id, n.team_id,
         count(*) FILTER (WHERE n.opp_weight IS DISTINCT FROM o.opp_weight
                             OR n.rates IS DISTINCT FROM o.rates) AS games_changed,
         count(*) FILTER (WHERE n.resolved_by = 'manual_override') AS via_override
  FROM public.v_power_score_team_matches_rated n
  JOIN six ON six.season_id = n.season_id
  LEFT JOIN division_truth_old_rated o
         ON o.match_id = n.match_id AND o.team_id = n.team_id AND o.source = n.source
  GROUP BY n.season_id, n.team_id
),
scored AS (
  SELECT b.season_id, b.team_id,
         b.power_score AS stored_raw, b.live_power_score AS live_raw, a.power_score AS after_raw,
         CASE WHEN b.power_score IS NULL THEN NULL
              ELSE rank() OVER (PARTITION BY b.season_id ORDER BY b.power_score DESC NULLS LAST) END AS rank_was,
         CASE WHEN a.power_score IS NULL THEN NULL
              ELSE rank() OVER (PARTITION BY b.season_id ORDER BY a.power_score DESC NULLS LAST) END AS rank_now
  FROM public.team_season_stats_pre_division_truth b
  LEFT JOIN public.v_team_season_agg a ON a.season_id = b.season_id AND a.team_id = b.team_id
)
SELECT se.name AS season,
       t.name AS team,
       round(sc.stored_raw * 100, 1) AS stored,
       round(sc.live_raw * 100, 1) AS live_rules,
       round(sc.after_raw * 100, 1) AS after,
       round((sc.after_raw - sc.stored_raw) * 100, 2) AS change,
       round((sc.after_raw - sc.live_raw) * 100, 2) AS fix_part,
       sc.rank_was,
       sc.rank_now,
       COALESCE(g.games_changed, 0) AS games_changed,
       COALESCE(g.via_override, 0) AS via_override
FROM scored sc
JOIN public.seasons se ON se.id = sc.season_id
JOIN public.teams t ON t.id = sc.team_id
LEFT JOIN games g ON g.season_id = sc.season_id AND g.team_id = sc.team_id
ORDER BY se.start_date, abs(sc.after_raw - sc.stored_raw) DESC NULLS LAST, t.name;

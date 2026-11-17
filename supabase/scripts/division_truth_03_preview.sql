-- Division truth, script 03: PREVIEW (hand-apply step 5, read-only).
--
-- NOT A MIGRATION. Paste the WHOLE file into the Supabase SQL Editor and run it.
-- Run it AFTER the data script (02) and BEFORE the recompute (04). It changes no
-- stored number. (It makes one temporary view that vanishes with the session.)
-- Doug looks at the result and approves, or does not.
--
-- APPROVING THIS TABLE ALSO APPROVES THE OLD-RULE CATCH-UP. About 62 team-seasons
-- already show a stored score that differs from what today's rules give (older rule
-- changes were never recomputed). The recompute fixes those too. They show up in
-- the live_rules column (live_rules is not equal to stored), not in fix_part.
--
-- ONE result, two parts, same columns. Every score is on the 0-100 scale the site
-- shows.
--   PART 1. One row per team in each of the six seasons (season = the season name).
--           Every team with a saved row in those seasons is listed, so expect over
--           100 rows (the three 2025 seasons have 30 or more teams each).
--   PART 2. Rows with season = CAREER: the team's CAREER score, for each team whose
--           career score changes. They come last.
--
-- THE COLUMNS
--   stored      the score the site shows TODAY (from the backup, script 01)
--   live_rules  the score TODAY's rules give, with no fix (backup, live_* columns).
--               stored vs live_rules is an OLD rule change that was never
--               recomputed. It is NOT caused by this fix.
--   after       the score after the fix (what the recompute would store)
--   change      after - stored      (what a player would see change)
--   fix_part    after - live_rules  (the part caused by THIS fix)
--   rank_was    place by stored score (1 = best, ties share). Part 1: place in that
--               season. Part 2: place among all teams that played a match.
--   rank_now    place by after score
--   games_changed  games of this team whose opponent weight changed (or that were
--                  unrated and now are rated). Part 2: the total over the six seasons.
--   via_override   games of this team now rated by an override row
--
-- A team with games_changed = 0 must have fix_part = 0.00. If not, tell the
-- developer. Part 1 is sorted by season, then the biggest absolute change first.
--
-- HOW THE CAREER ROWS ARE WORKED OUT. It is the real career formula, not a new one:
-- calculate_career_power_score() in migration 20261117120000 (lines 150-345), the
-- same as src/services/career/calculateCareerPowerScore.ts (lines 100-140). The
-- base is the average of the stored season scores (career_power_score, else
-- power_score) weighted by matches played (wins + losses), over ALL of a team's
-- seasons, not only the six, plus the live season from v_team_details. This script
-- swaps in the three numbers (stored, live_rules, after) for the six seasons and
-- keeps every other season as stored. The bonus (titles, runner-ups, playoffs) does
-- not change with this fix. It is read from the real function today:
-- bonus = calculate_career_power_score(team) - the base worked out from the stored
-- numbers. Career = the smaller of 100 and (base + bonus).
-- A team marked * had a career score of 100 today (capped). Its real bonus is at
-- least what is used here, so its live_rules and after scores are LOWER limits. The
-- rank is by score only: the site's list also hides some teams and breaks ties its
-- own way.

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
),
-- PART 2: the career score, in four versions (now, before, live rules, after).
-- One row per stored team-season, as calculate_career_power_score() reads them.
career_rows AS (
  SELECT s.team_id,
         COALESCE(s.match_wins, 0) + COALESCE(s.match_losses, 0) AS m,
         COALESCE(s.career_power_score, s.power_score) AS now_score,
         CASE WHEN b.team_id IS NOT NULL THEN COALESCE(b.career_power_score, b.power_score)
              ELSE COALESCE(s.career_power_score, s.power_score) END AS before_score,
         CASE WHEN b.team_id IS NOT NULL THEN COALESCE(b.live_career_power_score, b.live_power_score)
              ELSE COALESCE(s.career_power_score, s.power_score) END AS live_score,
         CASE WHEN b.team_id IS NOT NULL AND a.team_id IS NOT NULL
              THEN COALESCE(a.career_power_score, a.power_score)
              ELSE COALESCE(s.career_power_score, s.power_score) END AS after_score
  FROM public.team_season_stats s
  LEFT JOIN public.team_season_stats_pre_division_truth b
         ON b.season_id = s.season_id AND b.team_id = s.team_id
  LEFT JOIN public.v_team_season_agg a
         ON a.season_id = s.season_id AND a.team_id = s.team_id AND b.team_id IS NOT NULL
  -- the live season is not read here: the function reads it from v_team_details
  WHERE s.season_id IS DISTINCT FROM (SELECT id FROM public.seasons WHERE is_active = true LIMIT 1)
),
career_sums AS (
  SELECT r.team_id,
    sum(r.now_score    * 100 * r.m) FILTER (WHERE r.now_score    IS NOT NULL AND r.m > 0) AS ws_now,
    sum(r.m)                        FILTER (WHERE r.now_score    IS NOT NULL AND r.m > 0) AS ms_now,
    sum(r.before_score * 100 * r.m) FILTER (WHERE r.before_score IS NOT NULL AND r.m > 0) AS ws_before,
    sum(r.m)                        FILTER (WHERE r.before_score IS NOT NULL AND r.m > 0) AS ms_before,
    sum(r.live_score   * 100 * r.m) FILTER (WHERE r.live_score   IS NOT NULL AND r.m > 0) AS ws_live,
    sum(r.m)                        FILTER (WHERE r.live_score   IS NOT NULL AND r.m > 0) AS ms_live,
    sum(r.after_score  * 100 * r.m) FILTER (WHERE r.after_score  IS NOT NULL AND r.m > 0) AS ws_after,
    sum(r.m)                        FILTER (WHERE r.after_score  IS NOT NULL AND r.m > 0) AS ms_after
  FROM career_rows r
  GROUP BY r.team_id
),
-- the live season, as the function reads it (already on the 0-100 scale)
career_live_season AS (
  SELECT d.team_id,
         CASE WHEN COALESCE(d.career_power_score, d.power_score) IS NOT NULL
               AND COALESCE(d.wins, 0) + COALESCE(d.losses, 0) > 0
              THEN COALESCE(d.career_power_score, d.power_score) * (COALESCE(d.wins, 0) + COALESCE(d.losses, 0)) END AS ws,
         CASE WHEN COALESCE(d.career_power_score, d.power_score) IS NOT NULL
               AND COALESCE(d.wins, 0) + COALESCE(d.losses, 0) > 0
              THEN COALESCE(d.wins, 0) + COALESCE(d.losses, 0) END AS ms
  FROM public.v_team_details d
),
career_base AS (
  SELECT t.id AS team_id, t.name,
    CASE WHEN COALESCE(c.ms_now, 0)    + COALESCE(l.ms, 0) > 0 THEN (COALESCE(c.ws_now, 0)    + COALESCE(l.ws, 0)) / (COALESCE(c.ms_now, 0)    + COALESCE(l.ms, 0)) ELSE 0 END AS base_now,
    CASE WHEN COALESCE(c.ms_before, 0) + COALESCE(l.ms, 0) > 0 THEN (COALESCE(c.ws_before, 0) + COALESCE(l.ws, 0)) / (COALESCE(c.ms_before, 0) + COALESCE(l.ms, 0)) ELSE 0 END AS base_before,
    CASE WHEN COALESCE(c.ms_live, 0)   + COALESCE(l.ms, 0) > 0 THEN (COALESCE(c.ws_live, 0)   + COALESCE(l.ws, 0)) / (COALESCE(c.ms_live, 0)   + COALESCE(l.ms, 0)) ELSE 0 END AS base_live,
    CASE WHEN COALESCE(c.ms_after, 0)  + COALESCE(l.ms, 0) > 0 THEN (COALESCE(c.ws_after, 0)  + COALESCE(l.ws, 0)) / (COALESCE(c.ms_after, 0)  + COALESCE(l.ms, 0)) ELSE 0 END AS base_after,
    (COALESCE(c.ms_now, 0) + COALESCE(l.ms, 0)) AS matches_now,
    public.calculate_career_power_score(t.id) AS career_now
  FROM public.teams t
  LEFT JOIN career_sums c ON c.team_id = t.id
  LEFT JOIN career_live_season l ON l.team_id = t.id
),
career AS (
  SELECT b.team_id, b.name, b.matches_now,
         (b.career_now >= 100) AS capped,
         -- the bonus is the real career score today minus the base worked out from the
         -- stored numbers; when the score is capped at 100 this is a lower limit
         CASE WHEN b.career_now >= 100 THEN 100 - b.base_now ELSE b.career_now - b.base_now END AS bonus,
         b.base_before, b.base_live, b.base_after
  FROM career_base b
),
career_scored AS (
  SELECT c.team_id, c.name, c.capped, c.matches_now,
         least(100, c.base_before + c.bonus) AS before_raw,
         least(100, c.base_live   + c.bonus) AS live_raw,
         least(100, c.base_after  + c.bonus) AS after_raw
  FROM career c
),
career_ranked AS (
  SELECT cs.*,
         CASE WHEN cs.matches_now > 0 THEN rank() OVER (PARTITION BY (cs.matches_now > 0) ORDER BY cs.before_raw DESC) END AS rank_was,
         CASE WHEN cs.matches_now > 0 THEN rank() OVER (PARTITION BY (cs.matches_now > 0) ORDER BY cs.after_raw DESC) END AS rank_now
  FROM career_scored cs
)
SELECT x.season, x.team, x.stored, x.live_rules, x.after, x.change, x.fix_part,
       x.rank_was, x.rank_now, x.games_changed, x.via_override
FROM (
  SELECT 1 AS part, se.start_date AS season_date, abs(sc.after_raw - sc.stored_raw) AS sort_change,
         se.name AS season,
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
  UNION ALL
  SELECT 2, NULL, abs(cr.after_raw - cr.before_raw),
         'CAREER',
         cr.name || CASE WHEN cr.capped THEN ' *' ELSE '' END,
         round(cr.before_raw, 1),
         round(cr.live_raw, 1),
         round(cr.after_raw, 1),
         round(cr.after_raw - cr.before_raw, 2),
         round(cr.after_raw - cr.live_raw, 2),
         cr.rank_was,
         cr.rank_now,
         COALESCE((SELECT sum(g.games_changed) FROM games g WHERE g.team_id = cr.team_id), 0),
         COALESCE((SELECT sum(g.via_override) FROM games g WHERE g.team_id = cr.team_id), 0)
  FROM career_ranked cr
  WHERE round(cr.after_raw, 2) <> round(cr.before_raw, 2)
     OR round(cr.live_raw, 2) <> round(cr.before_raw, 2)
) x
ORDER BY x.part, x.season_date, x.sort_change DESC NULLS LAST, x.team;

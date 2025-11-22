-- Phase 1: Add season_id to brackets table
ALTER TABLE brackets 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id);

-- Phase 2: Backfill season_id for existing brackets
UPDATE brackets b
SET season_id = s.id
FROM seasons s
WHERE b.season_id IS NULL
  AND b.created_at >= s.start_date
  AND (s.end_date IS NULL OR b.created_at <= s.end_date);

-- Assign remaining brackets to active season
UPDATE brackets
SET season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
WHERE season_id IS NULL;

-- Phase 3: Drop and recreate v_team_season_agg with playoff data
DROP VIEW IF EXISTS v_team_season_agg CASCADE;

CREATE VIEW v_team_season_agg AS
WITH regular_season_matches AS (
  SELECT 
    t.id AS team_id,
    m.season_id,
    t.division_id,
    CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END AS match_wins,
    CASE WHEN m.loser_id = t.id THEN 1 ELSE 0 END AS match_losses,
    CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0) 
         WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0) 
         ELSE 0 END AS game_wins,
    CASE WHEN m.team1_id = t.id THEN COALESCE(m.team2_game_wins, 0)
         WHEN m.team2_id = t.id THEN COALESCE(m.team1_game_wins, 0)
         ELSE 0 END AS game_losses,
    m.winner_id,
    m.loser_id
  FROM teams t
  JOIN matches m ON (m.team1_id = t.id OR m.team2_id = t.id)
  WHERE m.iscompleted = true AND m.season_id IS NOT NULL
),
archived_season_matches AS (
  SELECT 
    t.id AS team_id,
    ma.season_id,
    t.division_id,
    CASE WHEN ma.winner_id = t.id THEN 1 ELSE 0 END AS match_wins,
    CASE WHEN ma.loser_id = t.id THEN 1 ELSE 0 END AS match_losses,
    CASE WHEN ma.team1_id = t.id THEN COALESCE(ma.team1_game_wins, 0)
         WHEN ma.team2_id = t.id THEN COALESCE(ma.team2_game_wins, 0)
         ELSE 0 END AS game_wins,
    CASE WHEN ma.team1_id = t.id THEN COALESCE(ma.team2_game_wins, 0)
         WHEN ma.team2_id = t.id THEN COALESCE(ma.team1_game_wins, 0)
         ELSE 0 END AS game_losses,
    ma.winner_id,
    ma.loser_id
  FROM teams t
  JOIN matches_archive ma ON (ma.team1_id = t.id OR ma.team2_id = t.id)
  WHERE ma.iscompleted = true AND ma.season_id IS NOT NULL
),
playoff_season_matches AS (
  SELECT 
    t.id AS team_id,
    b.season_id,
    t.division_id,
    CASE WHEN pm.winner_id = t.id THEN 1 ELSE 0 END AS match_wins,
    CASE WHEN pm.loser_id = t.id THEN 1 ELSE 0 END AS match_losses,
    CASE WHEN pm.team1_id = t.id THEN COALESCE(pm.team1_score, 0)
         WHEN pm.team2_id = t.id THEN COALESCE(pm.team2_score, 0)
         ELSE 0 END AS game_wins,
    CASE WHEN pm.team1_id = t.id THEN COALESCE(pm.team2_score, 0)
         WHEN pm.team2_id = t.id THEN COALESCE(pm.team1_score, 0)
         ELSE 0 END AS game_losses,
    pm.winner_id,
    pm.loser_id
  FROM teams t
  JOIN playoff_matches pm ON (pm.team1_id = t.id OR pm.team2_id = t.id)
  JOIN brackets b ON pm.bracket_id = b.id
  WHERE pm.winner_id IS NOT NULL AND b.season_id IS NOT NULL
),
all_matches AS (
  SELECT * FROM regular_season_matches
  UNION ALL
  SELECT * FROM archived_season_matches
  UNION ALL
  SELECT * FROM playoff_season_matches
),
opponent_weights AS (
  SELECT 
    am.team_id,
    am.season_id,
    CASE 
      WHEN am.winner_id = am.team_id THEN opp_div.division_weight
      WHEN am.loser_id = am.team_id THEN opp_div.division_weight
      ELSE NULL
    END AS opponent_weight,
    am.match_wins,
    am.game_wins
  FROM all_matches am
  LEFT JOIN teams opp_team ON (
    CASE 
      WHEN am.winner_id = am.team_id THEN am.loser_id
      WHEN am.loser_id = am.team_id THEN am.winner_id
    END = opp_team.id
  )
  LEFT JOIN divisions opp_div ON opp_team.division_id = opp_div.id
)
SELECT 
  am.team_id,
  am.season_id,
  SUM(am.match_wins)::integer AS match_wins,
  SUM(am.match_losses)::integer AS match_losses,
  SUM(am.game_wins)::integer AS game_wins,
  SUM(am.game_losses)::integer AS game_losses,
  COALESCE(AVG(ow.opponent_weight), 0.5) AS sos,
  CASE 
    WHEN SUM(am.match_wins + am.match_losses) > 0 THEN
      (0.40 * COALESCE(
        SUM(CASE WHEN am.match_wins = 1 THEN ow.opponent_weight ELSE 0 END) / 
        NULLIF(SUM(am.match_wins + am.match_losses), 0), 0
      )) +
      (0.45 * COALESCE(AVG(ow.opponent_weight), 0.5)) +
      (0.15 * CASE 
        WHEN SUM(am.game_wins + am.game_losses) > 0 THEN
          COALESCE(
            SUM(CASE WHEN am.game_wins > 0 THEN ow.opponent_weight * am.game_wins ELSE 0 END) /
            NULLIF(SUM(am.game_wins + am.game_losses), 0), 0
          )
        ELSE 0
      END)
    ELSE NULL
  END AS power_score
FROM all_matches am
LEFT JOIN opponent_weights ow ON am.team_id = ow.team_id AND am.season_id = ow.season_id
GROUP BY am.team_id, am.season_id;

-- Phase 4: Recalculate all stats with playoff data
SELECT upsert_team_season_stats();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_brackets_season_id ON brackets(season_id);

-- =============================================================
-- One-time data repair: fix division_name in team_season_stats
-- for all pre-Winter 2026 seasons
-- =============================================================

-- -----------------------------------------------
-- FALL 2025: Use bracket participants to assign
-- correct division names (Intermediate 1, Intermediate 2, etc.)
-- -----------------------------------------------
UPDATE team_season_stats tss
SET division_name = (
  SELECT
    CASE
      WHEN b.title ILIKE 'Competitive%' THEN 'Competitive'
      WHEN b.title ILIKE 'Intermediate 1%' THEN 'Intermediate 1'
      WHEN b.title ILIKE 'Intermediate 2%' THEN 'Intermediate 2'
      WHEN b.title ILIKE 'Recreational%' THEN 'Recreational'
      ELSE b.title
    END
  FROM participants p
  JOIN brackets b ON b.id = p.bracket_id
  WHERE p.team_id = tss.team_id
    AND b.season_id = tss.season_id
  LIMIT 1
)
WHERE tss.season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND EXISTS (
    SELECT 1 FROM participants p
    JOIN brackets b ON b.id = p.bracket_id
    WHERE p.team_id = tss.team_id
      AND b.season_id = tss.season_id
  );

-- -----------------------------------------------
-- SPRING 2025: Fix Hidden teams using team_details_archive
-- -----------------------------------------------
UPDATE team_season_stats tss
SET division_name = tda.divisionname
FROM team_details_archive tda
WHERE tda.team_id = tss.team_id
  AND tda.season_id = tss.season_id
  AND tss.season_id = 'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a'
  AND tss.division_name = 'Hidden'
  AND tda.divisionname IS NOT NULL
  AND tda.divisionname != 'Hidden';

-- -----------------------------------------------
-- SUMMER 1 2025: Fix Hidden teams using team_details_archive
-- -----------------------------------------------
UPDATE team_season_stats tss
SET division_name = tda.divisionname
FROM team_details_archive tda
WHERE tda.team_id = tss.team_id
  AND tda.season_id = tss.season_id
  AND tss.season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
  AND tss.division_name = 'Hidden'
  AND tda.divisionname IS NOT NULL
  AND tda.divisionname != 'Hidden';

-- -----------------------------------------------
-- SUMMER 2 2025: Fix Hidden teams using team_details_archive
-- -----------------------------------------------
UPDATE team_season_stats tss
SET division_name = tda.divisionname
FROM team_details_archive tda
WHERE tda.team_id = tss.team_id
  AND tda.season_id = tss.season_id
  AND tss.season_id = 'd50bb12e-99be-4170-802a-695a402373ce'
  AND tss.division_name = 'Hidden'
  AND tda.divisionname IS NOT NULL
  AND tda.divisionname != 'Hidden';

-- Function to check if a team has any remaining matches in a season and delete stats if none exist
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_team_season_stat(
  p_team_id uuid,
  p_season_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only delete if the team has NO completed matches in this season across all three match sources
  IF NOT EXISTS (
    SELECT 1 FROM matches m 
    WHERE m.season_id = p_season_id 
      AND (m.team1_id = p_team_id OR m.team2_id = p_team_id)
      AND m.iscompleted = true
  ) AND NOT EXISTS (
    SELECT 1 FROM matches_archive ma 
    WHERE ma.season_id = p_season_id 
      AND (ma.team1_id = p_team_id OR ma.team2_id = p_team_id)
      AND ma.iscompleted = true
  ) AND NOT EXISTS (
    SELECT 1 FROM playoff_matches pm
    JOIN brackets b ON pm.bracket_id = b.id
    WHERE b.season_id = p_season_id 
      AND (pm.team1_id = p_team_id OR pm.team2_id = p_team_id)
      AND pm.winner_id IS NOT NULL
  ) THEN
    DELETE FROM public.team_season_stats
    WHERE team_id = p_team_id AND season_id = p_season_id;
  END IF;
END;
$$;

-- Trigger function for matches and matches_archive tables
CREATE OR REPLACE FUNCTION public.trigger_cleanup_team_season_stats_on_match_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.iscompleted = true AND OLD.season_id IS NOT NULL THEN
    IF OLD.team1_id IS NOT NULL THEN
      PERFORM cleanup_orphaned_team_season_stat(OLD.team1_id, OLD.season_id);
    END IF;
    IF OLD.team2_id IS NOT NULL THEN
      PERFORM cleanup_orphaned_team_season_stat(OLD.team2_id, OLD.season_id);
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

-- Trigger function for playoff_matches table
CREATE OR REPLACE FUNCTION public.trigger_cleanup_team_season_stats_on_playoff_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_id uuid;
BEGIN
  IF OLD.winner_id IS NOT NULL AND OLD.bracket_id IS NOT NULL THEN
    SELECT season_id INTO v_season_id FROM brackets WHERE id = OLD.bracket_id;
    IF v_season_id IS NOT NULL THEN
      IF OLD.team1_id IS NOT NULL THEN
        PERFORM cleanup_orphaned_team_season_stat(OLD.team1_id, v_season_id);
      END IF;
      IF OLD.team2_id IS NOT NULL THEN
        PERFORM cleanup_orphaned_team_season_stat(OLD.team2_id, v_season_id);
      END IF;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

-- Create triggers on all match tables
DROP TRIGGER IF EXISTS cleanup_team_stats_on_match_delete ON matches;
CREATE TRIGGER cleanup_team_stats_on_match_delete
  AFTER DELETE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_team_season_stats_on_match_delete();

DROP TRIGGER IF EXISTS cleanup_team_stats_on_match_archive_delete ON matches_archive;
CREATE TRIGGER cleanup_team_stats_on_match_archive_delete
  AFTER DELETE ON matches_archive
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_team_season_stats_on_match_delete();

DROP TRIGGER IF EXISTS cleanup_team_stats_on_playoff_delete ON playoff_matches;
CREATE TRIGGER cleanup_team_stats_on_playoff_delete
  AFTER DELETE ON playoff_matches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_team_season_stats_on_playoff_delete();

-- Create a trigger to automatically detect and award badges when matches are completed
CREATE OR REPLACE FUNCTION public.detect_and_award_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only process when a match is marked as completed
  IF NEW.iscompleted = true AND (OLD.iscompleted IS NULL OR OLD.iscompleted = false) THEN
    -- Call the badge manager edge function to detect and award badges
    PERFORM
      net.http_post(
        url := 'https://wcitdamvochthvxvtxyb.supabase.co/functions/v1/badge-manager',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjaXRkYW12b2NodGh2eHZ0eHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDMwMjI3MCwiZXhwIjoyMDU5ODc4MjcwfQ.z_YGGEsJqZrFnpuGwzLNF0pDl0QCNZNHh6lPi2-nvLs"}'::jsonb,
        body := json_build_object(
          'event_type', 'match_completed',
          'match_id', NEW.id,
          'winner_id', NEW.winner_id,
          'loser_id', NEW.loser_id,
          'team1_id', NEW.team1_id,
          'team2_id', NEW.team2_id,
          'team1_score', NEW.team1_score,
          'team2_score', NEW.team2_score
        )::jsonb
      );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on matches table
DROP TRIGGER IF EXISTS trigger_detect_badges ON public.matches;
CREATE TRIGGER trigger_detect_badges
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_and_award_badges();

-- Add indexes for better performance on badge queries
CREATE INDEX IF NOT EXISTS idx_team_badge_events_team_active 
ON public.team_badge_events(team_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_team_badge_events_badge_type 
ON public.team_badge_events(badge_type, is_active);

-- Enable realtime for team_badge_events table
ALTER TABLE public.team_badge_events REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.team_badge_events;

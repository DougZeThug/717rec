
-- Create weekly heat rankings table
CREATE TABLE public.weekly_heat_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of DATE NOT NULL, -- Monday of the week
  team_id UUID NOT NULL REFERENCES public.teams(id),
  heat_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  upsets INTEGER NOT NULL DEFAULT 0,
  streak_bonus DECIMAL(3,1) NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  streak_type TEXT CHECK (streak_type IN ('win', 'loss', 'none')) DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(week_of, team_id)
);

-- Create weekly highlights table
CREATE TABLE public.weekly_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of DATE NOT NULL,
  highlight_type TEXT NOT NULL CHECK (highlight_type IN ('upset', 'streak_start', 'streak_continue', 'streak_end')),
  team_id UUID NOT NULL REFERENCES public.teams(id),
  opponent_id UUID REFERENCES public.teams(id),
  match_id UUID REFERENCES public.matches(id),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create weekly digests table
CREATE TABLE public.weekly_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of DATE NOT NULL UNIQUE, -- Monday of the week
  total_matches INTEGER NOT NULL DEFAULT 0,
  total_upsets INTEGER NOT NULL DEFAULT 0,
  hottest_team_id UUID REFERENCES public.teams(id),
  coolest_team_id UUID REFERENCES public.teams(id),
  digest_data JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_weekly_heat_rankings_week_score ON public.weekly_heat_rankings(week_of, heat_score DESC);
CREATE INDEX idx_weekly_heat_rankings_team ON public.weekly_heat_rankings(team_id, week_of);
CREATE INDEX idx_weekly_highlights_week ON public.weekly_highlights(week_of, highlight_type);
CREATE INDEX idx_weekly_digests_week ON public.weekly_digests(week_of DESC);

-- Create function to get Monday of a given date
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT input_date - INTERVAL '1 day' * EXTRACT(DOW FROM input_date) + INTERVAL '1 day';
$$;

-- Create function to calculate team's current streak
CREATE OR REPLACE FUNCTION calculate_team_streak(p_team_id UUID, p_end_date DATE)
RETURNS TABLE(streak_count INTEGER, streak_type TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  current_streak INTEGER := 0;
  current_type TEXT := 'none';
  match_record RECORD;
BEGIN
  -- Get recent matches in reverse chronological order
  FOR match_record IN 
    SELECT 
      CASE 
        WHEN winner_id = p_team_id THEN 'win'
        WHEN loser_id = p_team_id THEN 'loss'
        ELSE NULL
      END as result
    FROM matches
    WHERE (winner_id = p_team_id OR loser_id = p_team_id)
      AND iscompleted = true
      AND date <= p_end_date
    ORDER BY date DESC, created_at DESC
  LOOP
    -- If this is the first match, set the streak type
    IF current_streak = 0 THEN
      current_type := match_record.result;
      current_streak := 1;
    -- If the result matches current streak, increment
    ELSIF match_record.result = current_type THEN
      current_streak := current_streak + 1;
    -- If the result is different, break the streak
    ELSE
      EXIT;
    END IF;
  END LOOP;

  -- Only return meaningful streaks (2 or more)
  IF current_streak >= 2 THEN
    RETURN QUERY SELECT current_streak, current_type;
  ELSE
    RETURN QUERY SELECT 0, 'none'::TEXT;
  END IF;
END;
$$;

-- Create main function to generate weekly digest
CREATE OR REPLACE FUNCTION generate_weekly_digest(p_week_of DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  week_start DATE;
  week_end DATE;
  team_record RECORD;
  match_record RECORD;
  highlight_record RECORD;
  total_matches INTEGER := 0;
  total_upsets INTEGER := 0;
  hottest_team_id UUID;
  coolest_team_id UUID;
  max_heat DECIMAL := -999;
  min_heat DECIMAL := 999;
  digest_result JSONB;
BEGIN
  -- Default to current week if not specified
  IF p_week_of IS NULL THEN
    week_start := get_week_start(CURRENT_DATE);
  ELSE
    week_start := get_week_start(p_week_of);
  END IF;
  
  week_end := week_start + INTERVAL '6 days';
  
  RAISE NOTICE 'Generating weekly digest for week: % to %', week_start, week_end;
  
  -- Clear existing data for this week
  DELETE FROM weekly_heat_rankings WHERE week_of = week_start;
  DELETE FROM weekly_highlights WHERE week_of = week_start;
  DELETE FROM weekly_digests WHERE week_of = week_start;
  
  -- Calculate heat scores for each team
  FOR team_record IN 
    SELECT DISTINCT t.id, t.name
    FROM teams t
    WHERE EXISTS (
      SELECT 1 FROM matches m 
      WHERE (m.team1_id = t.id OR m.team2_id = t.id)
        AND m.iscompleted = true
        AND m.date >= week_start
        AND m.date <= week_end
    )
  LOOP
    DECLARE
      team_wins INTEGER := 0;
      team_losses INTEGER := 0;
      team_upsets INTEGER := 0;
      team_heat DECIMAL := 0;
      streak_info RECORD;
      streak_bonus DECIMAL := 0;
    BEGIN
      -- Count wins, losses, and upsets for this team this week
      FOR match_record IN
        SELECT 
          m.*,
          winner_div.division_weight as winner_weight,
          loser_div.division_weight as loser_weight
        FROM matches m
        LEFT JOIN teams winner_team ON m.winner_id = winner_team.id
        LEFT JOIN divisions winner_div ON winner_team.division_id = winner_div.id
        LEFT JOIN teams loser_team ON m.loser_id = loser_team.id  
        LEFT JOIN divisions loser_div ON loser_team.division_id = loser_div.id
        WHERE (m.team1_id = team_record.id OR m.team2_id = team_record.id)
          AND m.iscompleted = true
          AND m.date >= week_start
          AND m.date <= week_end
        ORDER BY m.date, m.created_at
      LOOP
        total_matches := total_matches + 1;
        
        IF match_record.winner_id = team_record.id THEN
          -- Team won
          team_wins := team_wins + 1;
          team_heat := team_heat + 3; -- Base win points
          
          -- Check for upset (winner has lower division weight)
          IF match_record.loser_weight IS NOT NULL AND match_record.winner_weight IS NOT NULL THEN
            IF match_record.loser_weight - match_record.winner_weight >= 0.25 THEN
              team_upsets := team_upsets + 1;
              team_heat := team_heat + 2; -- Upset bonus
              total_upsets := total_upsets + 1;
              
              -- Record upset highlight
              INSERT INTO weekly_highlights (
                week_of, highlight_type, team_id, opponent_id, match_id, 
                description, metadata
              ) VALUES (
                week_start, 'upset', team_record.id, match_record.loser_id, match_record.id,
                format('%s upset %s (division weight difference: %.2f)', 
                  team_record.name, 
                  (SELECT name FROM teams WHERE id = match_record.loser_id),
                  match_record.loser_weight - match_record.winner_weight),
                jsonb_build_object(
                  'winner_weight', match_record.winner_weight,
                  'loser_weight', match_record.loser_weight,
                  'weight_difference', match_record.loser_weight - match_record.winner_weight
                )
              );
            END IF;
          END IF;
          
        ELSIF match_record.loser_id = team_record.id THEN
          -- Team lost
          team_losses := team_losses + 1;
          team_heat := team_heat - 1; -- Base loss penalty
        END IF;
      END LOOP;
      
      -- Calculate streak bonus
      SELECT * INTO streak_info FROM calculate_team_streak(team_record.id, week_end);
      
      IF streak_info.streak_count > 2 THEN
        streak_bonus := (streak_info.streak_count - 2) * 0.5;
        team_heat := team_heat + streak_bonus;
        
        -- Record streak highlight
        INSERT INTO weekly_highlights (
          week_of, highlight_type, team_id, match_id,
          description, metadata
        ) VALUES (
          week_start, 'streak_continue', team_record.id, NULL,
          format('%s is on a %d-game %s streak', 
            team_record.name, 
            streak_info.streak_count, 
            streak_info.streak_type),
          jsonb_build_object(
            'streak_count', streak_info.streak_count,
            'streak_type', streak_info.streak_type,
            'bonus_points', streak_bonus
          )
        );
      END IF;
      
      -- Insert heat ranking for this team
      INSERT INTO weekly_heat_rankings (
        week_of, team_id, heat_score, wins, losses, upsets, 
        streak_bonus, current_streak, streak_type
      ) VALUES (
        week_start, team_record.id, team_heat, team_wins, team_losses, 
        team_upsets, streak_bonus, COALESCE(streak_info.streak_count, 0), 
        COALESCE(streak_info.streak_type, 'none')
      );
      
      -- Track hottest and coolest teams
      IF team_heat > max_heat THEN
        max_heat := team_heat;
        hottest_team_id := team_record.id;
      END IF;
      
      IF team_heat < min_heat THEN
        min_heat := team_heat;
        coolest_team_id := team_record.id;
      END IF;
    END;
  END LOOP;
  
  -- Build digest data
  digest_result := jsonb_build_object(
    'week_of', week_start,
    'week_end', week_end,
    'total_matches', total_matches / 2, -- Divide by 2 since each match involves 2 teams
    'total_upsets', total_upsets,
    'hottest_team', (
      SELECT jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'heat_score', max_heat
      )
      FROM teams t WHERE t.id = hottest_team_id
    ),
    'coolest_team', (
      SELECT jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'heat_score', min_heat
      )
      FROM teams t WHERE t.id = coolest_team_id
    ),
    'top_performers', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'team_id', whr.team_id,
          'team_name', t.name,
          'heat_score', whr.heat_score,
          'wins', whr.wins,
          'losses', whr.losses,
          'upsets', whr.upsets,
          'streak_bonus', whr.streak_bonus
        ) ORDER BY whr.heat_score DESC
      )
      FROM weekly_heat_rankings whr
      JOIN teams t ON whr.team_id = t.id
      WHERE whr.week_of = week_start
      LIMIT 10
    ),
    'highlights', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', wh.highlight_type,
          'team_id', wh.team_id,
          'team_name', t.name,
          'description', wh.description,
          'metadata', wh.metadata
        ) ORDER BY wh.created_at
      )
      FROM weekly_highlights wh
      JOIN teams t ON wh.team_id = t.id
      WHERE wh.week_of = week_start
    )
  );
  
  -- Insert weekly digest summary
  INSERT INTO weekly_digests (
    week_of, total_matches, total_upsets, hottest_team_id, 
    coolest_team_id, digest_data
  ) VALUES (
    week_start, total_matches / 2, total_upsets, hottest_team_id, 
    coolest_team_id, digest_result
  );
  
  RAISE NOTICE 'Weekly digest generated successfully for %', week_start;
  RETURN digest_result;
END;
$$;

-- Enable cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weekly digest generation for Mondays at 2:00 AM ET (7:00 AM UTC)
SELECT cron.schedule(
  'weekly-heat-digest',
  '0 7 * * 1', -- Every Monday at 7:00 AM UTC (2:00 AM ET)
  $$SELECT generate_weekly_digest();$$
);

-- Enable realtime for the new tables
ALTER TABLE public.weekly_heat_rankings REPLICA IDENTITY FULL;
ALTER TABLE public.weekly_highlights REPLICA IDENTITY FULL;
ALTER TABLE public.weekly_digests REPLICA IDENTITY FULL;

ALTER publication supabase_realtime ADD TABLE public.weekly_heat_rankings;
ALTER publication supabase_realtime ADD TABLE public.weekly_highlights;
ALTER publication supabase_realtime ADD TABLE public.weekly_digests;

-- 1. Fix award_streak_badges search_path
CREATE OR REPLACE FUNCTION public.award_streak_badges(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  streak_info RECORD;
  badge_awarded boolean := false;
  result jsonb := '{"awarded": [], "revoked": []}'::jsonb;
  hot_streak_threshold integer := 4;
  cold_streak_threshold integer := 4;
  active_season_id uuid;
BEGIN
  SELECT id INTO active_season_id FROM public.seasons WHERE is_active = true LIMIT 1;

  SELECT INTO streak_info * FROM public.calculate_team_streak(p_team_id);
  
  UPDATE public.team_badge_events 
  SET is_active = false 
  WHERE team_id = p_team_id 
    AND badge_type IN ('hot_streak', 'cold_streak')
    AND is_active = true;
  
  IF streak_info.streak_type IS NULL OR streak_info.streak_count = 0 THEN
    result := jsonb_set(result, '{revoked}', '["hot_streak", "cold_streak"]'::jsonb);
    RETURN result;
  END IF;
  
  IF streak_info.streak_type = 'win' AND streak_info.streak_count >= hot_streak_threshold THEN
    INSERT INTO public.team_badge_events (team_id, badge_type, metadata, season_id)
    VALUES (
      p_team_id, 
      'hot_streak', 
      jsonb_build_object('streak_count', streak_info.streak_count),
      active_season_id
    )
    ON CONFLICT (team_id, badge_type, season_id)
    DO UPDATE SET 
      is_active = true, 
      awarded_at = now(),
      metadata = jsonb_build_object('streak_count', streak_info.streak_count);
    
    result := jsonb_set(result, '{awarded}', '["hot_streak"]'::jsonb);
    result := jsonb_set(result, '{revoked}', '["cold_streak"]'::jsonb);
    badge_awarded := true;
    
  ELSIF streak_info.streak_type = 'loss' AND streak_info.streak_count >= cold_streak_threshold THEN
    INSERT INTO public.team_badge_events (team_id, badge_type, metadata, season_id)
    VALUES (
      p_team_id, 
      'cold_streak', 
      jsonb_build_object('streak_count', streak_info.streak_count),
      active_season_id
    )
    ON CONFLICT (team_id, badge_type, season_id)
    DO UPDATE SET 
      is_active = true, 
      awarded_at = now(),
      metadata = jsonb_build_object('streak_count', streak_info.streak_count);
    
    result := jsonb_set(result, '{awarded}', '["cold_streak"]'::jsonb);
    result := jsonb_set(result, '{revoked}', '["hot_streak"]'::jsonb);
    badge_awarded := true;
    
  ELSE
    result := jsonb_set(result, '{revoked}', '["hot_streak", "cold_streak"]'::jsonb);
  END IF;
  
  RETURN result;
END;
$$;

-- 2. Restrict teams bucket upload to authenticated users only
DROP POLICY IF EXISTS "Allow anyone to upload team images" ON storage.objects;
CREATE POLICY "Authenticated upload team images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'teams');

-- 3. Tighten team_memberships INSERT policies to prevent self-approval
DROP POLICY IF EXISTS "Users can create their membership" ON public.team_memberships;
DROP POLICY IF EXISTS "Users create own membership" ON public.team_memberships;

CREATE POLICY "Users can create their membership"
  ON public.team_memberships FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_approved = false
    AND approved_by IS NULL
    AND approved_at IS NULL
  );
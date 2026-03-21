

## Fix: Cold Streak Badge Not Clearing After a Win

### Root Cause
The `calculate_team_streak` SQL function filters matches with `AND m.date IS NOT NULL`. When a match is completed via score submission, the `date` field is often not set. This means the winning match is invisible to the streak calculator.

The flow after a match completes:
1. `award_streak_badges` deactivates all existing streak badges
2. `calculate_team_streak` recalculates the current streak — but skips the new win because `date IS NULL`
3. The old losing streak is still detected from dated matches
4. Cold streak badge is re-awarded immediately after being deactivated

### Fix

**File: `supabase/migrations/` — new migration**

Update `calculate_team_streak` to fall back to `created_at` when `date` is null:

```sql
CREATE OR REPLACE FUNCTION calculate_team_streak(p_team_id uuid)
RETURNS TABLE(streak_type text, streak_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_matches RECORD;
  current_streak_type text := null;
  current_streak_count integer := 0;
  match_result text;
BEGIN
  FOR recent_matches IN 
    SELECT 
      m.id,
      m.winner_id,
      COALESCE(m.date, m.created_at) as effective_date
    FROM matches m
    WHERE m.iscompleted = true 
      AND (m.team1_id = p_team_id OR m.team2_id = p_team_id)
    ORDER BY COALESCE(m.date, m.created_at) DESC
    LIMIT 20
  LOOP
    IF recent_matches.winner_id = p_team_id THEN
      match_result := 'win';
    ELSE
      match_result := 'loss';
    END IF;
    
    IF current_streak_type IS NULL THEN
      current_streak_type := match_result;
      current_streak_count := 1;
    ELSIF current_streak_type = match_result THEN
      current_streak_count := current_streak_count + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT current_streak_type, current_streak_count;
END;
$$;
```

Key change: Replace `AND m.date IS NOT NULL` / `ORDER BY m.date DESC` with `COALESCE(m.date, m.created_at)`. This ensures matches without an explicit date are still included in streak calculations using their creation timestamp.

### Impact
- Single SQL migration, no frontend code changes
- Fixes the cold streak badge persisting after a win
- Also fixes hot streak badges that might not appear for the same reason
- All other badge logic remains unchanged


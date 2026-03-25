

## Fix Badge 409 Conflict Error

### Root Cause
The `award_streak_badges` database function has a bug:
1. It sets existing streak badges to `is_active = false` (but the row remains)
2. Then it does a plain `INSERT` into `team_badge_events`
3. The unique constraint `(team_id, badge_type, season_id)` rejects the insert because the deactivated row still occupies that slot

Other badge functions (kingslayer, clutch_performer, consistent_performer) correctly use `ON CONFLICT ... DO UPDATE`, but `award_streak_badges` does not.

### Fix
**Database migration** -- Update `award_streak_badges` to use `ON CONFLICT (team_id, badge_type, season_id) DO UPDATE` for both hot_streak and cold_streak inserts, matching the pattern used by all other badge functions.

The two INSERT statements in the function will change from:
```sql
INSERT INTO team_badge_events (team_id, badge_type, metadata, season_id)
VALUES (p_team_id, 'hot_streak', ..., season_id);
```
To:
```sql
INSERT INTO team_badge_events (team_id, badge_type, metadata, season_id)
VALUES (p_team_id, 'hot_streak', ..., season_id)
ON CONFLICT (team_id, badge_type, season_id)
DO UPDATE SET is_active = true, awarded_at = now(),
  metadata = jsonb_build_object('streak_count', streak_info.streak_count);
```

Same change for the `cold_streak` insert.

### Files
- **Migration**: One SQL migration to replace the `award_streak_badges` function

No frontend code changes needed -- the client-side error handling already gracefully catches and logs badge failures.


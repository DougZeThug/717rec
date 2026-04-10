

## Plan: Sync Brackets-Manager Match Results to playoff_matches

### What's happening now

Your app has two separate match tables:
- **`match`** table: used by the brackets-manager library (numeric IDs, stores participant IDs)
- **`playoff_matches`** table: used by career stats, team history, and the bracket viewer (UUIDs, stores team UUIDs)

When you create a bracket, the `create-bracket` edge function creates rows in BOTH tables. When you score a match through the **legacy match editor**, it updates both tables. But when you score through the **brackets-manager editor** (clicking directly on bracket matches), it only updates the `match` table -- the `playoff_matches` table doesn't get updated, so career stats miss those results.

A previous migration file (`20260112200000_sync_match_to_playoff_matches.sql`) exists in the repo but was **never applied** to the database. It only handled INSERT (creating shell rows), not UPDATE (syncing scores).

### What we'll do

#### Step 1: Database migration -- Add `match_id` column and sync triggers

One migration that:

1. **Adds `match_id` column** to `playoff_matches` (integer, nullable, unique) with a FK to `match.id`
2. **Backfills `match_id`** on existing rows by matching on `bracket_id + round + position + match_type` between the two tables
3. **Creates an INSERT trigger** on `match` that auto-creates a `playoff_matches` shell row (same as the unapplied migration)
4. **Creates an UPDATE trigger** on `match` that syncs score/winner/status changes to the corresponding `playoff_matches` row, using `match_id` for the join. The trigger will:
   - Map `opponent1_id`/`opponent2_id` to team UUIDs via the `participant` table
   - Map `opponent1_result`/`opponent2_result` to `winner_id`/`loser_id`
   - Map `opponent1_score`/`opponent2_score` to `team1_score`/`team2_score`
   - Map numeric `status` (4 = completed) to text status
5. **Backfills existing completed matches** from `match` table that have results not yet reflected in `playoff_matches` (the ~20 matches scored via brackets-manager editor)

#### Step 2: Fix participant.team_id for older brackets

Many older `participant` rows have `team_id = NULL`. The UPDATE trigger needs this to resolve team UUIDs. We'll backfill by matching `participant.name` to `teams.name`.

### Technical details

**Trigger function for UPDATE** (key logic):
```sql
CREATE OR REPLACE FUNCTION sync_match_update_to_playoff_matches()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_team1_id UUID; v_team2_id UUID;
  v_winner_id UUID; v_loser_id UUID;
BEGIN
  -- Only sync when scores/results/status change
  IF OLD.status = NEW.status 
     AND OLD.opponent1_score IS NOT DISTINCT FROM NEW.opponent1_score
     AND OLD.opponent2_score IS NOT DISTINCT FROM NEW.opponent2_score
     AND OLD.opponent1_result IS NOT DISTINCT FROM NEW.opponent1_result
     AND OLD.opponent2_result IS NOT DISTINCT FROM NEW.opponent2_result
     AND OLD.opponent1_id IS NOT DISTINCT FROM NEW.opponent1_id
     AND OLD.opponent2_id IS NOT DISTINCT FROM NEW.opponent2_id
  THEN RETURN NEW;
  END IF;
  
  -- Look up team UUIDs from participant table
  SELECT p.team_id INTO v_team1_id FROM participant p WHERE p.id = NEW.opponent1_id;
  SELECT p.team_id INTO v_team2_id FROM participant p WHERE p.id = NEW.opponent2_id;
  
  -- Determine winner/loser
  IF NEW.opponent1_result = 'win' THEN v_winner_id := v_team1_id; v_loser_id := v_team2_id;
  ELSIF NEW.opponent2_result = 'win' THEN v_winner_id := v_team2_id; v_loser_id := v_team1_id;
  END IF;
  
  UPDATE playoff_matches SET
    team1_id = v_team1_id, team2_id = v_team2_id,
    team1_score = NEW.opponent1_score, team2_score = NEW.opponent2_score,
    winner_id = v_winner_id, loser_id = v_loser_id,
    status = CASE NEW.status WHEN 4 THEN 'completed' ELSE 'pending' END,
    updated_at = NOW()
  WHERE match_id = NEW.id;
  
  RETURN NEW;
END; $$;
```

### What changes

- **1 migration file** -- adds column, backfills linkage, creates both triggers, backfills scores
- **0 code changes** -- the sync is entirely database-side; no hooks or services need modification

### Why this approach

- The career system (`CareerFetchService`, `CareerBulkFetchService`, `TeamSeasonStatsService`) already reads from `playoff_matches` -- no refactoring needed
- Database triggers guarantee consistency regardless of which editor is used
- Backfill is safe because it uses `ON CONFLICT DO NOTHING` and only updates rows where `winner_id IS NULL`


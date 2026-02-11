

## Add `team_id` Column to `participant` Table

### What and Why

The bracket creation code already writes `team_id` when inserting participants, and the standings service already reads it to map placements back to teams. But the column doesn't exist in the database yet, so inserts silently drop it and standings lookups always get `undefined`. This single migration closes the gap.

### Database Migration

Run a SQL migration that:

1. Adds a nullable `team_id` UUID column to the `participant` table with a foreign key reference to `teams(id)`
2. Creates an index on `participant.team_id` for lookup performance

```sql
ALTER TABLE participant
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

CREATE INDEX IF NOT EXISTS idx_participant_team_id ON participant(team_id);
```

### No Code Changes Needed

The application code is already prepared from your pull request:
- **BracketCreationService.ts** already sends `team_id` in the participant insert
- **BracketStandingsService.ts** already reads `participant.team_id` to build standings
- **StorageParticipant type** already has `team_id?: string`

### Verification

After the migration, confirm the column exists by querying `information_schema.columns` for `participant.team_id`.


# Fix Plan: Bracket Standings Not Saved (StorageParticipant.team_id missing)

## Bug Summary

The `participant` database table lacks a `team_id` column. When brackets are created, the team UUID is available but never stored. When final standings are calculated, `BracketStandingsService` tries to read `participant.team_id` to map placements back to teams, but it's always `undefined`. The `.filter((r) => r.team_id)` on line 80 removes all records, so nothing is upserted to `playoff_team_records`.

## Fix Steps

### Step 1: Database Migration — Add `team_id` column to `participant` table

Create a new Supabase migration file:

```sql
-- Add team_id column to participant table for mapping back to teams
ALTER TABLE participant
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_participant_team_id ON participant(team_id);
```

**File**: `supabase/migrations/<timestamp>_add_team_id_to_participant.sql`

### Step 2: Update `BracketCreationService.ts` — Store `team_id` when inserting participants

In `src/services/brackets/manager/services/BracketCreationService.ts`, the participant insert (lines 77-83) currently only sends `tournament_id`, `name`, and `position`. We need to also include `team_id` from the source `teams` array.

The `teamsBySeed` array has `{ id, name, seed }` where `id` is the team UUID. When building `participantInserts`, map each seeded team name back to its team ID:

```typescript
const participantInserts = seeding.map((name, index) => {
  const team = teamsBySeed.find((t) => t.name === name);
  return {
    tournament_id: bracketId,
    name: name,
    position: index + 1,
    team_id: team?.id ?? null, // Store team UUID for standings mapping
  };
});
```

**File**: `src/services/brackets/manager/services/BracketCreationService.ts` (lines ~77-83)

### Step 3: Update `StorageParticipant` type — Mark `team_id` as populated

In `src/services/brackets/manager/types/BracketServiceTypes.ts`, the `StorageParticipant` interface already has `team_id?: string`. No type change needed — but now the field will actually be populated from the database.

**File**: `src/services/brackets/manager/types/BracketServiceTypes.ts` (no change needed)

### Step 4: Verify `BracketStandingsService.ts` logic is correct

The existing code at `src/services/brackets/manager/services/BracketStandingsService.ts:71-80` already correctly reads `participant?.team_id` and filters/upserts. Once `team_id` is actually stored in the DB, this code will work as intended. **No change needed.**

### Step 5: Update the `SupabaseSqlStorage` participant cache (if needed)

Check if the `loadParticipantsForTournament` method in `SupabaseSqlStorage.ts` needs to include `team_id` in its cache. Currently the `ParticipantCacheEntry` only stores `position` and `name`. The `team_id` is read separately by `BracketStandingsService` via `storage.select('participant', ...)`, so the cache doesn't need updating. **No change needed.**

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_add_team_id_to_participant.sql` | **New** — Add `team_id` column |
| `src/services/brackets/manager/services/BracketCreationService.ts` | **Edit** — Include `team_id` in participant insert |

## Files Verified (No Change Needed)

- `src/services/brackets/manager/types/BracketServiceTypes.ts` — Type already has `team_id?`
- `src/services/brackets/manager/services/BracketStandingsService.ts` — Logic already correct
- `src/services/brackets/manager/SupabaseSqlStorage.ts` — Cache doesn't need `team_id`

## Lovable Prompt (for wiring up Supabase after PR)

> **Lovable Prompt**: "Add a `team_id` column (type UUID, foreign key referencing `teams.id`, nullable) to the `participant` table in Supabase. Add an index on `participant.team_id`. This column stores the original team UUID so that bracket standings can map participants back to teams when saving final placements to `playoff_team_records`. Run the migration and verify the column exists."

## Testing

- After applying the migration and code change, create a new bracket with teams
- Verify `participant` rows now have `team_id` populated
- Complete the bracket and verify `playoff_team_records` gets populated with correct placements
- Existing brackets (without `team_id`) will still silently skip standings (same as current behavior) — no regression



## Fix: Duplicate participants without team links in bracket creation

### Problem
`BracketCreationService` manually inserts participants (Set A, with `team_id`) then passes team **names** to `manager.create.stage()`. The library creates a **second** set of participants (Set B, without `team_id`). Matches reference Set B, so `BracketStandingsService` can't map participants back to teams — standings are never saved.

### Solution
Follow the pattern already established in `BracketSeedingService`: skip manual participant insertion, let `brackets-manager` create participants via `create.stage()`, then synchronize `team_id` and `position` onto the library-created rows afterward. Refresh the participant cache after sync.

### Changes

**`src/services/brackets/manager/services/BracketCreationService.ts`**

1. **Remove** Steps 4–5 (manual participant insertion) and the pre-`create.stage()` cache load.
2. **Keep** `create.stage()` with the existing name-based seeding array (this is how the library works).
3. **Add** a post-creation sync step after `create.stage()`:
   - Select all participants for the tournament from the DB
   - For each participant with a name, find the matching team and update `team_id` and `position`
   - For BYE participants (name is null), set `team_id = null`
4. **Reload** the participant cache after sync via `this.storage.clearParticipantCache()` + `this.storage.loadParticipantsForTournament(bracketId)`.

```typescript
// After create.stage():

// Sync team_id and position onto library-created participants
const participants = await this.storage.select('participant', { tournament_id: bracketId });
const participantArray = (Array.isArray(participants) ? participants : [participants]) as any[];

for (const participant of participantArray) {
  if (participant.name === null) {
    await supabase.from('participant').update({ position: null, team_id: null }).eq('id', participant.id);
  } else {
    const team = teamsBySeed.find((t) => t.name === participant.name);
    if (team) {
      const slotPosition = teamsBySeed.indexOf(team) + 1;
      await supabase.from('participant').update({ position: slotPosition, team_id: team.id }).eq('id', participant.id);
    }
  }
}

// Refresh cache with updated data
this.storage.clearParticipantCache();
await this.storage.loadParticipantsForTournament(bracketId);
```

This mirrors exactly what `BracketSeedingService` does on lines 76–105.


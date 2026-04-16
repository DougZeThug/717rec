

## Plan: Fix Double-Insert When Both Slots Resolve the Same New Team

### The problem

`resolveTeamToParticipantId` is called twice with the same `participants` array snapshot. If both opponent slots are set to the same team that doesn't have a participant row yet, both calls will fail the `find()` check and each insert a new participant — creating a duplicate.

### The fix

In `editMatchParticipants` (around line 234-243), after resolving opponent 1, push any newly created participant into the `participants` array before resolving opponent 2. This way the second call sees the row created by the first.

**Change `resolveTeamToParticipantId`** to return both the `id` and a flag/object indicating whether it created a new row (and the participant data). Then push that into `participants` before the second call.

Simpler approach: have `resolveTeamToParticipantId` accept the mutable array and push onto it when it creates a row. Since arrays are passed by reference in JS, the second call will see the update.

### Technical detail

In `resolveTeamToParticipantId` (line ~287-330), after inserting a new participant, push the new entry onto the `participants` array:

```typescript
// After successful insert (around line 320):
participants.push({ id: inserted.id, tournament_id: tournamentId, name: team.name, team_id: teamId });
return inserted.id;
```

That's it — one line addition. The array is passed by reference, so the second call will find the participant created by the first call.

### What changes

- **1 file** — `src/services/brackets/manager/services/BracketAdminService.ts`: add one line after participant insert to push the new entry into the shared array
- **0 migrations, 0 other files**


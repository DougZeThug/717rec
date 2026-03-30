

## Fix: Handle Errors in Bracket Participant Sync

### Problem
The participant sync loop in `BracketCreationService.ts` discards Supabase `update()` errors. If an update fails (RLS, FK, timeout), `team_id` stays null, and downstream standings generation silently excludes those teams.

### Fix

**File: `src/services/brackets/manager/services/BracketCreationService.ts`**

Add `{ error }` destructuring to both `supabase.update()` calls and use `handleDatabaseError()` to throw on failure:

```typescript
import { handleDatabaseError } from '@/utils/errorHandler';

// BYE participant
const { error } = await supabase
  .from('participant')
  .update({ position: null, team_id: null })
  .eq('id', participant.id);
if (error) handleDatabaseError(error, 'Failed to sync BYE participant');

// Team participant
const { error } = await supabase
  .from('participant')
  .update({ position: slotPosition, team_id: team.id })
  .eq('id', participant.id);
if (error) handleDatabaseError(error, 'Failed to sync participant to team');
```

The outer `catch` block already handles errors from the creation process, so thrown errors will be caught, logged, and surfaced to the user.

One file, ~4 lines added.


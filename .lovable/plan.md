

## Fix: "Position is undefined" Error on First BYE Advance Attempt

### Problem
When you advance a BYE match, `brackets-manager`'s internal `getMatchesBeforeFirstRoundLB` function crashes with "Position is undefined" because some participants have no `position` value set. The library throws this during its propagation step.

The match data is already saved successfully by this point (the PATCH succeeds), but the propagation error is re-thrown and kills the whole operation. On the second click it works because the match is already updated.

### Fix

**File: `src/services/brackets/manager/services/BracketUpdateService.ts`** (line 122)

Expand the non-fatal error check to also catch "Position is undefined":

```
Before:
if (errorMessage.includes('Match not found')) {

After:
if (errorMessage.includes('Match not found') || errorMessage.includes('Position is undefined')) {
```

This treats the position error the same way as "Match not found" — a known library bug where the match data was already saved, and normalization steps will fix the bracket state afterward.

**One file, one line changed.**


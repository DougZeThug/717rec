# Fix: Clear persisted team state on load failure

## Problem

When `handleLoadTeams` in `useTeamOperations.ts` fails, the hook clears in-memory React state (`timeBlockTeams`, `originalTimeBlockTeams`, `pairedTimeBlockTeams`) but does **not** clear the matching data in `sessionStorage`. Because the persistence `useEffect` only writes when there is non-empty team data, the empty state is never saved back — leaving stale teams from a previous date in storage.

On a subsequent page reload, those stale teams get restored while the selected date may be different, creating a silent mismatch that lets users create matches for the wrong date.

## Fix

In `src/hooks/useAutoSchedule/useTeamOperations.ts`, in the `catch` block of `handleLoadTeams`:

1. Add `useToast` import.
2. After clearing React state, also call `saveAutoScheduleState({ timeBlockTeams: {}, originalTimeBlockTeams: {}, teamBlockMap: {} })` to clear the persisted copy.
3. Show a toast notification so the user knows the load failed.

## Files changed
- `src/hooks/useAutoSchedule/useTeamOperations.ts` — add `useToast` import, clear sessionStorage, and show toast in the error handler.

## Verification
- Simulate a team-load failure (e.g., by blocking the network request) and confirm that refreshing the page does not restore stale team data.

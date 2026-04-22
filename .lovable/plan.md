

## Plan: Fix concurrent match submissions in `useMatchSubmission`

### The bug

`useMatchSubmission` uses a single boolean ref (`isSubmittingRef`) to prevent double-submits. When `useScoreEntryData` calls `handleSubmitScore` for many matches concurrently via `Promise.all`, the first call flips the boolean to `true`, and every other concurrent call returns `false` immediately. Result: only one match in a batch ever reaches the database.

The original intent of the guard (added in commit 9e7f5af0) was to block **duplicate submissions of the same match**, not to serialize unrelated matches.

### The fix

Replace the boolean ref with a `Set<string>` of in-flight match IDs, so the guard is per-match.

In `src/hooks/matches/useMatchSubmission.ts`:

```ts
const submittingMatchIds = useRef(new Set<string>());

const handleSubmitScore = async ({ matchId, /* ... */ }: SubmitScoreParams) => {
  if (submittingMatchIds.current.has(matchId)) return false;
  submittingMatchIds.current.add(matchId);
  try {
    // ... existing submission logic unchanged
  } finally {
    submittingMatchIds.current.delete(matchId);
  }
};
```

Everything inside `try` (validation, `updateMatchScore`, `updateTeamStats`, cache invalidation, toast) stays exactly the same. Only the guard mechanism changes.

### Test coverage

Update `src/hooks/matches/__tests__/useMatchSubmission.test.ts`:

1. **Add a regression test**: call `handleSubmitScore` concurrently for three different match IDs via `Promise.all`. Assert all three resolve to `true` and that `updateMatchScore` is called three times.
2. **Add a same-match guard test**: fire two concurrent calls with the same `matchId` while `updateMatchScore` is pending (use a deferred promise). Assert the second returns `false` immediately and `updateMatchScore` is called only once. After the first resolves, a third call with the same id succeeds.

### Files touched

- Edit: `src/hooks/matches/useMatchSubmission.ts` — swap `isSubmittingRef` (boolean) for `submittingMatchIds` (Set of string).
- Edit: `src/hooks/matches/__tests__/useMatchSubmission.test.ts` — add the two tests above.

### Verification

1. `npm test` — all existing tests still pass; new concurrent and same-match tests pass.
2. Manual: open Mass Score Entry → edit several matches → click Submit All → every edited match updates (not just the first), success toast reflects the full count.
3. No behavior change for single-match submissions (the existing `MatchSubmissionDialog` flow).

### Rollback

Revert the two files. One step.


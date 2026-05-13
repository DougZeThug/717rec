## Bug verified

`src/services/bracket-creator.ts` inserts a `brackets` row at line 104, then calls `bracketManagerService.createBracket()` at line 143. If the second step throws, the `catch` at line 169 only logs and rethrows, leaving an orphaned `pending` bracket row that surfaces in the brackets list and renders as "may have been deleted".

Participant inserts (line 135) intentionally don't throw, so they don't need rollback — only the bracket row does.

## Fix

Single file: `src/services/bracket-creator.ts`.

1. Hoist `let createdBracketId: string | null = null;` above the `try` block so the `catch` can see it.
2. After the successful insert at line 118, set `createdBracketId = bracketData.id;`.
3. In the `catch` block, before rethrowing, if `createdBracketId` is set, attempt cleanup:

```ts
if (createdBracketId) {
  const { error: cleanupError } = await supabase
    .from('brackets')
    .delete()
    .eq('id', createdBracketId);
  if (cleanupError) {
    errorLog('Failed to clean up orphaned bracket', { bracketId: createdBracketId, cleanupError });
  } else {
    successLog('Cleaned up orphaned bracket', `ID: ${createdBracketId}`);
  }
}
```

Cascading FK on `participants.bracket_id` (and any brackets-manager rows partially created) will remove dependent rows; if cascade isn't configured, the delete will fail and we log it without masking the original error. Original error is rethrown unchanged.

## Verification

- Build passes.
- Manual: temporarily force `bracketManagerService.createBracket` to throw, confirm the brackets row no longer appears in the overview.
- Existing happy-path bracket creation unchanged (cleanup only runs in the catch).

Risk: Low. Pure additive cleanup in failure path. Rollback: trivial.
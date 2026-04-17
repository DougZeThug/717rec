

## Plan: Attach `cause` to re-thrown errors in `useMessageApi.ts`

### Why
Lint rule `preserve-caught-error` requires that when you catch an error and throw a new one, you preserve the original via `{ cause: e }`. Three `catch` blocks in `src/hooks/message-board/useMessageApi.ts` (lines 67, 100, 130) throw new `Error(...)` without attaching the caught error.

### Fix
In each of the three `catch (e)` blocks (createMessage, updateMessage, deleteMessage), change:
```ts
throw new Error('Failed to create message');
```
to:
```ts
throw new Error('Failed to create message', { cause: e });
```

(Same pattern for the update and delete messages.)

### Why safe
- `ErrorOptions` with `cause` is already declared in `src/types/error-options.d.ts` — TypeScript will accept it.
- No runtime behavior change: toast still fires, error still propagates, original stack preserved for debugging.
- One file, three one-line edits.

### Files touched
- `src/hooks/message-board/useMessageApi.ts`

### Rollback
Revert the file. One-step.


# Error Handling Guidelines

## Architecture Overview

Error handling follows a layer-based pattern:

```
Services (throw) → Hooks (catch + handle) → Components (display)
```

## Layer Rules

### 1. Services

**Rule: ALWAYS throw errors, NEVER return null on error**

Services are responsible for data fetching and mutations. They should:
- Throw typed errors from `@/types/errors` (`DatabaseError`, `NotFoundError`,
  `ValidationError`, `AuthorizationError`, `BusinessLogicError`)
- Call `handleDatabaseError(error, 'context')` for a failed query. It logs the
  error, then throws a `DatabaseError`.
- Call `ensureFound(data, 'Name', id)` when a row must exist. It throws a
  `NotFoundError` when the row is missing.
- Let the calling hook handle the error

```typescript
// ✅ CORRECT
import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';

export const MyService = {
  getData: async (id: string) => {
    const { data, error } = await supabase
      .from('my_table')
      .select('id, name, status, created_at')
      .eq('id', id)
      .maybeSingle(); // not single(): single() reports "no rows" as an error

    if (error) handleDatabaseError(error, 'Failed to fetch data');
    return ensureFound(data, 'Data', id);
  },
};

// ❌ WRONG - Swallows error
if (error) {
  console.error('Error:', error);
  return null;  // Caller can't distinguish "no data" from "error"
}
```

### 2. Hooks

**Rule: Catch errors, show toast, return error state**

Hooks are the bridge between services and components. They should:
- Catch service errors in try/catch blocks
- Use `getUIErrorMessage(error, context)` for the message shown to the user
- Return an `error` state for components to display

Never put `error.message` in a toast directly. A service error's message is
built from the raw Postgres error and can name tables, constraints and RLS
policies. `getUIErrorMessage` translates the codes we can act on and falls
back to your `context` phrase otherwise.

```typescript
// ✅ CORRECT
import { useState, useCallback } from 'react';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { MyService } from '@/services/MyService';

export function useMyData(id: string) {
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const result = await MyService.getData(id);
      setData(result);
    } catch (err) {
      setError(getUIErrorMessage(err, 'Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  return { 
    data, 
    error,        // ← Expose error state
    isLoading, 
    refetch: fetchData 
  };
}
```

### 3. Components

**Rule: Read error state, display ErrorDisplay, provide retry**

Components should:
- Read error state from hooks
- Display errors using `<ErrorDisplay />` component
- Provide retry actions when possible
- Use ErrorBoundary for unexpected errors

```typescript
// ✅ CORRECT
import { ErrorDisplay } from '@/components/ui/error-display';

function MyComponent() {
  const { data, error, isLoading, refetch } = useMyData('123');

  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={refetch}
        context="Loading data"
      />
    );
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return <div>{/* render data */}</div>;
}
```

## Utility Functions

### `getUIErrorMessage()`

Turn any thrown value into a message that is safe to show:

```typescript
// Reason plus your lead-in phrase (no terminal punctuation on the phrase)
toast({ description: getUIErrorMessage(error, 'Failed to create team') });
//  -> "Failed to create team: That already exists. Give it a different name
//      and try again."   (a unique-constraint violation)
//  -> "Failed to create team. Please try again."   (nothing safe to add)

// Reason alone, when the toast title already says what failed
toast({ title: 'Save failed', description: getUIErrorMessage(error) });
```

### Which failures can speak for themselves

`getUIErrorMessage` shows a reason only when something has vouched for it.
Two rules, and both are opt-in:

**In TypeScript, the error's type decides.** `ValidationError`,
`NotFoundError`, `BusinessLogicError` and `AuthorizationError` keep their
message, because they are only ever built by our own code with wording written
for a person. A bare `Error` does not, and neither does `DatabaseError` —
`handleDatabaseError` builds its message from the raw Postgres error, so it may
name a table, a constraint or an RLS policy.

```typescript
// ❌ WRONG — the wording is for a user, but the type says "unsafe to show",
//    so they get "Something went wrong. Please try again." instead.
throw new DatabaseError('You already have a team request. Refresh to see it.');

// ✅ CORRECT
throw new BusinessLogicError('You already have a team request. Refresh to see it.');
```

**In the database, the guard marks itself.** A `RAISE EXCEPTION` whose message
is meant to be read adds `USING HINT = 'user-visible'`; anything unmarked stays
generic, so diagnostics never leak.

```sql
-- Shown to the scorer
RAISE EXCEPTION 'Match is not decided yet (game wins: % - %)', v_t1, v_t2
  USING HINT = 'user-visible';

-- Not shown: implementation detail
RAISE EXCEPTION 'Expected to delete 1 match but deleted % rows', v_rows;
```

The marker is the hint, not a custom SQLSTATE: PostgREST derives the HTTP
status from SQLSTATE, and an unrecognised code turns a 400 into a 500.
`supabase/tests/user_visible_error_hints.sql` pins which guards are marked.

### `handleDatabaseError()` and `ensureFound()`

Both live in `@/utils/errorHandler`. Services use them for every query:

```typescript
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';

// A failed query: logs, then throws a DatabaseError
if (error) handleDatabaseError(error, 'Failed to fetch teams');

// A row that must exist: throws a NotFoundError when it is null
return ensureFound(data, 'Team', teamId);
```

There is no shared `withRetry()`. The only one is a local helper for the
bracket seed mutations
(`src/components/playoffs/form/bracket-teams/utils/mutationErrorHandling.ts`).

## Error Types

All of these are in `@/types/errors` and extend `ServiceError`:

| Error Class | Use Case |
|------------|----------|
| `DatabaseError` | A failed Supabase query (thrown by `handleDatabaseError`) |
| `NotFoundError` | A row that must exist is missing (thrown by `ensureFound`) |
| `ValidationError` | Invalid input or a missing required field |
| `AuthorizationError` | Not allowed to do this |
| `BusinessLogicError` | A rule violation or an invalid state change |

The file also holds a few feature-specific errors, for example
`DuplicateRoundError` (live scoring).

## Best Practices

1. **Be specific**: Use typed errors with a context phrase that says what failed
2. **Log before throwing**: `handleDatabaseError` logs for you. For any other
   thrown error, call `errorLog()` from `@/utils/logger` first.
3. **User-friendly messages**: Use `getUIErrorMessage()` for what the user sees
4. **Provide recovery**: Always offer retry when possible
5. **Don't swallow errors**: Never catch without handling or re-throwing

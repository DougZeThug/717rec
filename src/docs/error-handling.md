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
- Throw typed errors (e.g., `SupabaseError`, `ValidationError`)
- Log before throwing using `errorLog()`
- Let the calling hook handle the error

```typescript
// ✅ CORRECT
import { SupabaseError } from '@/utils/errors';
import { errorLog } from '@/utils/logger';

export class MyService {
  static async getData(id: string) {
    const { data, error } = await supabase
      .from('my_table')
      .select('id, name, status, created_at')
      .eq('id', id)
      .single();

    if (error) {
      errorLog('Error fetching data:', error);
      throw new SupabaseError(error.message, 'my_table', 'getData');
    }

    return data;
  }
}

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
- Use `withRetry()` for retryable operations

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
      const errorInfo = handleError(err, 'Fetching data');
      setError(errorInfo.userMessage);
    } finally {
      setIsLoading(false);
    }
  }, [id, handleError]);

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

A typed error from `@/types/errors` keeps its message. A bare `Error` does
not — if a service wants its wording shown, it must throw a typed error.

### `createServiceError()`

Create standardized service errors:

```typescript
import { createServiceError } from '@/utils/errorHandling';

if (error) {
  throw createServiceError('fetchTeams', 'teams', error);
}
```

### `withRetry()`

Retry transient errors automatically:

```typescript
import { withRetry } from '@/utils/errorHandling';

const result = await withRetry(() => 
  supabase.from('teams').select('id, name, division_id, created_at')
);
```

## Error Types

| Error Class | Use Case |
|------------|----------|
| `SupabaseError` | Database operations |
| `ChallongeError` | Challonge API calls |
| `BracketValidationError` | Bracket validation |
| `TeamValidationError` | Team validation |
| `MatchSyncError` | Match synchronization |

## Best Practices

1. **Be specific**: Use typed errors with context (table, operation)
2. **Log before throwing**: Always log in services before throwing
3. **User-friendly messages**: Use `categorizeError()` for user messaging
4. **Provide recovery**: Always offer retry when possible
5. **Don't swallow errors**: Never catch without handling or re-throwing

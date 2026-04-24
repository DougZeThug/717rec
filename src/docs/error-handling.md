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
- Use `handleDatabaseError()` for database errors (logs and throws)
- Use `ensureFound()` for required resources (throws NotFoundError)
- Let the calling hook handle the error

```typescript
// ✅ CORRECT
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';

export class MyService {
  static async getData(id: string) {
    const { data, error } = await supabase
      .from('my_table')
      .select('id, name, status, created_at')
      .eq('id', id)
      .single();

    if (error) handleDatabaseError(error, 'Failed to fetch data');
    return ensureFound(data, 'Data', id);
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
- Use `useErrorHandler()` for consistent error handling
- Return an `error` state for components to display
- Use `withRetry()` for retryable operations

```typescript
// ✅ CORRECT
import { useState, useCallback } from 'react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { MyService } from '@/services/MyService';

export function useMyData(id: string) {
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { handleError } = useErrorHandler();

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

### `useErrorHandler()`

Reusable hook for consistent error handling:

```typescript
const { handleError, handleErrorSilent } = useErrorHandler();

// With toast notification
const errorInfo = handleError(error, 'Creating team');

// Silent (logging only)
const errorInfo = handleErrorSilent(error, 'Background sync');
```

### `handleDatabaseError()`

Handle database errors consistently:

```typescript
import { handleDatabaseError } from '@/utils/errorHandler';

if (error) {
  handleDatabaseError(error, 'Failed to fetch teams');
}
```

### `withErrorHandling()`

Wrap operations with consistent error handling:

```typescript
import { withErrorHandling } from '@/utils/errorHandler';

const result = await withErrorHandling(
  () => supabase.from('teams').select('*'),
  'Fetching teams'
);
```

## Error Types

| Error Class | Use Case |
|------------|----------|
| `DatabaseError` | Database operations |
| `NotFoundError` | Resource not found |
| `ValidationError` | Invalid input or validation failures |
| `AuthorizationError` | Insufficient permissions |
| `BusinessLogicError` | Rule violations or invalid state |

## Best Practices

1. **Be specific**: Use `handleDatabaseError()` and `ensureFound()` with descriptive context
2. **Use error helpers**: `handleDatabaseError()` logs automatically before throwing
3. **User-friendly messages**: Use `handleHookError()` in hooks for user messaging
4. **Provide recovery**: Always offer retry when possible
5. **Don't swallow errors**: Never catch without handling or re-throwing

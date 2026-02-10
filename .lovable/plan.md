

## Fix: Graceful Supabase Client Initialization

### Problem
The Supabase client crashes at module evaluation time when environment variables are missing, causing a blank screen before React can even mount an Error Boundary.

### Solution
Validate environment variables before calling `createClient` and fall back to placeholder values so the module loads without crashing. Log a clear error to the console. The app will still fail on actual API calls, but React will be mounted and the Error Boundary can handle it gracefully.

### Technical Changes

**File**: `src/integrations/supabase/client.ts`

Replace the current direct initialization with validated initialization:

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    'Missing Supabase configuration. Please check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables.'
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_PUBLISHABLE_KEY || 'placeholder-key'
);
```

This is a single-file, ~3-line change. No other files need modification.

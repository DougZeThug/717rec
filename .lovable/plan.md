## Bug verified

`src/integrations/supabase/client.ts` matches the report exactly: missing env vars only log via `console.error`, then `createClient` is called with `https://placeholder.supabase.co` / `placeholder-key`. The app builds and boots, then every Supabase call fails later with cryptic DNS/fetch errors instead of a clear config error.

## Fix

Replace the placeholder fallbacks with a fail-fast `throw`:

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables. See .env.example for reference.'
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
```

Single file changed: `src/integrations/supabase/client.ts`. The `.env` is auto-populated in this Lovable project, so this won't break normal runs — it only surfaces real misconfiguration immediately.

## Verification

- App preview still loads (env vars present → no throw).
- Temporarily blanking the vars reproduces the new clear error in place of DNS failures.

Risk: Low. Rollback: trivial (revert the file).
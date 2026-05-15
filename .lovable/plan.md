## Phase C — Shared `requireAdmin` helper

Extract the duplicated "auth → admin profile check" block into one helper used by both admin edge functions. Keeps current behavior identical (still 401/403 with the same shapes), but removes ~30 lines of copy-paste and makes future changes (e.g. swapping `is_admin` for the `user_roles` table) a one-line edit.

### 1. New file — `supabase/functions/_shared/auth.ts`

```ts
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AdminContext {
  userId: string;
  supabase: SupabaseClient;          // user-scoped client (RLS applies)
  serviceClient: SupabaseClient;     // service-role client (RLS bypass)
}

export type RequireAdminResult =
  | { ok: true; ctx: AdminContext }
  | { ok: false; response: Response };

/**
 * Verify the request carries a valid Bearer JWT for an admin user.
 * On failure returns a fully-formed Response (401 / 403 / 500) with the
 * provided CORS headers. On success returns the user id and two clients:
 * a user-scoped one (RLS-aware) and an optional service-role one.
 */
export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<RequireAdminResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return {
      ok: false,
      response: jsonResponse(corsHeaders, 500, { error: 'Server misconfigured' }),
    };
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: jsonResponse(corsHeaders, 401, { error: 'Authentication required' }),
    };
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return {
      ok: false,
      response: jsonResponse(corsHeaders, 401, { error: 'Authentication required' }),
    };
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileErr || !profile?.is_admin) {
    return {
      ok: false,
      response: jsonResponse(corsHeaders, 403, { error: 'Admin access required' }),
    };
  }

  const serviceClient = createClient(supabaseUrl, serviceKey);
  return {
    ok: true,
    ctx: { userId: userData.user.id, supabase, serviceClient },
  };
}

function jsonResponse(cors: Record<string, string>, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
```

Notes:
- `.maybeSingle()` (project standard) instead of `.single()` so a missing profile cleanly returns 403 instead of throwing PostgREST 406.
- Returns a `Response` rather than throwing, so callers don't have to wrap in try/catch just for auth.
- The Bearer check up-front gives a true 401 before we hit `auth.getUser()` (which would otherwise return `user: null`).

### 2. `supabase/functions/update_team_stats/index.ts`

Replace lines 19–51 (the inline auth + admin block) with:

```ts
const auth = await requireAdmin(req, corsHeaders);
if (!auth.ok) return auth.response;
const { supabase: supabaseClient } = auth.ctx;
```

Add the import at the top:
```ts
import { requireAdmin } from '../_shared/auth.ts';
```

Everything below (using `supabaseClient`) stays identical. Status codes are preserved (401 for missing/invalid auth, 403 for non-admin).

### 3. `supabase/functions/create-bracket/index.ts`

Replace lines 413–442 (inline client + getUser + profile check) with the same pattern:

```ts
const auth = await requireAdmin(req, corsHeaders);
if (!auth.ok) return auth.response;
const supabaseClient = auth.ctx.supabase;
log('[AUTH] Admin access verified for user:', auth.ctx.userId);
```

Add import and **remove** the inline `createClient(supabaseUrl, supabaseAnonKey, { global: ... })` call. Keep the env-var validation block above it (it also checks `CHALLONGE_API_KEY`, which the helper doesn't cover).

Behavior change to be aware of: today this function `throw`s `'Authentication required'` / `'Admin access required'` and the outer catch turns it into a 500. After this change those become **401 / 403** as the audit expects. This is a fix, not a regression.

### 4. Deploy & verify

Deploy both functions (the helper auto-bundles since it lives under `_shared/` in the same project):

```
supabase--deploy_edge_functions ["create-bracket", "update_team_stats"]
```

Then the verification commands from the plan:

```bash
npm run lint
npm run typecheck
npm run test:file -- src/services/support/__tests__/ContactService.test.ts
```

Edge-function smoke (via `supabase--curl_edge_functions`):
- `POST /create-bracket` no Authorization header → expect **401** `{"error":"Authentication required"}`.
- `POST /create-bracket` with a non-admin user's token → expect **403** `{"error":"Admin access required"}`.
- `POST /update_team_stats` no auth → 401.
- `POST /update_team_stats` non-admin → 403.
- `POST /send-support-email` (Phase B) honeypot + valid + log check, unchanged.

### Files touched

- `supabase/functions/_shared/auth.ts` — new
- `supabase/functions/update_team_stats/index.ts` — swap inline block for helper
- `supabase/functions/create-bracket/index.ts` — swap inline block for helper

### Risks

- **Bundling `_shared`**: Supabase Edge Runtime supports relative imports under `supabase/functions/`, so `../_shared/auth.ts` deploys with each function. If a deploy fails because the runtime won't resolve the import, fall back to inlining the helper into both files (still a net DRY win because we keep one canonical implementation in `_shared/auth.ts` and copy from it).
- **`create-bracket` 401/403 status change**: callers (admin UI) currently treat any non-2xx as failure and surface the body's `error` field. The new shape `{ "error": "Admin access required" }` matches what the old `throw` produced, so no UI change is needed.
- **`maybeSingle` change**: a missing `profiles` row used to surface a PostgREST error and trigger the 403 branch indirectly; now it cleanly returns `null` → 403. Same outcome, less log noise.

### Out of scope

- Migrating `is_admin` boolean to the `user_roles` table (orthogonal refactor).
- Deleting either orphan function (still under "keep them" assumption from the plan title).
- Touching `capture-power-snapshots` (cron-secret-gated, doesn't need admin auth).

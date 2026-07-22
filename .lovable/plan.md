## Fix 2 non-null assertion warnings in `src/lib/mcp/tools/_supabase.ts`

Replace the `!` assertions on env-var reads inside `userClient()` with an explicit check that throws a clear error when the required env vars are missing.

### Change

```ts
export function userClient(ctx: ToolContext): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'MCP userClient: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) must be set',
    );
  }
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

That removes both warnings, narrows the types properly for `createClient`, and produces a debuggable failure instead of a silent `undefined!` if the env is misconfigured. No behavior change when env vars are present.

### Verify

Run `npx eslint src/lib/mcp/tools/_supabase.ts` — should report 0 warnings.

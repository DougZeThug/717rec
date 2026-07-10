Plan to fix the e2e failure:

1. Keep normal e2e tests separate from real-backend tests
   - Make `npm run e2e` run only the mocked/local Chromium project.
   - Keep the Supabase-backed test in its own Playwright project so it does not run unless explicitly requested.

2. Make the real-backend spec safe when secrets are missing
   - Ensure the Supabase admin client is created only inside `beforeAll` after confirming all `E2E_SUPABASE_*` and test-user env vars exist.
   - Avoid any top-level call that can pass `null` into `createAdminClient`.

3. Preserve lint rules
   - Remove any non-null assertions.
   - Keep Prettier formatting clean in the touched e2e files.

4. Verify the fix
   - Run lint on the touched files.
   - Confirm `npm run e2e` no longer attempts the real-backend spec.

Technical note:
- The crash happens because `getRealBackendEnv()` returns `null` when CI does not provide real Supabase credentials, but the old spec creates the admin client before the skip guard can protect it.
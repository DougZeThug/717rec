## Problem

CI's Deno test step is failing on:

```
supabase/functions/_shared/rateLimit.test.ts:1
Module not found "https://deno.land/std@0.190.0/assert/mod.ts"
```

`std@0.190.0` predates the `assert/mod.ts` layout (assert lived at `testing/asserts.ts` back then), so that URL 404s. Every other edge-function test in the repo already uses `std@0.224.0/assert/mod.ts` (see `_shared/securityHeaders.test.ts`, `pageview/index.test.ts`).

Note: `supabase/functions/_shared/rateLimit.test.ts` does not exist on `origin/main` or in the working tree — it appears to live on the PR branch that CI is running. The fix below still applies unambiguously because the required import path is the same across every other test file.

## Plan

1. In `supabase/functions/_shared/rateLimit.test.ts`, change the assert import from
   `https://deno.land/std@0.190.0/assert/mod.ts` → `https://deno.land/std@0.224.0/assert/mod.ts`.
   If the file also imports anything else from `std@0.190.0/...`, bump those to `std@0.224.0/...` too.
2. Grep the rest of `supabase/functions/` for any remaining `std@0.190.0` references. The runtime `http/server.ts` imports in `pageview`, `send-support-email`, `submit-contact-request`, and `submit-score-report` still work at 0.190.0, so leave those alone unless you want a consistency sweep — flagged as optional.
3. Re-run the Deno test job to confirm green.

## One clarification

I don't have `rateLimit.test.ts` in this checkout (not on `origin/main`, not in the working tree). Two options:

- **A (preferred):** Paste the current contents of `supabase/functions/_shared/rateLimit.test.ts` from the PR branch and I'll patch just the import line.
- **B:** I write a fresh `rateLimit.test.ts` from scratch that mirrors `securityHeaders.test.ts` and exercises the exports of `rateLimit.ts`. Only choose this if the file doesn't already exist somewhere you care about — otherwise my version will collide with yours on merge.

Which do you want?

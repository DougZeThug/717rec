## Goal

Stop the "E2E (real Supabase)" GitHub check from going red on every push, while keeping all the code and docs in place so it can be re-enabled later.

## Only change

**`.github/workflows/ci.yml`** — remove the `e2e-real-backend:` job (approx. lines 213–252, including its "Upload Playwright report" step). Nothing else in the file needs to change; other jobs don't reference it.

## Deliberately keeping

- `e2e/real-backend.spec.ts` and `e2e/helpers/realBackend.ts` — untouched.
- `playwright.config.ts` `real-backend` project + `hasRealBackend` gate — untouched, so `npx playwright test --project=real-backend` still works locally once you set the `E2E_*` env vars.
- `docs/E2E_REAL_BACKEND.md` and `.env.example` entries — untouched as the future-implementation reference.

## Re-enabling later

When you're ready, restore the job block from git history (or I can re-add it) and add the five secrets in GitHub Settings. No other wiring needed.

## Verification

- `grep "e2e-real-backend" .github/workflows/ci.yml` returns nothing.
- Next push: the "E2E (real Supabase)" check no longer appears in the checks list. Other jobs (Quality, Browser smoke, etc.) are unaffected.

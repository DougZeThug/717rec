## Phase 0 — Quick wins (hygiene)

Two small, safe cleanups. No app behavior changes.

### 1. Untrack `.env`

`.gitignore` already lists `.env`, but the file is still tracked in git. The values inside are the public Supabase anon URL/key (safe to expose), so this is hygiene, not a secret leak.

- Delete `.env` from the repo so it stops being tracked.
- `.env.example` stays as the reference template.
- Lovable's preview/build injects `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at runtime, so the app will continue to build and run. (Local-only contributors will need to copy `.env.example` → `.env` themselves, which matches the comment in `.env.example`.)
- Key rotation in the Supabase dashboard is optional and skipped here.

### 2. Archive stale planning/audit docs

Move finished planning docs out of the repo root into `docs/archive/`:

- `CODE-QUALITY-AUDIT-2026-04-24.md` → `docs/archive/`
- `PLAN-code-quality-cleanup.md` → `docs/archive/`
- `PLAN-coverage-timeout-fix.md` → `docs/archive/`
- `PLAN-team-storyline.md` → `docs/archive/`
- `ANY_PHASE_3_BUSINESS_CRITICAL_FLOWS_PLAN.md` → `docs/archive/`

Kept at root (active or canonical): `AGENTS.md`, `ARCHITECTURE.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `IMPROVEMENT-ROADMAP.md`, `README.md`, `SCHEDULER_README.md`, `TESTING.md`.

### Verification

- Preview still loads (Supabase client initializes from injected env vars).
- `ls *.md` at root shows only the kept files above.
- No source code changes; no test changes required.

### Out of scope

- Rotating the Supabase anon key.
- Any code refactors from later roadmap phases.

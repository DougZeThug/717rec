## Plan: Update all listed dependencies and verify

### Scope
Bump the 15 packages from the user's list to the specified target versions in `package.json`, install, then run tests and build.

### Packages
- @capacitor/core → 8.3.4
- @capgo/capacitor-social-login → 8.3.22
- @sentry/react → 10.53.1
- @tanstack/react-query → 5.100.10
- brackets-manager → 1.11.0 (minor; check release notes for API changes)
- brackets-memory-db → 1.0.6
- brackets-viewer → 1.9.1
- lucide-react → 1.16.0
- react-day-picker → 10.0.1
- react-hook-form → 7.76.0
- react-resizable-panels → 4.11.1
- react-router → 7.15.1
- react-router-dom → 7.15.1
- @vitejs/plugin-react-swc → 4.3.1
- @vitest/coverage-v8 → 4.1.6

### Steps
1. Edit `package.json` to pin the new versions (preserving existing range prefix style).
2. Run `npm install` (repo uses npm + `legacy-peer-deps=true`).
3. Run `npm test` (full Vitest suite).
4. Let harness run the build/typecheck automatically; review output.
5. If `brackets-manager` 1.11.0 surfaces type/API breaks in `SupabaseSqlStorage` or bracket services, either pin back to 1.10.x or patch the call sites with a small follow-up diff (called out, not silently changed).
6. Report results: pass/fail per step, and any test/build fallout with fixes.

### Risks
- `brackets-manager` minor bump is the only meaningful API risk; everything else is patch-level.
- Lockfile churn — expected, no action needed.

### Out of scope
- No source refactors beyond what's required to keep tests/build green.
- No security audit follow-ups in this PR.

## Plan: Bump 4 dev-dependencies and verify

### Scope
Patch/minor bumps of dev-only packages from the Dependabot group:
- `@types/node` 25.6.2 → 25.8.0
- `eslint` 10.3.0 → 10.4.0
- `typescript-eslint` 8.59.2 → 8.59.3
- `vitest` 4.1.5 → 4.1.6

### Steps
1. Update the four versions in `package.json` (preserve existing range prefix style).
2. Run `npm install --legacy-peer-deps`.
3. Run `npm test` (full Vitest suite).
4. Let the harness run the build/typecheck automatically and review.
5. If anything breaks, fix or pin back and report.

### Risks
- All four are patch/minor bumps in dev-only packages — low risk.
- `vitest` patch could shift test internals; we already updated `@vitest/coverage-v8` to 4.1.6 last round, so this brings the runner into alignment.
- `@types/node` minor bumps occasionally surface new TS errors; harness typecheck will catch them.

### Out of scope
- No source refactors beyond what's required to keep tests/build green.

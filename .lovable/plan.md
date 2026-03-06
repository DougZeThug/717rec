

## CI Failure Investigation

I've audited all test files and recently changed source files but **cannot identify the exact failing test** without the CI log output. Here's what I checked and found:

### Files changed in recent commits
1. `src/hooks/auth/index.ts` — made callback `async` (looks correct)
2. `src/services/brackets/database/MatchMapper.ts` — added type cast (looks correct)
3. `src/services/brackets/utils/BracketConversionUtils.ts` — added type cast (looks correct)
4. `src/services/brackets/viewer/BracketsViewerAdapter.ts` — added type casts (looks correct)
5. `src/services/matches/MatchWriteService.ts` — changed param type to `Database['public']['Tables']['matches']['Insert'][]` (looks correct)
6. `src/hooks/playoffs/usePlayoffViewModel.ts` — **the planned `bracketMatchesByType` cast was NOT applied**, but this is a TypeScript-only error which won't fail vitest (esbuild strips types)
7. `supabase/migrations/...` — RLS migration (SQL file, no effect on tests)

### All test files reviewed
- `tests/sanitizeReturnTo.test.ts` — assertions match implementation ✓
- `tests/bracketManagerPhase0.test.ts` — mocks everything, no dependency on changed files ✓
- `tests/bracketManagerSchema.test.ts` — same ✓
- `tests/repro_bracket_standings.test.ts` — same ✓
- `src/hooks/matches/__tests__/matchDatabaseUtils.test.ts` — mocks MatchWriteService ✓
- `src/hooks/team-stats/utils/__tests__/teamStats.test.ts` — mocks supabase directly ✓
- Career stat tests — pure unit tests, no changes to source ✓

### What I need from you

**Please paste the actual error output from the GitHub Actions log.** The annotation just says "Process completed with exit code 1" but the log will show which specific test or build step failed and the error message.

You can find this by clicking on the failed job in GitHub Actions → expanding the "Run tests" or "Build project" step.

### Remaining issue found (not CI-blocking)

The `bracketMatchesByType` type cast in `usePlayoffViewModel.ts` line 101 was planned but never applied. This would fail `npx tsc --noEmit` (the lint job) but **not** the test job since vitest uses esbuild.

### Security scan results (for later)

The security scan found 2 additional error-level issues:
1. **Team membership self-approval** — users can update their own `is_approved` field
2. **Anonymous score submissions** — unauthenticated users can insert scores

These should be addressed in a follow-up migration.


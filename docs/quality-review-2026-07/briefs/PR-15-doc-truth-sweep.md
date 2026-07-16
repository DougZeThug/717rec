# PR-15 — Documentation truth sweep

**Phase:** 6 (Polish) · **Tier:** 3 · **Agent:** Claude Code, Codex, or Lovable (docs-only) · **Parallelizable:** yes, anytime · **Depends on:** ideally after P1–P4 merge (so docs describe the fixed state) · **Expected score impact:** +0.3 overall (Code quality +1, Production readiness +1)

## 1. Background

Core docs are unusually accurate (verified: every npm script in TESTING.md/README exists; workflow names match; coverage thresholds match config to the decimal; `bun.lock` and `deno.lock` are intentional and documented). The drift is at the edges:

| Doc | Line(s) | Claim | Reality |
|---|---|---|---|
| `ARCHITECTURE.md` | 73-75, 108 | tables `message_board`, `team_members`; theme system location | tables don't exist (`messages`/`team_memberships`); theme file is 6 lines |
| `docs/audits/IMPROVEMENT-ROADMAP.md` | 3, 13+ | "Living document"; strict-mode/E2E counts/blocking status | contradicts current reality on all three |
| `src/docs/DEFINITION_OF_DONE.md` | 24 | `npm run format` | script doesn't exist |
| `SCHEDULER_README.md` | 109 | legacy algorithm file | file deleted |
| `docs/audits/PLAN-*.md` (3 files) | — | plan files | executed/abandoned; repo rule says delete when done |
| root `deno.lock` | — | implied lockfile enforcement | no `deno.json` anywhere; CI runs `deno test` without `--lock` — either wire it up or remove it |
| prior audit briefs | — | read as open findings | several are fixed (this review's §3 table) — mark resolution status |

## 2. Objective

A newcomer (or an AI agent) reading any doc gets only true statements; historical audit docs carry resolution status so fixed findings stop being re-reported.

## 3. Exact scope

Documentation and one lockfile decision. Zero product code.

## 4. Files to modify / delete

Listed above, plus `.github/workflows/supabase-ci.yml` and a new `deno.json` if option (a) in step 4 is chosen, plus a one-line "Resolved in <PR/commit>" annotation pass over `docs/audits/*` and the previous `docs/quality-review-2026-07` briefs.

## 5. Implementation steps

1. Fix the table/paths in ARCHITECTURE.md against `src/integrations/supabase/types.ts` (the generated source of truth).
2. Update or archive IMPROVEMENT-ROADMAP.md (recommend: archive under `docs/audits/archive/` with a pointer to the current review).
3. Correct DEFINITION_OF_DONE.md and SCHEDULER_README.md; delete the three stale PLAN files.
4. `deno.lock`: decide — (a) add `deno.json` **and edit `.github/workflows/supabase-ci.yml`'s edge-function-tests job** to run `deno test --frozen ...` (Deno 2 syntax) so the lockfile is actually enforced in CI, or (b) delete the lockfile and note why. (a) is preferred. The workflow edit is part of this PR's scope — without it the sweep can end with the same inert lockfile it set out to fix; acceptance for (a) is a CI run failing when a dependency hash is deliberately perturbed, then passing when restored.
5. Annotate prior audit briefs with status (Resolved/Superseded/Open + link).
6. Add a short "docs maintenance" note to CLAUDE.md or CONTRIBUTING: docs updated in the same PR as the behavior they describe.

## 6. Database requirements — none.
## 7. UI/UX requirements — none.

## 8. Testing requirements

None automated; `npm run knip` still clean (deleting docs can orphan nothing).

## 9. Validation commands

```bash
npm run lint && npm run typecheck   # standard gate; docs-only
```

## 10. Manual verification checklist (Doug)

- [ ] Skim ARCHITECTURE.md — table names now match what you see in Supabase's table editor.
- [ ] `docs/audits/` contains no file describing a problem that's already fixed without saying so.

## 11. Acceptance criteria

Every drift-table row above resolved; CI green.

## 12. Non-goals / rollback

- Non-goals: rewriting docs wholesale, user-facing help content (`/help` page).
- Rollback: docs revert trivially.

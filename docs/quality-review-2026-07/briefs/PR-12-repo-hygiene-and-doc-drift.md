# PR-12 — Repo hygiene: real README, doc drift, lockfile duplication, unused-export burn-down

| | |
|---|---|
| **Phase** | 5 — Performance and maintainability |
| **Tier** | 3 — Polish |
| **Priority** | Low |
| **Recommended agent** | Codex or Claude Code (mechanical) |
| **Difficulty** | Low |
| **Risk** | Very low |
| **Expected score improvement** | +0.5 overall (Code quality +3, Production readiness +3) |
| **Parallel-safe?** | Yes (docs/config only; coordinate the unused-export part with PR-04/07/08 timing) |
| **Depends on** | Best done after PR-01/02/04 so export cleanup doesn't collide |

## Background and problem statement

All confirmed by direct inspection:

1. **`README.md` is still Lovable boilerplate** ("Welcome to your Lovable project") while the repo actually has excellent docs elsewhere (`ARCHITECTURE.md`, `TESTING.md`, `CLAUDE.md`, `docs/`). First impression to any collaborator/agent is wrong.
2. **Doc drift:** `README.md`, `TESTING.md`, and `docs/SECRETS.md` reference CI workflow files that no longer exist (`test.yml`, `coverage-threshold.yml`, `knip.yml`, `secret-scan.yml`, `security-audit.yml`, `a11y.yml`, `e2e.yml`). Reality: 4 workflows — `ci.yml`, `security.yml`, `supabase-ci.yml`, `summary.yml` (jobs were consolidated). Historical audit files in `docs/audits/` also reference them but are dated records — annotate, don't rewrite.
3. **Dual lockfiles:** `bun.lock` AND `package-lock.json` are both tracked; CI and CLAUDE.md say npm-only. Drift risk for any tool that prefers bun.
4. **~285 knip-ignored unused exports** (export-level rules disabled in `knip.json`, deferred by the July dead-code cleanup) — burn down the safe portion and re-enable stricter knip settings if feasible.
5. `CLAUDE.md`'s "~370 files / ~2.7k tests" figure is stale (now ~447 files / ~3.2k tests).

## Objective

A new contributor (human or AI) reading README/TESTING/SECRETS gets an accurate picture; one package manager; measurably fewer dead exports.

## Exact scope

1. Rewrite `README.md`: what 717REC is (one paragraph), stack, how to run (`npm ci`, `npm run dev`), test commands (defer to TESTING.md), links to ARCHITECTURE/TESTING/CLAUDE/docs, deploy note (Lovable + Cloudflare), CI overview (the real 4 workflows). Keep the Lovable project URL.
2. Fix stale workflow names in `TESTING.md` and `docs/SECRETS.md` (map each old name to the job in `ci.yml`/`security.yml` that replaced it). Add a one-line "historical — workflow names refer to pre-consolidation CI" note at the top of affected `docs/audits/*` files rather than editing history.
3. Delete `bun.lock`. (Keep `deno.lock` — edge functions use Deno.)
4. Update CLAUDE.md test-count figures.
5. Unused exports: run `npx knip --exports` (or temporarily enable export rules), delete exports that are pure dead weight, keep genuinely public-API ones in the ignore list with a comment. Cap this at the clearly-safe set — anything ambiguous stays.
6. **Out of scope:** any behavior change; restructuring docs/; the `coverage-baseline.txt` mechanics (regenerating it happens naturally via `test:coverage:update-baseline` when thresholds move).

## Likely files affected

`README.md`, `TESTING.md`, `docs/SECRETS.md`, `docs/audits/*` (annotation lines), `CLAUDE.md`, `bun.lock` (deleted), `knip.json`, assorted `index.ts`/barrel files losing dead exports.

## Implementation instructions

1. Generate the real workflow/job inventory from `.github/workflows/` first; write docs from that, not from memory.
2. For each removed export: `grep` for the symbol repo-wide first; zero hits (outside its own file) → delete; any hit → leave.
3. `npm run knip` and full typecheck after each batch.

## Database requirements

None.

## UI and UX requirements

None.

## Testing requirements

No new tests. Gate: knip, typecheck, lint, full suite, build all green (deleting a used export would fail typecheck).

## Required validation commands

```bash
npm ci
npm run knip && npm run typecheck && npm run lint
npm run test:coverage && npm run build
```

## Manual verification checklist (for Doug)

1. Open the repo on GitHub. **Expect:** the README describes YOUR league app, with working run instructions.
2. CI on the PR: all green.

## Acceptance criteria

- [ ] README contains zero Lovable-boilerplate sections and accurate commands.
- [ ] `grep -r "coverage-threshold.yml\|secret-scan.yml\|a11y.yml" README.md TESTING.md docs/SECRETS.md` → no hits.
- [ ] `bun.lock` gone; `npm ci` unaffected.
- [ ] Unused-export count reduced (report before/after numbers); knip green.

## Non-goals and guardrails

- Don't rewrite audit history (annotate only).
- Don't touch `.npmrc`, `deno.lock`, or CI workflow files themselves.
- Don't delete exports used only by tests IF the test represents desired public API — judge, and when unsure, keep.

## Rollback

Git revert; nothing external.

## Deliverables from the implementing agent

Before/after unused-export counts; list of doc claims corrected; confirmation grep outputs.

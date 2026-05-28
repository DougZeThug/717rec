# Code Quality Cleanup Plan — 2026-05-01

Based on the audit refresh on 2026-05-01 (branch `claude/audit-code-quality-QPSc5`).
The codebase is healthy. This plan tackles the leftover items from the 2026-04-24
audit, in order of biggest payoff for least risk.

Each step below is intended to be **one commit**. Stop after each step,
verify, and only then move on.

---

## Phase 1 — Quick wins (low risk, high value)

### Step 1.1 — Stop tracking `.env` in git
**Why:** `.env` is committed but `.gitignore` doesn't list it. Even though the
keys inside are public Supabase browser keys (not real secrets), this is
non-standard and means future secrets could accidentally land in git.

**What changes:**
- Add `.env` to `.gitignore`
- `git rm --cached .env` (keeps the file on disk, just stops tracking it)
- Verify `.env.example` is still tracked and up to date

**Verify:** `git ls-files | grep '^.env'` returns only `.env.example`.

---

### Step 1.2 — Archive stale planning docs
**Why:** CLAUDE.md says plans should be deleted when done. Two plan files
are sitting at the repo root from finished work.

**What changes:**
- Delete `PLAN-coverage-timeout-fix.md` (work is merged)
- Move `CODE-QUALITY-AUDIT-2026-04-24.md` into `docs/audits/` (or delete —
  this current plan supersedes it)

**Verify:** `ls *.md` at repo root only shows: `AGENTS.md`, `ARCHITECTURE.md`,
`CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `SCHEDULER_README.md`, `TESTING.md`,
and this plan file.

---

## Phase 2 — Split oversized service files

The 400-line rule from CLAUDE.md exists so files stay easy to read.
Two services are over.

### Step 2.1 — Split `BracketAdminService.ts` (503 lines)
**Why:** It's the biggest service file. Hard to scan in one sitting.

**Approach:** Read the file, identify natural groupings of functions
(e.g. seeding, reset, lifecycle, queries). Split into a `BracketAdmin/`
subfolder following the `matches/` pattern referenced in CLAUDE.md, with
a barrel `index.ts` that re-exports the same public API so callers don't change.

**Verify:**
- `npm test` passes
- `npx tsc --noEmit` passes
- No call site imports break

---

### Step 2.2 — Split `SupabaseSqlStorage.ts` (445 lines)
**Why:** Same reason. This is the storage adapter for the brackets-manager
library — well-defined interface, so splitting by entity (matches, participants,
stages, groups) should be clean.

**Verify:** Same as 2.1, plus run any bracket-related tests specifically.

---

## Phase 3 — Split oversized components

These five components are each >400 lines and were on the list a week ago.
None have moved.

| File | Lines |
|---|---:|
| `src/components/history/SeasonAccordion.tsx` | 511 |
| `src/components/teams/TeamAdvancedStatsSection.tsx` | 508 |
| `src/components/schedule/TimeslotGrouping.tsx` | 490 |
| `src/components/home/WeeklyRecapCard.tsx` | 433 |
| `src/components/admin/teams/TeamManagementTab.tsx` | 406 |

### Approach (one commit per file, in this order)
Largest and most user-facing first.

For each: pull out sub-sections (rows, headers, modals, hooks) into their own
files. Don't change behavior — visually identical, just smaller files.
Test each in the browser after splitting.

### Step 3.1 — `SeasonAccordion.tsx`
### Step 3.2 — `TeamAdvancedStatsSection.tsx`
### Step 3.3 — `TimeslotGrouping.tsx`
### Step 3.4 — `WeeklyRecapCard.tsx`
### Step 3.5 — `TeamManagementTab.tsx`

**Verify each:** `npm test` passes; load the relevant page in the dev server
and click around to confirm nothing regressed.

---

## Phase 4 — Tighten typing (lower priority, do as we touch each file)

Don't do this as a dedicated sweep. Instead, **whenever we work on one of these
files for another reason, replace its `any`s.** Hotspots, in order:

1. `src/components/playoffs/form/bracket-teams/hooks/useBracketFormData.ts` — 14 `any`
2. `src/services/BadgeProcessingService.ts` — 10 `any`
3. `src/services/brackets/viewer/BracketsViewerAdapter.ts` — 6 `as unknown as`
   double casts. Either write a real `.d.ts` for the external lib or narrow them.
4. `src/components/ui/charts/utils/tooltipUtils.ts` — 6 `any`
5. `src/components/ui/charts/ChartLegend.tsx` — 6 `any`
6. `src/components/stats/career/AllTeamsCareerPowerScoreChart.tsx` — 6 `any`

Test-file `any`s (52 of the 203) are acceptable mocks — leave them.

---

## Phase 5 — Test coverage gaps (optional, ongoing)

From the prior audit — services without `__tests__/`:
- `ProfileService`
- `ContactService`
- Several `Team*` write-path services

Add tests as we touch these services for other reasons.

---

## What NOT to change

Verified clean and out-of-scope for this plan:
- Routing in `App.tsx`, `main.tsx` bootstrap
- Realtime channel subscriptions in hooks (allowed exception)
- `src/utils/imageUpload.ts` (allowed exception)
- QueryClient config
- Error-handler utilities (`src/utils/errorHandler.ts`, `src/types/errors.ts`)
- `src/integrations/supabase/types.ts` (auto-generated)

---

## Suggested execution order

1. Phase 1 (both steps) — maybe 10 minutes total, immediate cleanup
2. Phase 2.1 — biggest service file
3. Phase 3.1 + 3.2 — biggest components
4. Phase 2.2 — second service file
5. Phase 3.3, 3.4, 3.5 — remaining components
6. Phase 4 / 5 — opportunistic, no dedicated push

After everything: delete this plan file (per CLAUDE.md convention).

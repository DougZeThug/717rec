# Phase 4 — Codebase Hygiene

Three sub-phases, ordered by risk (lowest first). Each is a separate commit/PR so we can verify and roll back independently.

---

## 4A — `design-no-redundant-size-axes` (805 sites) — LOWEST RISK

Pure mechanical codemod: `w-N h-N` (and `w-[X] h-[X]`) → `size-N`. Zero behavior change since Tailwind's `size-*` expands to `width` + `height`.

**Approach**
1. Write a Node AST-aware regex script (`tools/codemods/size-axes.mjs`) that:
   - Matches `className` attributes / `cn()` arg strings
   - Finds adjacent `w-X` and `h-X` pairs where X is identical (numeric, fraction, arbitrary value, or `full`/`screen`/`auto`/`px`)
   - Replaces both with `size-X`, preserving order of remaining classes
   - Skips when `w-` and `h-` use different values, or when one has a responsive/state prefix the other doesn't (e.g. `md:w-4 h-4`)
2. Dry-run, print a diff summary by directory, then apply.
3. Spot-check 10 random changes visually in preview.

**Verify**: `npm test`, `npx tsc --noEmit`, visual scan of TeamDetails, Standings, Admin Dashboard, Playoffs.

**Expected delta**: ~805 warnings → 0; bundle slightly smaller (shorter class strings).

---

## 4B — `design-no-default-tailwind-palette` (213 sites) — MEDIUM RISK

Replace bare `gray-*` / `slate-*` / `zinc-*` with semantic tokens. Risk is dark mode regressions and losing intentional brand contrast.

**Mapping** (already documented in `src/styles/design-system/semanticColors.ts`):
- `bg-white`, `bg-gray-50/100`, `bg-slate-50/100` → `bg-background` / `bg-muted`
- `bg-gray-800/900`, `bg-slate-800/900` → `bg-card` / `bg-background`
- `text-gray-900/800/700` → `text-foreground`
- `text-gray-400/500/600` → `text-muted-foreground`
- `border-gray-200/300` → `border-border`
- Drop paired `dark:` variants once semantic token is in place

**Approach**
1. Generate a per-file report from react-doctor output, grouped by directory.
2. Hand-review (not codemod) directory-by-directory in this order, smallest blast radius first:
   - `src/components/ui/` (shared primitives — biggest leverage, but already mostly tokenized; expect few hits)
   - `src/components/admin/` (internal, easier to QA)
   - `src/components/hero/`, `src/components/home/`
   - `src/components/teams/`, `src/components/stats/`, `src/components/playoffs/`
   - `src/components/history/`, `src/components/schedule/`, remaining
3. **Preserve** (per memory + semanticColors.ts):
   - Division colors (amber/blue/green - these are NOT gray/slate)
   - Status colors (green/red/amber for win/loss/warn)
   - `cornhole-*` brand tokens
   - Anywhere a designer chose a specific gray for contrast against a colored bg (case-by-case)
4. Toggle dark/light after each directory; smoke-test affected pages.

**Verify per batch**: visual diff in dev preview at light + dark, `npm test`.

**Expected delta**: ~213 → ~20-40 (intentional preserved cases).

---

## 4C — `knip/files` (198) + `knip/exports` (136) + `knip/types` (81) — HIGHEST RISK

Knip flags items it can't statically resolve. Common false positives:
- Files loaded via `React.lazy(() => import('...'))` with template strings or computed paths
- Test-only utilities imported only from `__tests__/`
- Storybook stories (if any)
- Edge functions referenced from `supabase/config.toml`
- Type-only re-exports through barrel `index.ts` files
- Symbols referenced via string in routes / config

**Approach** (one PR per category, audit-then-delete)

### 4C.1 — `knip/types` (81) — safest
Unused type aliases/interfaces. Low blast radius.
1. Run `npx knip --include types --reporter json > /tmp/knip-types.json`.
2. For each: grep the codebase for the name (incl. `as TypeName`, generic args). If zero hits outside the declaration, delete.
3. Batch delete in groups of ~20 with `tsc --noEmit` between batches.

### 4C.2 — `knip/exports` (136) — medium
Exports never imported. Could be: dead, public-API-by-convention, or barrel re-exports knip can't trace.
1. Same grep-verify pattern.
2. For barrel files (`index.ts`), check whether the *re-exported source* is imported elsewhere — if so, the barrel export is dead but the source isn't.
3. **Confirm with user before deleting** anything in:
   - `src/services/` (public service API surface)
   - `src/types/` (consumer-facing types)
   - `src/hooks/` (used across many pages)
4. Convert remaining safe deletions to `export` removal (keep symbol if used internally) or full removal.

### 4C.3 — `knip/files` (198) — riskiest
Whole files knip thinks are orphaned.
1. Generate the list, then **for each file** check:
   - `rg "from ['\"].*<basename>['\"]"` across `src/`, `tests/`, `supabase/`
   - Search for dynamic imports referencing the path
   - Check `vite.config.ts`, `vitest.config.ts`, `index.html`, `supabase/config.toml`
2. Group into 3 buckets:
   - **Confirmed dead** (no references anywhere) → delete
   - **Test fixtures / dev tools** → move to `tools/` or delete if obsolete
   - **False positive** (dynamic import, config reference) → add to knip ignore list
3. **Present user with a categorized list before bulk deletion**, in directory batches:
   - Old/superseded admin components
   - Unused service helpers
   - Stale design-system experiments
   - Orphaned hooks
4. Delete in batches of 10–20 files per commit; run full test suite + build after each.

**Verify each batch**: `npm test`, `npx tsc --noEmit`, build succeeds, click through key routes (Home, Teams, Standings, Playoffs, Admin).

---

## Execution order recommendation

1. **4A first** (codemod, low risk, big visible win)
2. **4B in directory batches** (visible improvement, design-system aligned)
3. **4C.1 → 4C.2 → 4C.3** last (audit-heavy; pause for your approval on each batch of file deletes)

After all three: re-run react-doctor to confirm the score moves and report deltas.

## Out of scope (intentionally deferred)

- `js-combine-iterations` (62) — perf only, no functional issue
- `design-no-three-period-ellipsis` (58) — cosmetic
- `no-cascading-set-state` (22) — already triaged as mostly false positives
- `js-tosorted-immutable`, `no-react19-deprecated-apis` — low count, low value

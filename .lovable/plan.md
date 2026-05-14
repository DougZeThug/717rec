# React Doctor Report & Fix Plan

## Snapshot
**Total findings: 2,552** (6 errors, 2,546 warnings)

Down from prior runs — Rules-of-Hooks, nested components, hydration `new Date()`, and effect cleanups were already cleared in earlier turns.

## The 6 Errors (must-fix, high-confidence real bugs)

| # | Rule | File | Issue |
|---|------|------|-------|
| 1 | `no-mutable-in-deps` | `src/App.tsx:82` | `location.pathname` in `useEffect` deps — mutable global, won't trigger re-runs reliably. Use `useLocation()` from react-router. |
| 2 | `no-mutable-in-deps` | `src/components/navigation/AnimatedBreadcrumbs.tsx:57` | Same pattern. |
| 3 | `no-mutable-in-deps` | `src/pages/NotFound.tsx:14` | Same pattern. |
| 4 | `role-has-required-aria-props` | `src/components/hero/RequestHeroCard.tsx:129` | `role="combobox"` missing `aria-controls`. |
| 5 | `role-has-required-aria-props` | `src/components/hero/ParticipationHeroCard.tsx:103` | Same. |
| 6 | `role-has-required-aria-props` | `src/components/ui/multi-select.tsx:55` | Same. |

## High-Value Warning Buckets

### Real-bug-shaped (~80 items)
| Rule | Count | What it means |
|------|------:|---------------|
| `no-cascading-set-state` | 22 | `setState` inside a render path triggers re-render loops. Move to handlers/effects. |
| `no-array-index-as-key` | 44 | Index keys break reconciliation when lists reorder. Use stable IDs. |
| `no-derived-useState` / `no-derived-state-effect` | 13 | State that mirrors props — derive in render or use `useMemo`. |
| `rerender-memo-with-default-value` | 17 | Inline `={}`/`=[]` defaults break memo equality. Hoist to module constants. |
| `rerender-state-only-in-handlers` | 10 | State only read in handlers — convert to `useRef`. |
| `rerender-functional-setstate` | 9 | `setX(x+1)` race risk → use `setX(prev => prev+1)`. |
| `no-render-in-render` | 8 | Component called as function instead of JSX. |
| `no-effect-event-handler` | 11 | Event-handler logic stuck in `useEffect`. |
| `no-prop-callback-in-effect` | 1 | Calling a prop callback from an effect → use Effect Event pattern. |
| `query-mutation-missing-invalidation` | 1 | A TanStack mutation forgets `queryClient.invalidateQueries`. |

### React 19 readiness
| Rule | Count |
|------|------:|
| `no-react19-deprecated-apis` | 152 |
| `use-lazy-motion` | 57 (framer-motion bundle hit) |
| `prefer-dynamic-import` | 16 |

### A11y (small, easy wins)
| Rule | Count |
|------|------:|
| `label-has-associated-control` | 14 |
| `no-static-element-interactions` | 12 |
| `click-events-have-key-events` | 10 |
| `heading-has-content` / `no-redundant-roles` / `no-autofocus` / `no-vague-button-label` | 5 combined |

### Design-system hygiene (large, mostly cosmetic)
- `design-no-redundant-size-axes` (805) — e.g. `w-4 h-4` → `size-4`.
- `design-no-default-tailwind-palette` (213) — replace `bg-blue-500` etc. with semantic tokens (already a Core memory rule).
- `design-no-space-on-flex-children` (58), `design-no-three-period-ellipsis` (58 — use `…`), `design-no-bold-heading` (17), `design-no-em-dash-in-jsx-text` (6), `no-gradient-text` (6), `design-no-redundant-padding-axes` (9).

### Codebase / module hygiene
- `exports` (294), `files` (198), `types` (187), `duplicates` (47), `no-barrel-import` (4) — mostly file/folder/export shape suggestions.

### JS micro-perf (low priority)
- `js-combine-iterations` (62), `js-tosorted-immutable` (29), `async-await-in-loop` (33), `js-index-maps` (15), `js-set-map-lookups` (11), `js-flatmap-filter` (6), `js-cache-*` (10), `js-min-max-loop` (5), `js-length-check-first` (3).

## Recommended Fix Plan (prioritized)

I'd tackle this in 4 phases. Each phase is independently shippable.

### Phase 1 — Errors (6 items, ~30 min)
1. **Mutable deps (3 files):** replace `location.pathname` references in deps with `useLocation().pathname` from `react-router-dom` (already used elsewhere in the app). Behavior preserved — effect now actually re-runs on route changes (this may be a latent navigation bug we just fix).
2. **Combobox aria (3 files):** add `aria-controls={listboxId}` and a stable `id` on the listbox `<ul>` / popover content. Pure a11y addition, no behavior change.

Verify: rerun `react-doctor` → 0 errors.

### Phase 2 — Real bugs in warnings (~80 items, batched)
Order: `no-cascading-set-state` → `no-array-index-as-key` → `rerender-memo-with-default-value` → `no-derived-useState` → `no-render-in-render` → the singleton `query-mutation-missing-invalidation`.

Approach per file: read, fix, run that file's colocated test (or a parent integration test) before moving on. No business-logic changes.

### Phase 3 — A11y sweep (~50 items)
Mechanical: add `htmlFor` ↔ `id`, add `role="button"` + `tabIndex={0}` + keydown handler for clickable divs, replace empty `<h*>` shells, remove redundant roles. One PR per folder (`admin/`, `stats/`, etc.).

### Phase 4 — Design-token & micro-perf cleanup (large, optional)
- **Codemod**: `w-N h-N` → `size-N` (805 hits) — safe, automated regex.
- **Codemod**: `...` → `…` (58 hits).
- **Manual**: replace default tailwind palette colors with semantic tokens (213) — already mandated by Core memory; do this folder-by-folder.
- Defer `js-*` micro-perf and `exports/files/types/duplicates` reshaping unless something is actually slow or hard to navigate.

### Out of scope for now
- React 19 deprecation churn (152) — wait until we actually upgrade React.
- `use-lazy-motion` / `prefer-dynamic-import` — schedule with the next perf pass; touches every framer-motion import.

## Verification strategy
- After each phase: `npx react-doctor@latest` and confirm the targeted bucket dropped to 0.
- Run `npm test` after Phases 1 & 2; spot-check preview for Phase 3.

If you approve, I'd recommend starting with **Phase 1 only** in the next turn — it's the 6 hard errors and is a clean, low-risk diff.

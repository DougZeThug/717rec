# PR-12 — Accessibility: extend axe coverage to admin screens + fix the two React prop warnings

> **Resolution status:** Open — accessibility polish brief; not part of PR-15 docs-only scope.

**Phase:** 4 (Accessibility) · **Tier:** 2 · **Agent:** Claude Code or Codex · **Parallelizable:** yes · **Depends on:** nothing · **Expected score impact:** +0.3 overall (Accessibility +3)

> **Rescoped after review verification.** The original version of this brief planned a route-change focus manager. That work **already exists and is wired in**: `src/components/a11y/RouteFocusManager.tsx` (imported in `App.tsx:19`, rendered at `:291`, with its own test) moves focus to the `<main>` landmark on push navigations and correctly skips initial load and back/forward (POP) navigations. Do not reimplement or replace it. The review's original finding (F-14) came from a grep for `\.focus()` that missed `focus({ preventScroll: true })` — the report has been corrected.

## 1. Background

The accessibility baseline is strong — verified in this review: skip-link on all 43 walked page-loads, zero images missing `alt`, zero horizontal overflow at 375px, CI's axe scan green on 6 public routes, Radix primitives (built-in focus traps) for dialogs, and the `RouteFocusManager` above. What remains:

1. **Admin screens have never been axe-scanned.** `e2e/a11y.spec.ts` covers 6 public routes only; the 18-section admin console — where Doug spends league night — has zero automated a11y checking.
2. `fetchPriority` React prop warning on `<img>` (`src/components/home/HeroSection.tsx:54,128`) — React 18 wants the lowercase DOM attribute; fires a console error on every home load (observed at all 3 viewports in the review walk).
3. A `ref is not a prop` warning on /stats (a component passing `ref` without `forwardRef` — trace via the warning's component stack in dev).
4. Optional polish, decide-don't-drift: `RouteFocusManager` focuses the `<main>` landmark; focusing the page `<h1>` instead would announce the new page's *name* to screen readers rather than a generic landmark. Small UX judgment call — if adopted, adjust the existing component and its test; if not, record the decision in the component's doc comment.

## 2. Objective

Admin screens are axe-covered in CI; consoles are free of React prop warnings; the existing focus manager's behavior is a documented decision.

## 3. Exact scope

One e2e spec extension, two warning fixes, one optional adjustment to the existing focus manager. No new components.

## 4. Files to modify

- `e2e/a11y.spec.ts` (admin routes behind the mocked-admin-auth pattern from `admin-access.spec.ts`)
- `src/components/home/HeroSection.tsx`
- The /stats component with the ref warning
- (optional, decision-dependent) `src/components/a11y/RouteFocusManager.tsx` + its test

## 5. Implementation steps

1. Extend `e2e/a11y.spec.ts` with `/admin` sections (Timeslots, Scores, Teams at minimum — the sections an admin touches weekly) using the mocked-admin-auth setup already proven in `admin-access.spec.ts`; keep the same zero-violations assertion.
2. Replace `fetchPriority="high"` with `fetchpriority="high"` (both HeroSection sites).
3. Fix the forwardRef warning on /stats (wrap the offending component in `React.forwardRef` or stop passing `ref`).
4. Decide the `<main>`-vs-`<h1>` focus question (see §1.4); implement or document accordingly.

## 6. Database requirements

None.

## 7. UI/UX requirements

- No visible behavior change for mouse users; `:focus-visible` styling only if step 4 adopts h1 focus.

## 8. Testing requirements

Extended axe spec green; `RouteFocusManager` test updated only if its behavior changes.

## 9. Validation commands

```bash
npm run e2e
npm run test:file -- src/components/a11y/__tests__/RouteFocusManager.test.tsx
npm run typecheck && npm run lint && npm run test:coverage && npm run build
```

## 10. Manual verification checklist (Doug)

- [ ] Browser console on / shows no React warnings.
- [ ] With keyboard only: Tab to "Standings" in the nav, press Enter — the next Tab lands inside the page content (this should already work today via RouteFocusManager; you're confirming it wasn't broken).

## 11. Acceptance criteria

- axe spec covers ≥3 admin sections and passes in CI.
- Zero React prop warnings on walked routes.
- `RouteFocusManager` untouched or deliberately adjusted with its test updated — never duplicated.

## 12. Non-goals / rollback

- Non-goals: full WCAG audit beyond axe's automated rules, color-contrast redesign, reduced-motion work, reimplementing route focus management.
- Rollback: warning fixes are trivially safe; the axe spec extension is additive.

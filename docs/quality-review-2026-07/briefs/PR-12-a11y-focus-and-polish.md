# PR-12 — Accessibility: route-change focus management + small correctness polish

**Phase:** 4 (Accessibility) · **Tier:** 2 · **Agent:** Claude Code (focus logic) — not ideal for Lovable · **Parallelizable:** yes · **Depends on:** nothing · **Expected score impact:** +0.5 overall (Accessibility +5)

## 1. Background

The baseline is genuinely good — verified in this review: skip-link present on all 43 walked page-loads, zero images missing `alt`, zero horizontal overflow at 375px, CI's axe scan green on 6 public routes, Radix primitives (with their built-in focus traps) used for dialogs. The gaps:

1. **Route changes don't move focus.** The product code contains exactly **one** manual `.focus()` call (`MessageEditForm.tsx:27`) and no route-change focus handling in `src/App.tsx` — a screen-reader user who clicks "Standings" hears nothing; focus stays on the old link while the page content changes underneath.
2. `fetchPriority` React prop warning on `<img>` (`src/components/home/HeroSection.tsx:54,128`) — React 18 wants the lowercase DOM attribute; fires a console error on every home load.
3. A `ref is not a prop` warning on /stats (component passing `ref` without forwardRef — trace via the warning stack).
4. axe coverage is 6 public routes only; admin screens never scanned.

## 2. Objective

Keyboard/screen-reader users get a coherent navigation experience (focus lands on the new page's heading); consoles are warning-free; axe coverage includes admin.

## 3. Exact scope

Router-level focus manager, two warning fixes, one e2e spec extension.

## 4. Files to modify / create

- `src/App.tsx` or `src/components/layout/` (RouteFocusManager, new)
- `src/components/home/HeroSection.tsx`
- The /stats component with the ref warning
- `e2e/a11y.spec.ts` (admin routes behind the existing auth-mock pattern from `admin-access.spec.ts`)

## 5. Implementation steps

1. **RouteFocusManager**: on `location.pathname` change, move focus to the main `<h1>` (`tabIndex={-1}`, `focus({ preventScroll: false })`), falling back to `#main-content`. Announce via the heading itself (focused headings are read aloud) — no live region needed for navigation. Skip the initial mount (don't steal focus on first load).
2. Replace `fetchPriority="high"` with `fetchpriority="high"` (both sites).
3. Fix the forwardRef warning on /stats (wrap the component in `React.forwardRef` or stop passing `ref`).
4. Extend `e2e/a11y.spec.ts` with `/admin` sections (Timeslots, Scores, Teams at minimum) using the mocked-admin-auth setup already proven in `admin-access.spec.ts`; keep the same zero-violations assertion.
5. Unit test for RouteFocusManager (navigate → active element is the new h1; initial mount → focus untouched).

## 6. Database requirements

None.

## 7. UI/UX requirements

- No visible focus ring flash for mouse users (use `:focus-visible` styling on the heading).
- Skip-link behavior unchanged.

## 8. Testing requirements

Unit test (step 5) + extended axe spec green.

## 9. Validation commands

```bash
npm run test:file -- src/components/layout/__tests__/RouteFocusManager.test.tsx
npm run e2e
npm run typecheck && npm run lint && npm run test:coverage && npm run build
```

## 10. Manual verification checklist (Doug)

- [ ] With keyboard only: Tab to "Standings" in the nav, press Enter — the next Tab lands inside the standings content, not back at the top.
- [ ] Browser console on / shows no React warnings.

## 11. Acceptance criteria

- Every route change moves focus to the new page's h1 (verified by the unit test).
- axe spec covers ≥3 admin sections and passes.
- Zero React prop warnings on walked routes.

## 12. Non-goals / rollback

- Non-goals: full WCAG audit beyond axe's automated rules, color-contrast redesign, reduced-motion work.
- Rollback: remove RouteFocusManager (behavior returns to status quo); warning fixes are trivially safe.

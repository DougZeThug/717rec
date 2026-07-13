# PR-09 — Route-change focus management + component-level accessibility checks

| | |
|---|---|
| **Phase** | 4 — UI, UX, accessibility, and mobile |
| **Tier** | 2 — High value (accessibility depth beyond the existing scan) |
| **Priority** | Medium |
| **Recommended agent** | Claude Code |
| **Difficulty** | Medium |
| **Risk** | Low-medium (focus changes are user-visible; keep scope tight) |
| **Expected score improvement** | +1.0 overall (Accessibility 80→95) |
| **Parallel-safe?** | Yes |
| **Depends on** | PR-01 |

## Background and problem statement

- The app's a11y baseline is genuinely good: axe WCAG 2 A/AA scan of 6 routes as a **required CI gate** (green at the reviewed commit), Lighthouse a11y ≥ 0.9 enforced, skip links in `Navbar`/`PageLayout`, a `RouteAnnouncer` for SPA navigation, 233 `aria-*` usages, Radix primitives (accessible by default).
- Two measured gaps:
  1. **Programmatic focus management is nearly absent** — exactly 2 non-test `.focus()` call sites in `src/`. On SPA route change, focus stays on the clicked nav link; keyboard/screen-reader users don't land at the new page's start (the RouteAnnouncer announces it, but focus doesn't move). Dialogs rely on Radix defaults (fine) but the route-level gap is real.
  2. **No unit-level a11y assertions** — axe runs only in e2e on 6 public routes; admin screens, dialogs, drawers, and the live-scoring flow are never scanned (they require auth, so the e2e scan can't reach them).
- Status: focus-site count and scan scope **confirmed by measurement**; the impact on users is inferred (standard WCAG 2.4.3 practice), not user-reported.
- Preserve: existing skip links, RouteAnnouncer, Radix focus trapping, current tab order inside pages.

## Objective

Keyboard and screen-reader users land in a predictable place after every route change, and the highest-value authenticated/interactive surfaces get automated axe checks at the component level.

## Exact scope

1. **Route-change focus**: on pathname change, move focus to the main content landmark (`<main tabIndex={-1}>` or the page `<h1>`), *except* on back/forward navigation where scroll/focus restoration should win. Implement once, centrally — the natural home is alongside `RouteAnnouncer` in `src/components/a11y/` wired in `src/App.tsx` or `PageLayout`. Suppress the focus ring for mouse users (`:focus-visible` styling only; do not add a visible ring to `main`).
2. **Skip-link target audit**: verify the existing skip links point at the same landmark that now receives focus (one landmark, one id).
3. **Unit-level axe**: add `vitest-axe` (or `jest-axe` — pick the one compatible with the vitest setup; no other new deps) and a small helper `expectNoAxeViolations(container)`. Apply to ~6 high-value component tests: `LiveMatchView` (or the live-scoring page shell), `CompleteMatchDialog`, the mass-score-entry table, `ScoreSubmissionModal`, one admin dashboard section shell, the message board composer. Rule set: WCAG 2 A/AA, same as e2e.
4. **Out of scope:** color-contrast redesign, adding axe to every test (6 targeted surfaces only), changes to Radix internals, the e2e a11y spec (already good).

## Likely files affected

- `src/components/a11y/` (new `RouteFocusManager.tsx` or extension of `RouteAnnouncer.tsx` — read it first; it may already track location)
- `src/App.tsx` or `src/components/layout/PageLayout.tsx` (mount point + `<main>` landmark id/tabIndex)
- `src/components/layout/Navbar.tsx` (skip-link target consistency)
- `src/setupTests.ts` (axe matcher registration), `package.json` (one dev dep)
- ~6 existing `__tests__` files gain an axe assertion

## Implementation instructions

1. Read `RouteAnnouncer.tsx` and its test; mirror its location-subscription approach.
2. Implement focus move with `requestAnimationFrame` after route content mounts (lazy routes: wait for Suspense resolution — focus after the route's content renders, not the fallback; simplest robust approach is focusing in a `useEffect` keyed on pathname inside `PageLayout`, which only renders with content).
3. Respect `history.action === 'POP'` (react-router v7: `useNavigationType()`) — skip focus stealing on back/forward.
4. Add the axe helper + assertions; fix only violations the new checks reveal **within the 6 chosen surfaces** (report anything bigger).

## Database requirements

None.

## UI and UX requirements

- **Journey:** keyboard user tabs to "Standings", presses Enter → focus lands on the standings page's main landmark; screen reader announces the page (existing) AND reads from the top of content.
- Mouse users see no new focus ring; no scroll jump beyond the normal route change.
- Mobile (375 px): bottom-nav taps behave identically; no visual change.
- Back button: browser restores scroll; focus is NOT stolen.

## Testing requirements

- Unit test for the focus manager: render router with two routes → navigate → `document.activeElement` is the main landmark; navigate back (POP) → focus NOT moved.
- The 6 axe assertions (setup: render with house mocks; action: none; expected: zero violations).
- Full suite + the e2e a11y spec still green (CI runs it).

## Required validation commands

```bash
npm ci
npm run test:file -- src/components/a11y src/components/live-scoring src/components/home
npm run test:coverage
npm run typecheck && npm run lint && npm run build
npm run e2e   # a11y + smoke specs (CI environment)
```

## Manual verification checklist (for Doug)

1. Open the site, press Tab once. **Expect:** a "skip to content" link appears; Enter jumps to content.
2. Click "Teams" in the nav, then press Tab. **Expect:** the next focused element is inside the teams page content, not back up in the navbar.
3. Press the browser Back button. **Expect:** you return to where you were, scroll position preserved, nothing visibly jumps.

## Acceptance criteria

- [ ] After a PUSH navigation, `document.activeElement` is the main content landmark (unit-tested).
- [ ] POP navigation does not move focus (unit-tested).
- [ ] 6 named surfaces have zero axe violations at WCAG 2 A/AA (unit-tested).
- [ ] e2e axe gate still green; no visual regressions in screenshots.

## Non-goals and guardrails

- No focus changes inside dialogs/drawers (Radix owns those).
- No global outline restyling.
- Don't expand the axe rollout beyond 6 surfaces here.

## Rollback

Client-only; git revert. No data risk.

## Deliverables from the implementing agent

The focus-manager implementation note (where mounted, POP handling); axe violations found-and-fixed vs found-and-reported; test/build outputs.

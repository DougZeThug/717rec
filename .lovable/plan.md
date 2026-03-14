

## Safari Freezing / Tabs Not Opening — Root Causes & Fixes

### Problem
Safari users experience the app freezing on load or randomly becoming unresponsive (clicks do nothing, tabs won't open). Chrome users are unaffected.

### Root Causes Identified

**1. CSS `contain: 'layout style paint'` on PageTransition wrapper**
Safari has known bugs with CSS containment, particularly `contain: paint` and `contain: layout style paint`. The `PageTransition` component wraps ALL page content with `contain: 'layout style paint'`. In Safari, this can cause the browser to incorrectly determine that content is "not visible" or suppress pointer events on child elements — making the entire app appear frozen/unresponsive. This is the most likely cause of "can't click anything."

**2. No React deduplication in Vite config**
Without `resolve.dedupe`, Safari can end up with multiple React instances (from dependencies bundling their own copy). This breaks hooks and context sharing, causing components to silently fail or throw. Chrome is more tolerant of this.

**3. `requestIdleCallback` not natively supported in Safari**
The fallback uses `setTimeout` with long delays (8-12 seconds). While this shouldn't cause freezing, the Sentry replay integration (`addLazyIntegrations`) fires after the timeout and can trigger forced reflows when it starts DOM observation. On Safari's slower JS engine, this can cause a visible freeze.

### Changes

**File 1: `src/components/transitions/PageTransition.tsx`**
- Remove `contain: 'layout style paint'` from the wrapper `style` prop. This is the primary suspect for Safari click/tap unresponsiveness. The `minHeight` reservations on individual components already handle CLS.

**File 2: `vite.config.ts`**
- Add `resolve.dedupe: ['react', 'react-dom', 'react/jsx-runtime']` to force a single React instance across all dependencies.

**File 3: `src/styles/utilities.css`**
- Remove or change `contain: layout style` on `.animate-fade-in` to avoid Safari paint issues on animated elements.

**File 4: `src/components/home/TopTeams.tsx`, `TeamOfTheWeekCard.tsx`, `LeagueHistoryBar.tsx`, `TeamOfTheWeekSkeleton.tsx`**
- Change `contain: 'layout style paint'` to `contain: 'layout style'` (drop `paint`) — Safari's `contain: paint` implementation is buggy and can suppress rendering/events. Keeping `layout style` is safe and still prevents CLS.

**File 5: `src/components/layout/Footer.tsx`**
- Change `contain: 'strict'` to `contain: 'layout style'` — `strict` includes `paint` and `size` which are problematic on Safari.


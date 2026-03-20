# Mobile UX Audit & Improvement Plan

**Audited**: 2026-03-20
**App**: 717rec — React 18 + TypeScript + Tailwind + Capacitor

---

## Overall Assessment

The app has a **strong mobile foundation**. The basics are done right: 44px touch targets enforced system-wide, safe area insets for notched devices, a proper bottom navigation bar, mobile-specific views for stats/rankings, and gesture support in the bracket viewer. This plan focuses on targeted refinements — not a rebuild.

---

## What's Already Working Well

- Bottom nav with `env(safe-area-inset-bottom)` support
- 44px touch targets on all buttons and tabs
- `touch-manipulation` globally applied to prevent 300ms tap delay
- Mobile-specific views: `RankingsMobileView`, `H2HMobileCard`, `CareerRankingsMobileView`
- Pinch-to-zoom + pan in bracket viewer (`BracketTouchControls.tsx`)
- Admin mobile nav with search + grouped accordion sections
- `viewport-fit=cover` in HTML meta tag
- `overflow-x: hidden` preventing unwanted horizontal scroll
- Framer Motion animations respecting `prefers-reduced-motion`

---

## Improvements — Prioritized

---

### Priority 1 — High Impact, Low Risk

#### 1.1 Swipe-to-Close Mobile Menu
**What**: The hamburger menu can only be closed by tapping the X button. Users expect to swipe left to dismiss it.
**File**: `src/components/layout/navbar/MobileMenu.tsx`
**How**: Add a Framer Motion drag constraint on the menu container. On drag end with velocity/offset past a threshold, trigger the close callback.
**Why it matters**: This is a near-universal mobile pattern — users trained on every major app expect it.

---

#### 1.2 Modal/Dialog Mobile Sizing
**What**: Several dialogs (bracket creation, admin dialogs) use `max-w-2xl` with no mobile cap, causing them to overflow or shrink awkwardly on small screens.
**Files**:
- `src/components/playoffs/BracketCreationDialog.tsx`
- Any dialog using `max-w-2xl` or `max-w-lg` without a `max-w-[95vw]` guard
**How**: Add `max-w-[95vw]` as the base, then `sm:max-w-2xl` for larger screens. Also ensure dialogs are `bottom-sheet` style on mobile for tall content (slide up from bottom, full width).
**Why it matters**: Modal overflow forces horizontal scroll or cuts off content on narrow screens.

---

#### 1.3 Bottom Nav Height Sync with Page Padding
**What**: `PageLayout.tsx` hardcodes `pb-[calc(5rem+env(safe-area-inset-bottom,0px))]` but the bottom nav height is `h-16` (4rem). The 5rem includes wiggle room but isn't derived from a shared constant.
**Files**:
- `src/components/layout/PageLayout.tsx` (line ~63)
- `src/components/navigation/BottomNav.tsx`
**How**: Extract a CSS variable `--bottom-nav-height: 4rem` set on `:root` when the bottom nav mounts. Reference it in `PageLayout` padding calculation.
**Why it matters**: If the nav height ever changes, the padding won't drift out of sync.

---

#### 1.4 Reduce Container Padding on Mobile
**What**: `tailwind.config.ts` sets container `padding: '2rem'` (32px) globally. This is generous on desktop but eats 64px of horizontal space on a 375px phone.
**File**: `tailwind.config.ts` (line ~15)
**How**: Change to responsive padding: `{ DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' }`. This gives 16px on mobile, 24px on tablets, 32px on desktop.
**Why it matters**: Every pixel counts on small screens. Tighter padding means more content visible without scrolling.

---

### Priority 2 — Medium Impact, Moderate Effort

#### 2.1 Pull-to-Refresh on Key Pages
**What**: Mobile users naturally pull down to refresh data. Currently there's no visual affordance for this.
**Target pages**: Schedule, Stats/Rankings, Teams
**How**: Implement a custom pull-to-refresh hook using touch events (`touchstart`/`touchmove`/`touchend`) with a spinner indicator. On trigger, invalidate the relevant TanStack Query cache keys.
**Why it matters**: Users on mobile don't have easy access to a browser refresh button.

---

#### 2.2 Horizontal Scroll Snap for Date Picker
**What**: The schedule date strip scrolls horizontally but has no snap points, so it can land mid-item.
**File**: `src/components/schedule/` (date strip component)
**How**: Add `scroll-snap-type: x mandatory` on the scroll container and `scroll-snap-align: center` on each date item.
**Why it matters**: Snap prevents the awkward half-visible date at the edge and feels more native.

---

#### 2.3 Skeleton Loaders with Mobile-Appropriate Heights
**What**: Skeleton loading screens exist but use fixed heights that may not match actual content on mobile.
**Files**: Schedule skeleton, Rankings skeleton components
**How**: Audit each skeleton against its actual rendered height on mobile. Adjust heights to reduce Cumulative Layout Shift (CLS).
**Why it matters**: CLS makes pages feel janky as content jumps around on load.

---

#### 2.4 Compact View Toggle on More Pages
**What**: Stats/Rankings pages have a compact/detailed toggle. Other list-heavy pages (Teams, Schedule) don't.
**Files**: `src/pages/TeamsPage.tsx`, `src/pages/Schedule.tsx`
**How**: Add a density toggle (compact/default) to these pages, persisted in `localStorage` so the preference sticks.
**Why it matters**: Users with smaller phones or more data to scan benefit from compact views.

---

#### 2.5 Touch Feedback on Interactive Cards
**What**: Team cards, match cards, and other tappable surfaces lack clear press states on mobile. The `active:scale-[0.97]` is on buttons but not card containers.
**Files**: Team card, Match card components in `src/components/teams/`, `src/components/matches/`
**How**: Add `active:scale-[0.98] transition-transform duration-75` to tappable card wrappers.
**Why it matters**: Visual press feedback confirms the tap registered, reducing double-taps.

---

#### 2.6 Sticky Section Headers in Long Lists
**What**: When scrolling through grouped teams or long match lists, there's no sticky header showing which group you're in.
**Files**: Teams grouped view, Schedule by date
**How**: Add `position: sticky; top: 0` to section headers. Use `z-index` carefully to avoid conflicts with bottom nav.
**Why it matters**: Context headers help users orient themselves in long lists without scrolling back to the top.

---

### Priority 3 — Lower Impact / Longer Term

#### 3.1 List Virtualization for Large Rankings
**What**: Rankings can have 100+ teams. `react-window` is in the stack but may not be applied to the mobile rankings view.
**File**: `src/components/stats/RankingsMobileView.tsx`
**How**: Wrap the team list in `react-window`'s `FixedSizeList`. Estimate row height based on compact vs. detailed mode.
**Why it matters**: Rendering 100+ DOM nodes causes scroll jank on mid-range Android devices.

---

#### 3.2 Landscape Orientation Handling
**What**: Most pages don't respond to portrait↔landscape transitions. The bracket viewer handles this but other pages don't.
**How**: Add an `useOrientation` hook that fires on `orientationchange`. On landscape, reduce vertical padding and potentially hide the bottom nav (replacing with a side bar for landscape).
**Why it matters**: Many users hold phones sideways for wide content like schedules or brackets.

---

#### 3.3 Swipe Between Tabs/Sections
**What**: Pages with multiple tabs (Stats seasons, Standings divisions) require tapping to switch. Swipe navigation is more natural on mobile.
**How**: Wrap tab content in Framer Motion `AnimatePresence` with drag constraints. Swipe left/right maps to next/previous tab.
**Why it matters**: Swipe navigation is a strong mobile convention (analogous to swiping between photos or cards).

---

#### 3.4 Haptic Feedback (Capacitor Native)
**What**: The app runs on Capacitor for native iOS/Android. Haptic feedback on key interactions (match result saved, bracket seeded) would feel more native.
**File**: `src/hooks/useNativePlatform.ts`
**How**: Add a `useHaptics` hook wrapping `@capacitor/haptics`. Trigger `HapticsImpactStyle.Light` on button taps, `HapticsImpactStyle.Medium` on confirmations.
**Why it matters**: Haptics are a major differentiator between web-feeling and native-feeling apps.

---

#### 3.5 Offline State Indication
**What**: No UI feedback when the device goes offline. TanStack Query will serve stale data silently.
**How**: Add a `useNetworkStatus` hook watching `navigator.onLine` and the `offline`/`online` events. Show a persistent toast/banner when offline, auto-dismiss when back online.
**Why it matters**: Sports league apps are often checked in gyms with spotty WiFi. Users need to know if they're seeing stale data.

---

#### 3.6 Responsive Images
**What**: Logo and avatar images use fixed sizes (e.g., `h-8 w-8`) regardless of screen density. On Retina/HiDPI screens these can look blurry.
**How**: Where images are user-uploaded (team logos, profile photos), serve via Supabase Storage with size parameters. Add `srcSet` for 1x/2x where assets are static.
**Why it matters**: Sharp images are table stakes on modern phones with 2-3x pixel density.

---

## Implementation Order Summary

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1.1 | Swipe-to-close menu | Low | High |
| 1.2 | Modal mobile sizing | Low | High |
| 1.3 | Bottom nav height sync | Low | Medium |
| 1.4 | Container padding mobile | Low | Medium |
| 2.1 | Pull-to-refresh | Medium | High |
| 2.2 | Date picker scroll snap | Low | Medium |
| 2.3 | Skeleton loader heights | Low | Medium |
| 2.4 | Compact toggle more pages | Medium | Medium |
| 2.5 | Touch feedback on cards | Low | Medium |
| 2.6 | Sticky section headers | Low | Medium |
| 3.1 | List virtualization | Medium | Medium |
| 3.2 | Landscape orientation | High | Low |
| 3.3 | Swipe between tabs | Medium | Medium |
| 3.4 | Haptic feedback | Low | Medium |
| 3.5 | Offline state indicator | Medium | High |
| 3.6 | Responsive images | Medium | Low |

---

## Files to Touch (Quick Reference)

| Improvement | Primary File |
|-------------|-------------|
| Swipe menu | `src/components/layout/navbar/MobileMenu.tsx` |
| Modal sizing | `src/components/playoffs/BracketCreationDialog.tsx` + other dialogs |
| Nav height sync | `src/components/navigation/BottomNav.tsx` + `src/components/layout/PageLayout.tsx` |
| Container padding | `tailwind.config.ts` |
| Pull-to-refresh | New hook `src/hooks/usePullToRefresh.ts` |
| Scroll snap | `src/components/schedule/` date strip |
| Touch feedback | `src/components/teams/` + `src/components/matches/` card components |
| Sticky headers | Teams grouped view + Schedule list |
| Virtualization | `src/components/stats/RankingsMobileView.tsx` |
| Haptics | New hook `src/hooks/useHaptics.ts` |
| Offline indicator | New hook `src/hooks/useNetworkStatus.ts` + toast in layout |

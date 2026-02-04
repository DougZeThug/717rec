# UI/UX Audit Report - 717rec

**Audit Date**: 2026-02-04
**Auditor**: Claude Code
**Audit Type**: Static Code Analysis + Heuristic Evaluation

---

## Executive Summary

1. **Strong Design System Foundation** - The codebase has a well-structured design system with tokens, typography scale, and unified radius/spacing values in `src/styles/design-system/`. This provides an excellent baseline for consistency.

2. **Good Loading State Coverage** - 146+ occurrences of `isLoading` patterns and 335+ Skeleton component usages show comprehensive loading state handling across the app.

3. **Inconsistent Empty State Implementation** - Only 26 files use `EmptyState` component despite many list/table views that could benefit from empty guidance.

4. **Navigation Mismatch Between Mobile/Desktop** - Bottom nav (BottomNav.tsx) only shows 3 items (Standings, Schedule, Teams) while Navbar shows 5 items, creating navigation inconsistency.

5. **Accessibility Baseline Present but Incomplete** - 109 `aria-*` usages and skip-to-content link exist, but inconsistent across components. Only 17 `sr-only` labels found for screen readers.

6. **Form Validation UX is Strong** - AuthForm and form.tsx show good inline validation patterns with error messages, shake animations, and destructive styling.

7. **Toast/Feedback System Heavily Used** - 171+ toast calls show good feedback patterns, but some flows may have inconsistent success/error messaging.

8. **Mobile-First Responsive Design** - 158+ `md:` breakpoint usages show consideration for responsive design, but some components have hardcoded desktop layouts.

9. **Confirmation Dialogs Implemented** - 15 AlertDialog usages show destructive actions have confirmations, but pattern could be more consistent.

10. **Test Coverage is Limited** - Only 43 test files for a large codebase; component-level testing gaps may hide UX bugs.

---

## Information Architecture Map

### Routes & Pages

| Route | Page Component | Key Features | Status |
|-------|---------------|--------------|--------|
| `/` | Index.tsx | Homepage, hero cards, top teams, my matches | Active |
| `/teams` | TeamsPage.tsx | Team list, grid/list view, filters | Active |
| `/teams/:teamId` | TeamDetails.tsx | Team stats, roster, match history, analysis | Active |
| `/schedule` | Schedule.tsx | Match schedule, date picker, timeslots | Active |
| `/stats` | Stats.tsx | Rankings, standings, power scores | Active |
| `/playoffs` | Playoffs.tsx | Bracket viewer, tournament management | Active |
| `/history` | History.tsx | Historical seasons, champions | Active |
| `/compare` | Compare.tsx | Team comparison tool | Active |
| `/my-team` | MyTeam.tsx | User's team view | Active (Auth) |
| `/auth` | Auth.tsx | Login/signup forms | Active |
| `/setup-profile` | ProfileSetup.tsx | User onboarding | Active (Auth) |
| `/admin` | AdminDashboard.tsx | Admin panel with tabs | Protected |
| `/timeslots` | Timeslots.tsx | Court/time management | Protected |
| `/message-board` | MessageBoard.tsx | Community messages | Active |
| `/help` | Help.tsx | Help documentation | Active |
| `/contact` | Contact.tsx | Contact form | Active |
| `*` | NotFound.tsx | 404 page | Active |

### Primary User Flows

1. **New User Onboarding**: `/auth` → `/setup-profile` → `/my-team` → `/`
2. **View Team Details**: `/teams` → `/teams/:teamId` → (Back to list)
3. **Check Schedule**: `/schedule` → Select date → View timeslots/matches
4. **View Standings**: `/stats` → Filter division → View rankings
5. **Admin Score Entry**: `/admin` → Scores tab → Mass score entry tool
6. **Playoff Viewing**: `/playoffs` → Select bracket → View matches

### Navigation Structure

**Desktop (Navbar - 5 items)**: Home, Teams, Schedule, Standings, Playoffs
**Mobile (BottomNav - 3 items)**: Standings, Schedule, Teams
**Mobile Menu (Hamburger)**: Full navigation access

---

## Top 10 Fixes (This Week)

- [ ] **Fix 1**: Add `aria-label` to BottomNav icon buttons - `src/components/navigation/BottomNav.tsx:59-71`
- [ ] **Fix 2**: Add EmptyState to TeamList when no teams match filter - `src/components/teams/TeamList.tsx`
- [ ] **Fix 3**: Ensure all form inputs have associated labels with `htmlFor` - multiple form components
- [ ] **Fix 4**: Add `aria-current="page"` to active navigation items - `src/components/navigation/NavItem.tsx`
- [ ] **Fix 5**: Add loading state to Compare page team selectors - `src/pages/Compare.tsx:57-63`
- [ ] **Fix 6**: Add focus trap to MobileMenu when open - `src/components/layout/navbar/MobileMenu.tsx`
- [ ] **Fix 7**: Add error boundary around lazy-loaded components in Index.tsx - `src/pages/Index.tsx:97-103`
- [ ] **Fix 8**: Add confirmation dialog to score submission in MassScoreEntryTool - `src/components/admin/mass-score-entry/`
- [ ] **Fix 9**: Add keyboard navigation (Enter/Space) to TeamCard - `src/components/teams/TeamCard.tsx`
- [ ] **Fix 10**: Standardize toast messages format across hooks - `src/hooks/` toast calls

---

## Prioritized Findings

### P0 - Critical Issues

| # | Area | Issue | Evidence | Recommendation | Effort | Acceptance Criteria |
|---|------|-------|----------|----------------|--------|---------------------|
| 1 | Navigation | Mobile bottom nav only shows 3 of 5 main routes, causing discoverability issues for Playoffs and Home | `src/components/navigation/BottomNav.tsx:18-35` - missing Home, Playoffs | Add Home (center prominent) and Playoffs to bottom nav, or use 5-item tab bar | M | All 5 main routes accessible from bottom nav |
| 2 | Accessibility | Form inputs in AuthForm lack `aria-describedby` linking to error messages | `src/components/auth/AuthForm.tsx:47-72` | Add `aria-describedby` pointing to error message IDs | S | Screen readers announce errors when input is focused |
| 3 | Error Handling | Some hooks return `null` on error instead of throwing, inconsistent with documented pattern | Multiple hooks, check against `CLAUDE.md:220-284` error handling docs | Audit hooks and ensure consistent error throwing pattern | M | All service functions throw errors per documented pattern |
| 4 | Loading | Schedule page has multiple loading states that can flash independently | `src/pages/Schedule.tsx:67-72` multiple loading variables | Consolidate loading states or use suspense boundaries | S | Single cohesive loading transition |

### P1 - High Priority

| # | Area | Issue | Evidence | Recommendation | Effort | Acceptance Criteria |
|---|------|-------|----------|----------------|--------|---------------------|
| 5 | Empty States | TeamList shows empty div when no results, no guidance | `src/components/teams/TeamList.tsx` - missing EmptyState usage | Add EmptyState with "No teams found" and filter reset action | S | Empty state displays with actionable CTA |
| 6 | Empty States | MatchList empty state exists but inconsistently used | `src/components/teams/MatchList.tsx:2` has EmptyState import | Ensure all MatchList instances show helpful empty state | S | All MatchList empty cases show guidance |
| 7 | Feedback | Toast messages have inconsistent patterns (some "Success", some descriptive) | Search for `toast(` shows 171+ usages with varied formats | Create toast utility with consistent patterns: `showSuccess()`, `showError()` | M | Toast messages follow consistent format |
| 8 | Forms | Contact form shows generic "Failed to send message" on error | `src/pages/Contact.tsx:81-86` | Add specific error messages for network vs validation errors | S | Error messages help users understand what went wrong |
| 9 | Mobile | Admin dashboard not optimized for mobile - uses desktop sidebar | `src/pages/AdminDashboard.tsx:51-60` | AdminMobileNav exists but may not be well integrated | M | Admin functions accessible on mobile |
| 10 | Focus | Dialog close buttons lack visible focus rings in some themes | `src/components/ui/dialog.tsx:45` has focus styles but may be overridden | Verify focus visibility across all themes | S | Close button shows visible focus in all themes |
| 11 | Loading | Compare page shows full-page loader even for cached data | `src/pages/Compare.tsx:57-63` | Use staleWhileRevalidate pattern, show cached teams immediately | S | Previously loaded teams appear instantly |
| 12 | Navigation | No breadcrumbs on mobile TeamDetails (only back button) | `src/pages/TeamDetails.tsx:112-129` mobile uses compact version | Ensure breadcrumb trail maintains context on mobile | S | Users can navigate up hierarchy on mobile |
| 13 | Accessibility | Tables lack scope attributes for headers | `src/components/ui/table.tsx` TableHead doesn't specify `scope="col"` | Add `scope="col"` to TableHead, `scope="row"` where applicable | S | Tables readable by screen readers |
| 14 | Interactive | TeamCard uses onClick but isn't a button/link element | `src/components/teams/TeamCard.tsx` - card has onClick | Use `role="button"` or refactor to be a proper link | S | TeamCard keyboard accessible |

### P2 - Medium Priority

| # | Area | Issue | Evidence | Recommendation | Effort | Acceptance Criteria |
|---|------|-------|----------|----------------|--------|---------------------|
| 15 | Typography | Some components use hardcoded font sizes instead of design tokens | Scattered usage vs `src/styles/design-system/typography.ts` | Audit and replace with `typeScale.*` tokens | M | All text uses typography design tokens |
| 16 | Spacing | Some margin/padding values don't follow 8pt grid | Check against `src/styles/design-system/tokens.ts:26-37` | Standardize spacing to 8pt multiples | M | Spacing consistent across app |
| 17 | Color | Division colors hardcoded in some places | Check `division-competitive`, `division-intermediate` usage | Use CSS variables from `src/styles/theme.css:47-50` | S | Division colors from single source |
| 18 | Animation | Page transitions inconsistent on some routes | `PageTransition` not used uniformly | Ensure all pages use `PageTransition` wrapper | S | Consistent transition feel |
| 19 | Empty States | ChartEmptyState could be more actionable | `src/components/stats/ChartEmptyState.tsx` | Add CTA to filter change or data source | S | Empty chart provides next steps |
| 20 | Forms | ProfileSetup retry logic may confuse users | `src/pages/ProfileSetup.tsx:28-51` silent retries | Add user-visible feedback during retries | S | User understands auth state |
| 21 | Icons | Icon sizes not consistently using ICON_SIZES | Some use raw numbers vs `src/styles/icon-system.ts` | Standardize to ICON_SIZES tokens | S | Icons consistently sized |
| 22 | Skeleton | Some skeletons don't match final layout | Compare skeleton vs rendered component structures | Audit skeleton accuracy for major components | M | Skeletons match rendered layouts |
| 23 | Hover | Some interactive elements missing hover states | Cards, buttons check for `hover:` classes | Ensure all clickable elements have hover feedback | S | All interactive elements show hover |
| 24 | Responsive | Rankings table may overflow on narrow mobile | `src/components/stats/RankingsTable.tsx` | Add horizontal scroll or responsive column hiding | M | Table readable on 320px screens |
| 25 | Performance | Multiple useEffect hooks in Schedule may cause cascading renders | `src/pages/Schedule.tsx:57-147` multiple effects | Consider consolidating effects or using useMemo | M | Schedule loads without flicker |

---

## Quick Wins (< 1 day each)

### Accessibility Quick Wins
- Add `scope="col"` to all `<th>` elements in `src/components/ui/table.tsx:100-112`
- Add `aria-label` to icon-only buttons in bottom nav `src/components/navigation/BottomNav.tsx`
- Add `aria-current="page"` to active nav items in `src/components/navigation/NavItem.tsx`
- Add `role="button"` and `tabIndex={0}` to interactive cards without proper semantics
- Ensure all images have meaningful alt text (audit `TeamLogo`, `TeamImage` components)

### Empty State Quick Wins
- Add EmptyState to filtered TeamList when 0 results
- Add EmptyState to MatchList history when no matches
- Improve ChartEmptyState with actionable guidance

### Form Quick Wins
- Link error messages to inputs with `aria-describedby` in AuthForm
- Add `required` attribute to required form fields
- Ensure all inputs have visible labels (not just placeholders)

### Feedback Quick Wins
- Create consistent toast utility: `showSuccessToast(message)`, `showErrorToast(message, details?)`
- Add loading indicator to form submit buttons consistently
- Show optimistic updates where appropriate (e.g., reactions)

### Visual Quick Wins
- Ensure focus rings visible in winter theme
- Add hover state to any clickable element missing it
- Standardize button loading state pattern (Loader2 icon + text)

---

## Deeper Refactors (> 1 day)

### Navigation Refactor (3-5 days)
- Redesign bottom nav to include all 5 main routes
- Options: 5-item tab bar, FAB with expanded menu, or smart context-aware nav
- Consider user research on most-used routes
- Files: `src/components/navigation/BottomNav.tsx`, `AppNavigation.tsx`

### Error Handling Standardization (2-3 days)
- Audit all hooks for consistent error throwing pattern
- Create error boundary components for route-level error handling
- Implement retry UI pattern consistently
- Files: `src/hooks/**/*.ts`, `src/components/ErrorBoundary.tsx`

### Toast System Overhaul (2 days)
- Create toast utility functions with consistent formatting
- Add toast queue management for multiple concurrent toasts
- Implement toast action buttons where appropriate
- Files: `src/hooks/useToast.ts`, create `src/utils/toastHelpers.ts`

### Admin Mobile Experience (3-5 days)
- Redesign admin dashboard for mobile use
- Bottom sheet or drawer patterns for admin actions
- Touch-friendly score entry interface
- Files: `src/components/admin/dashboard/`, `src/pages/AdminDashboard.tsx`

### Skeleton Accuracy Audit (2-3 days)
- Compare all skeleton components to final rendered layouts
- Ensure skeleton structure matches actual content structure
- Prevent layout shifts when content loads
- Files: All `*Skeleton.tsx` files (~20 files)

### Accessibility Comprehensive Review (3-5 days)
- Full WCAG 2.1 AA audit
- Add focus management for all modals/dialogs
- Ensure keyboard navigation works throughout
- Add screen reader testing
- Files: All interactive components

---

## Design System Consistency Review

### Typography

**Status**: Well-defined but inconsistently applied

**Defined Scale** (`src/styles/design-system/typography.ts`):
- H1: 28px/32px - Page titles
- H2: 20px/28px - Section headers
- H3: 16px/22px - Card titles
- Body: 14px/20px - Standard text
- Caption: 12px/16px - Labels, hints

**Issues Found**:
- Some components use raw Tailwind classes (`text-2xl`) instead of `typeScale.h1`
- Font family switching between `font-bebas` and `font-inter` not always intentional
- Numeric data sometimes missing `tabular-nums` class

**Recommendation**: Create lint rule or component wrappers to enforce typography tokens.

### Spacing

**Status**: Good token definition, some inconsistent usage

**Defined System** (`src/styles/design-system/tokens.ts`):
- 8pt base grid (4, 8, 12, 16, 24, 32, 40, 48, 64px)
- Tailwind spacing mapped to tokens

**Issues Found**:
- Some hardcoded values like `py-7` (28px) break the grid
- Container padding varies between pages

**Recommendation**: Audit and normalize to 8pt grid values.

### Colors

**Status**: Well-organized semantic color system

**Defined** (`src/styles/theme.css`):
- Primary/Secondary/Accent semantic tokens
- Success/Warning/Destructive status colors
- Division-specific colors (competitive/intermediate/recreational)
- Dark mode variants

**Issues Found**:
- Some hardcoded hex colors in components
- Division colors used inconsistently (some use CSS vars, some hardcode)

**Recommendation**: Search and replace hardcoded colors with CSS variables.

### Component Variants

**Status**: shadcn/ui provides good base, custom variants added

**Button Variants** (`src/components/ui/button.tsx`):
- default, destructive, outline, secondary, ghost, link
- Custom: cornhole, blue, green, orange, orangeSubtle, blueOrange

**Card Variants** (`src/components/ui/card.tsx`):
- default, subtle, highlight, elevated, interactive
- Division-specific variants

**Issues Found**:
- Many button variants may cause choice paralysis
- Some variants only used in 1-2 places

**Recommendation**: Audit variant usage and consolidate unused variants.

### State Coverage

**Status**: Good foundation, some gaps

| State | Coverage | Notes |
|-------|----------|-------|
| Loading | Good | Skeleton components, LoadingState, isLoading patterns |
| Empty | Partial | EmptyState exists but underutilized |
| Error | Partial | ErrorDisplay exists, not universally applied |
| Hover | Good | Most interactive elements have hover |
| Focus | Good | Focus rings present, verify visibility |
| Active/Pressed | Good | `active:scale-[0.98]` pattern on buttons |
| Disabled | Good | Opacity reduction + pointer-events-none |

---

## Accessibility Quick Scan

| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| Missing `scope` on table headers | Medium | `src/components/ui/table.tsx:100-112` | Add `scope="col"` to `<th>` elements |
| Bottom nav buttons lack `aria-label` | High | `src/components/navigation/BottomNav.tsx:59-71` | Add descriptive aria-labels |
| Interactive cards not keyboard accessible | High | `src/components/teams/TeamCard.tsx` | Add `role="button"`, `tabIndex`, `onKeyDown` |
| Form errors not linked to inputs | High | `src/components/auth/AuthForm.tsx:47-72` | Add `aria-describedby` to inputs |
| Missing `aria-current` on nav | Medium | `src/components/navigation/NavItem.tsx` | Add `aria-current="page"` when active |
| Possible color contrast issues in muted text | Medium | Check `text-muted-foreground` values | Verify 4.5:1 contrast ratio |
| Skip link present but may not work on SPA | Low | `src/components/layout/Navbar.tsx:31-36` | Verify focus moves to main content |
| Only 17 `sr-only` labels found | Medium | Various components | Add screen-reader text where visual context missing |
| Dialog focus trap may be incomplete | Medium | `src/components/ui/dialog.tsx` | Verify Radix handles focus trap |
| Missing landmark roles | Low | Layout components | Add `role="navigation"`, `role="main"` where missing |

### WCAG 2.1 AA Checklist Summary

- [ ] **1.1.1 Non-text Content**: Audit all images for meaningful alt text
- [x] **1.3.1 Info and Relationships**: Good semantic HTML usage
- [ ] **1.4.3 Contrast Minimum**: Verify muted text colors meet 4.5:1
- [x] **1.4.4 Resize Text**: Responsive design supports zoom
- [x] **2.1.1 Keyboard**: Most interactive elements keyboard accessible
- [ ] **2.4.1 Bypass Blocks**: Skip link exists, verify function
- [ ] **2.4.4 Link Purpose**: Audit link text for clarity
- [x] **2.4.7 Focus Visible**: Focus styles defined in components
- [x] **3.1.1 Language of Page**: `lang` attribute likely set
- [ ] **3.3.1 Error Identification**: Errors shown but not always programmatically linked
- [x] **4.1.1 Parsing**: React ensures valid HTML
- [ ] **4.1.2 Name, Role, Value**: Some interactive elements need ARIA

---

## Validation Plan

### Metrics to Track

**Quantitative**:
- Time to complete key flows (measure with synthetic tests)
- Error rate per form submission
- Navigation bounce rate (analytics)
- Accessibility score (Lighthouse, axe-core)

**Qualitative**:
- User confusion points (session recordings if available)
- Support ticket themes
- User feedback on mobile experience

### Testing Approach

1. **Visual Regression**: Set up Percy or Chromatic for component screenshots
2. **E2E Tests**: Add Playwright tests for critical user flows
3. **Accessibility**: Run axe-core in CI pipeline
4. **Performance**: Track Core Web Vitals (LCP, FID, CLS)
5. **Cross-browser**: Test on Safari, Chrome, Firefox (mobile and desktop)

### Suggested Smoke Tests

1. **Auth Flow**: Sign up → Profile setup → View homepage → Logout
2. **Team Browse Flow**: View teams → Filter by division → Select team → View details → Back to list
3. **Schedule Flow**: Open schedule → Change date → View match details
4. **Admin Score Entry**: Login as admin → Navigate to admin → Enter scores for match → Submit
5. **Mobile Navigation**: Test all routes accessible via bottom nav + hamburger menu

---

## Appendix

### Files Reviewed

**Configuration**:
- `README.md`, `CLAUDE.md`, `package.json`
- `tailwind.config.ts`, `src/index.css`

**Entry Points**:
- `src/main.tsx`, `src/App.tsx`

**Pages** (17 files):
- `src/pages/Index.tsx`, `AdminDashboard.tsx`, `TeamsPage.tsx`, `TeamDetails.tsx`
- `src/pages/Schedule.tsx`, `Stats.tsx`, `Playoffs.tsx`, `Compare.tsx`
- `src/pages/History.tsx`, `MyTeam.tsx`, `Auth.tsx`, `ProfileSetup.tsx`
- `src/pages/Help.tsx`, `Contact.tsx`, `NotFound.tsx`, `MessageBoard.tsx`, `Timeslots.tsx`

**UI Components** (20+ files):
- `src/components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, `form.tsx`
- `src/components/ui/input.tsx`, `select.tsx`, `toast.tsx`, `skeleton.tsx`
- `src/components/ui/empty-state.tsx`, `error-display.tsx`, `alert.tsx`
- `src/components/ui/loading-state.tsx`, `tabs.tsx`, `table.tsx`

**Layout/Navigation**:
- `src/components/layout/Navbar.tsx`, `PageLayout.tsx`, `Footer.tsx`
- `src/components/navigation/AppNavigation.tsx`, `BottomNav.tsx`

**Design System**:
- `src/styles/design-system/index.ts`, `tokens.ts`, `typography.ts`
- `src/styles/theme.css`, `base.css`

**Feature Areas** (sampled):
- `src/components/auth/AuthForm.tsx`, `AuthContainer.tsx`
- `src/components/teams/TeamsPageContainer.tsx`, `TeamCard.tsx`

### Search Patterns Used

| Pattern | Matches | Insight |
|---------|---------|---------|
| `isLoading` | 146 files | Good loading state coverage |
| `Skeleton` | 335 in 46 files | Comprehensive skeleton usage |
| `EmptyState` | 63 in 26 files | Underutilized for list views |
| `error ?` (conditional) | 27 files | Error handling present |
| `toast(` | 171 in 50 files | Heavy toast usage |
| `aria-` | 109 in 50 files | Baseline accessibility |
| `role=` | 32 in 25 files | Some ARIA roles applied |
| `sr-only` | 17 in 15 files | Limited screen reader labels |
| `tabIndex` | 10 in 10 files | Limited keyboard control |
| `md:` | 158 in 50 files | Good responsive consideration |
| `disabled` | 78 in 40 files | Disabled states handled |
| `AlertDialog` | 15 files | Confirmations implemented |

### Component File Counts

| Area | File Count |
|------|------------|
| `src/components/admin/` | 90+ files |
| `src/components/teams/` | 40+ files |
| `src/components/stats/` | 45+ files |
| `src/components/ui/` | 50+ files |
| `src/components/playoffs/` | 40+ files |
| `src/hooks/` | 60+ files |
| `src/pages/` | 17 files |

### Test File Locations

43 test files found in:
- `src/components/**/__tests__/*.test.tsx`
- `tests/*.test.ts`

Key test gaps:
- No tests for most page components
- No E2E tests identified
- Limited hook testing coverage

---

*End of Audit Report*

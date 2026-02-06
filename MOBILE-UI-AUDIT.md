# 717REC Mobile UI/UX Audit Report

**Date:** 2026-02-06
**Scope:** Mobile-first UI/UX + visual design/aesthetics audit
**Method:** Static code analysis (styling tokens, component code, responsive patterns)
**Note:** App could not be run in dev mode; all findings are from code inspection. Items marked with `[VERIFY]` need confirmation in a running app.

---

## 1. Repo Snapshot

### Stack Summary
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + CSS custom properties (HSL tokens) |
| Component Library | shadcn/ui (71+ components) + custom components |
| Routing | React Router v7 (lazy-loaded pages) |
| State | TanStack Query + React Context |
| Animations | Framer Motion + CSS keyframes |
| Theme | next-themes (light / dark / winter-frozen) |

### Component Organization
- **542 component files** across 49 subdirectories in `src/components/`
- **17 page files** in `src/pages/`, all lazy-loaded
- **100+ custom hooks** in `src/hooks/`
- Shared UI primitives in `src/components/ui/` (shadcn/ui base)

### Styling Approach
- Tailwind utility classes with `cn()` (clsx + tailwind-merge)
- CSS custom properties for colors, radii, spacing in `src/styles/theme.css`
- Design system tokens partially defined in `src/styles/design-system/` (spacing, typography, interactive states, animations)
- Three themes: light, dark, winter-frozen (default)
- Custom breakpoint: `xs: 480px` added to standard Tailwind breakpoints
- Radius tokens: `--radius-card: 12px`, `--radius-input: 10px`, `--radius-pill: 9999px`

### Navigation Pattern
- **Top:** Sticky navbar with hamburger menu on mobile (`md:hidden`)
- **Bottom:** Fixed bottom nav bar on mobile (3 items: Standings, Schedule, Teams)
- **Desktop:** Secondary horizontal nav + command palette
- Bottom nav accounts for safe-area-inset-bottom

---

## 2. Key Mobile User Journeys + Friction Points

### Journey 1: Check Standings (Most Common)
**Path:** Home → Bottom Nav "Standings" → Stats Page → Rankings
**Files:** `src/pages/Stats.tsx` → `src/components/stats/containers/StatsContainer.tsx` → `src/components/stats/RankingsMobileView.tsx`

| Step | Friction | Severity |
|------|---------|----------|
| Landing on stats page | Sort filter buttons require horizontal scroll, no visible scroll affordance | P1 |
| Viewing detailed rankings | "Find My Team" FAB at `bottom-24 right-4` may overlap bottom nav or be hidden by safe area | P0 |
| Expanding team details | Detailed view 2-col grid is tight at 375px, `text-xs` (12px) labels are small | P2 |
| Viewing Head-to-Head table | 7-column table requires horizontal scroll; "View Details" button may be off-screen | P1 |

### Journey 2: Check Schedule
**Path:** Home → Bottom Nav "Schedule" → Schedule Page → Match Cards
**Files:** `src/pages/Schedule.tsx` → `src/components/schedule/ScheduleContent.tsx` → `src/components/schedule/MatchCard.tsx`

| Step | Friction | Severity |
|------|---------|----------|
| Tab navigation | 3 tabs with icon+text may truncate on <360px screens | P1 |
| Swiping between dates | SwipeableDateGroups works well; pagination dots at 20px may be hard to tap | P2 |
| Viewing match card | Status badges use `text-[10px]` — very hard to read; score `text-2xl` with no mobile reduction | P1 |
| Header controls | Title + search + calendar all on one row — may overflow on <375px | P1 |

### Journey 3: View Team Details
**Path:** Home → Bottom Nav "Teams" → Teams Page → Team Card → Team Details
**Files:** `src/pages/TeamsPage.tsx` → `src/components/teams/grid/TeamCardGrid.tsx` → `src/pages/TeamDetails.tsx`

| Step | Friction | Severity |
|------|---------|----------|
| Grid view | Cards in 2-col grid with only `p-1.5` (6px) padding — cramped | P1 |
| Stat labels | StatBlock labels are `text-[10px]` on mobile — below readable threshold | P1 |
| Team list view | Full-width 200px-tall images create excessive vertical space | P2 |
| Match history | Virtualized list with fixed `rowHeight={72}` not responsive | P2 |

### Journey 4: View Playoff Brackets
**Path:** Home → Nav "Playoffs" → Brackets List → Bracket Detail
**Files:** `src/pages/Playoffs.tsx` → `src/components/playoffs/BracketDetail.tsx` → `src/components/playoffs/BracketViewport.tsx`

| Step | Friction | Severity |
|------|---------|----------|
| Viewing bracket | Auto-fit capped at 1x scale — brackets may be unreadably small on mobile | P0 |
| Admin controls | Edit/seeding/delete buttons use `hidden md:flex` — admins cannot manage on mobile | P0 |
| Touch interaction | BracketTouchControls zoom buttons are 40x40px (below 44px); pan disabled until zoomed | P1 |
| Bracket content | `width: 'max-content'` with `minHeight: 350px` — large brackets need complex scroll with no affordance | P1 |

### Journey 5: Message Board
**Path:** Home → Nav "Messages" → Message Board
**Files:** `src/pages/MessageBoard.tsx` → `src/components/message-board/MessageFeed.tsx` → `src/components/message-board/message-input/MessageInputForm.tsx`

| Step | Friction | Severity |
|------|---------|----------|
| Feed height | `h-[calc(100vh-250px)]` assumes desktop chrome — wrong for mobile | P0 |
| Composing message | Textarea has `pr-16` (64px right padding) — text area very narrow on <375px | P1 |
| Message spacing | `space-y-2` (8px) between messages — tight for touch targets | P1 |
| Sticky header | No safe area padding for notched phones | P1 |

### Journey 6: Admin Score Entry
**Path:** Admin Dashboard → Mass Score Entry → Match Rows
**Files:** `src/pages/AdminDashboard.tsx` → `src/components/admin/MassScoreEntryTool.tsx` → `src/components/admin/mass-score-entry/`

| Step | Friction | Severity |
|------|---------|----------|
| Tab navigation | 8 admin tabs wrap to 3-4 rows on mobile — messy, hard to find tabs | P0 |
| Score input grid | MatchScoreItem uses 2-col grid for score inputs on mobile — inputs too narrow | P0 |
| Score buttons | ScoreButtonGroup wraps to 2+ rows with `min-w-[3.5rem]`, takes excessive space | P1 |
| Time slot trigger | CollapsibleTrigger has only `p-2` (32px height) — below 44px minimum | P1 |

---

## 3. Findings Table

| # | Priority | Issue | Impact | Location (files) | Fix (smallest diff) | Effort | Verification |
|---|---------|-------|--------|-------------------|---------------------|--------|-------------|
| 1 | **P0** | Admin tabs wrap to 3-4 rows on mobile (8 tabs) | Admin navigation unusable on phones | `src/components/admin/dashboard/AdminTabs.tsx:16` | Add `overflow-x-auto` to TabsList, set `flex-nowrap` on all sizes | S | View /admin on 375px; tabs should scroll horizontally |
| 2 | **P0** | Score input grid uses 2-col on mobile; inputs too narrow for number entry | Cannot enter scores on mobile | `src/components/admin/scores/MatchScoreItem.tsx:130` | Change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` | S | Open score entry on 375px; each input should be full-width |
| 3 | **P0** | Bracket admin controls hidden on mobile (`hidden md:flex`) | Admins cannot manage brackets on phones | `src/components/playoffs/BracketDetail.tsx:123-155` | Change to responsive icon buttons: `flex` with `size="icon"` on mobile, full buttons on `md:` | M | View bracket detail as admin on 375px; controls should be visible |
| 4 | **P0** | "Find My Team" FAB at `bottom-24` overlaps/hides behind bottom nav | Users can't find their team in standings | `src/components/stats/rank/RankingsMobileView.tsx:264` | Change to `bottom-[calc(5rem+env(safe-area-inset-bottom,0px)+1rem)]` | S | Check FAB visibility on 375px with bottom nav visible |
| 5 | **P0** | Message feed height `calc(100vh-250px)` wrong for mobile | Feed too small or cut off on phones | `src/components/message-board/MessageFeed.tsx:84` | Use `h-[calc(100vh-200px)] sm:h-[calc(100vh-250px)] lg:h-[calc(100vh-280px)]` | S | Open message board on 375x667; feed should fill visible area |
| 6 | **P0** | Bracket auto-fit capped at 1x — too small on mobile | Brackets unreadable without manual zoom | `src/components/playoffs/BracketViewport.tsx:69` | Allow initial fit up to 1.5x on mobile: `Math.min(scaleX, scaleY, isMobile ? 1.5 : 1)` | S | View large bracket on 375px; text should be readable |
| 7 | **P1** | Head-to-Head table has 7 columns, requires unguided horizontal scroll | Users miss data columns and action buttons | `src/components/stats/HeadToHeadRecords.tsx:137-236` | Hide "Game W-L" and "Last Played" columns on mobile with `hidden sm:table-cell`; stack action below row | M | View H2H on 375px; visible columns should fit without scroll |
| 8 | **P1** | Schedule tab text truncates on <360px screens | Users can't read tab labels | `src/components/schedule/ScheduleContent.tsx:167-185` | Use abbreviated labels on mobile: hide `<span>` text on `xs:`, show icon-only | S | View schedule on 360px; tabs should show icons clearly |
| 9 | **P1** | Match card status badges at `text-[10px]` | "Final", "Postponed" labels barely readable | `src/components/schedule/MatchCard.tsx` (status badge area) | Change to `text-xs` (12px minimum) | S | Check match cards on 375px; badges should be readable |
| 10 | **P1** | TeamCardGrid content padding only `p-1.5` (6px) | Cards look cramped, text nearly touches edges | `src/components/teams/grid/TeamCardGrid.tsx:62` | Change `p-1.5` to `p-2 sm:p-3` | S | View teams grid on 375px; cards should have visible breathing room |
| 11 | **P1** | StatBlock labels `text-[10px]` on mobile | Stat labels unreadable on phones | `src/components/teams/shared/StatBlock.tsx:63` | Change to `text-xs` minimum (12px) | S | View team stats on 375px; "Win %" etc should be readable |
| 12 | **P1** | ScheduleHeader title + search + calendar overflow on <375px | Header controls wrap or overflow | `src/components/schedule/ScheduleHeader.tsx:37-44` | Reduce `gap-4` to `gap-2`, make search collapsible on xs screens | S | View schedule on 320px; header should not overflow |
| 13 | **P1** | Message textarea `pr-16` (64px) leaves narrow input on mobile | Typing area feels cramped | `src/components/message-board/message-input/MessageInputForm.tsx:85` | Change to `pr-12 sm:pr-16` | S | Type in message board on 375px; text area should be comfortable |
| 14 | **P1** | Message feed `space-y-2` (8px) too tight for touch | Hard to tap individual messages | `src/components/message-board/MessageFeed.tsx:85` | Change to `space-y-3 sm:space-y-2` | S | Scroll message feed on 375px; messages should have visible gaps |
| 15 | **P1** | BracketTouchControls zoom buttons 40x40px | Below 44px touch target minimum | `src/components/playoffs/mobile/BracketTouchControls.tsx:144-164` | Add `min-h-[44px] min-w-[44px]` | S | Check zoom button tappability on mobile |
| 16 | **P1** | Admin TimeSlotMatchGroup trigger only `p-2` | Touch target ~32px, below 44px | `src/components/admin/mass-score-entry/components/TimeSlotMatchGroup.tsx:54-58` | Change to `p-3 min-h-[44px]` | S | Tap time slot headers on 375px; should be easy to hit |
| 17 | **P1** | ScoreButtonGroup buttons wrap to 2+ rows | Excessive vertical space per match in score entry | `src/components/admin/mass-score-entry/components/ScoreButtonGroup.tsx:97` | Reduce `min-w-[3.5rem]` to `min-w-[3rem]` and tighten text | S | Check score buttons on 375px; should fit in 1-2 rows |
| 18 | **P1** | MessageBoard sticky header no safe area padding | Header hidden behind notch on modern phones | `src/pages/MessageBoard.tsx:57-61` | Add `pt-[env(safe-area-inset-top,0px)]` | S | [VERIFY] Check on notched device emulation |
| 19 | **P1** | Sort filter buttons need scroll with no affordance | Users don't discover all sort options | `src/components/stats/rank/RankingsMobileView.tsx:150-181` | Add fade gradient on right edge (like H2H table already has) | S | Check sort bar on 375px; right-edge gradient should hint at more |
| 20 | **P2** | Card.tsx fixed `p-6` padding on all screens | Excessive padding on mobile cards | `src/components/ui/card.tsx` (CardHeader, CardContent, CardFooter) | Change to `p-4 sm:p-6` | S | Check card spacing on 375px; cards should feel less padded |
| 21 | **P2** | Toast actions `h-8` (32px) below 44px minimum | Hard to tap toast dismiss/action buttons | `src/components/ui/toast.tsx` (ToastAction) | Add `min-h-[44px]` | S | Trigger a toast on mobile; action should be easy to tap |
| 22 | **P2** | Dialog.tsx no mobile max-width handling | Dialog may overflow on very small screens | `src/components/ui/dialog.tsx` (DialogContent) | Use `w-[calc(100%-2rem)] sm:max-w-lg` | S | Open any dialog on 320px; should have margins |
| 23 | **P2** | TeamCardList 200px fixed image height on mobile | Excessive vertical space, poor data density | `src/components/teams/list/TeamCardList.tsx:52-62` | Change `h-[200px]` to `h-[140px] sm:h-[200px]` | S | View teams in list mode on 375px; images should be shorter |
| 24 | **P2** | Chart team name truncation to 8/7 chars | "Tiger Te..." and "Cobra…" lose meaning | `src/components/stats/PowerScoreChart.tsx:103-115`, `src/components/stats/WinLossBarChart.tsx:10-11` | Increase to 10 chars on mobile or use initials with tooltip | S | Check chart labels on 375px; names should be identifiable |
| 25 | **P2** | Pagination dots `min-w-[20px]` small touch targets | Hard to tap precise pagination dot | `src/components/schedule/SwipeableDateGroups.tsx` (dot buttons) | Add `min-h-[28px] min-w-[28px]` with `gap-3` | S | Tap pagination dots on mobile; should be easy to hit |
| 26 | **P2** | Empty-state buttons `min-w-[120px]` side-by-side | 2 buttons overflow on <360px | `src/components/ui/empty-state.tsx` | Change action layout to `flex-col sm:flex-row` | S | Trigger empty state on 320px; buttons should stack |
| 27 | **P2** | MatchList fixed `rowHeight={72}` | Row height not responsive to text wrapping | `src/components/teams/MatchList.tsx:84` | Add dynamic height based on content or increase to 80px with wrapping | M | Check match list items for text overflow on 375px |
| 28 | **P2** | Tabs.tsx no overflow/scroll for wide tab lists | Tabs clip without scroll | `src/components/ui/tabs.tsx` (TabsList) | Add `overflow-x-auto` with scrollbar-hide | S | Any page with many tabs on 375px; should scroll |
| 29 | **P2** | Button.tsx `xs` variant only 32px height | Below 44px minimum for touch | `src/components/ui/button.tsx` (xs variant) | Add `min-h-[44px]` to xs variant | S | Check any xs button tappability on mobile |
| 30 | **P2** | Bracket viewport min-height 350px hardcoded | Takes half the screen on phones <667px | `src/components/playoffs/viewer/BracketsViewerComponent.tsx:426` | Change to `minHeight: isMobile ? '250px' : '350px'` | S | Check bracket vertical space on 375x667 |

---

## 4. Top 10 Quick Wins

These are the smallest diffs (mostly 1-line changes) with the highest visible impact:

| # | Change | Files | Diff Size | Impact |
|---|--------|-------|-----------|--------|
| 1 | Fix FAB position: `bottom-24` → `bottom-[calc(5rem+env(safe-area-inset-bottom)+1rem)]` | `RankingsMobileView.tsx:264` | 1 line | Unblocks "Find My Team" for all mobile users |
| 2 | Admin tabs: add `overflow-x-auto flex-nowrap` to TabsList | `AdminTabs.tsx:16` | 1 line | Fixes broken admin nav on mobile |
| 3 | Score inputs: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` | `MatchScoreItem.tsx:130` | 1 line | Fixes unusable score entry on mobile |
| 4 | Team card grid padding: `p-1.5` → `p-2 sm:p-3` | `TeamCardGrid.tsx:62` | 1 line | Visible breathing room on all team cards |
| 5 | Match badge text: `text-[10px]` → `text-xs` | `MatchCard.tsx` (schedule) | 1 line | Match status badges become readable |
| 6 | Stat labels: `text-[10px]` → `text-xs` | `StatBlock.tsx:63` | 1 line | All team stat labels become readable |
| 7 | Message feed height: add `sm:` breakpoint | `MessageFeed.tsx:84` | 1 line | Feed properly fills mobile viewport |
| 8 | Bracket admin controls: `hidden md:flex` → `flex` with `size="icon"` | `BracketDetail.tsx:123-155` | ~10 lines | Admins can manage brackets on mobile |
| 9 | Message textarea: `pr-16` → `pr-12 sm:pr-16` | `MessageInputForm.tsx:85` | 1 line | More typing space on mobile |
| 10 | Card padding: `p-6` → `p-4 sm:p-6` globally | `card.tsx` (CardHeader/Content/Footer) | 3 lines | All cards get better mobile density |

---

## 5. Design System / Visual Consistency Notes

### Token Issues

**Spacing:**
- Design system defines spacing tokens in `src/styles/design-system/tokens.ts` but **~80% of components hardcode values** like `p-4`, `gap-3`, `mb-6`
- No responsive spacing tokens (e.g., mobile-first values with breakpoint overrides)
- Inconsistent gap usage across similar components: `gap-1.5`, `gap-2`, `gap-3`, `gap-4`, `gap-6` used without clear hierarchy

**Typography:**
- `typeScale` object exists in `src/styles/design-system/typography.ts` but only ~40% of components use it
- Several components use `text-[10px]` which is below the 12px readable minimum
- Heading sizes inconsistent: some use `text-2xl md:text-3xl`, others hardcode specific px values

**Colors:**
- Semantic color tokens (HSL variables) are well-defined and consistent
- Division colors (competitive/intermediate/recreational) are properly tokenized
- Winter theme has comprehensive CSS variable overrides — well done
- Some one-off color values exist (e.g., hardcoded hex in bracket viewer)

**Border Radius:**
- Token system exists: `rounded-card` (12px), `rounded-input` (10px), `rounded-pill`
- Usage is mostly consistent across components
- A few components use `rounded-lg`, `rounded-md` directly instead of semantic tokens

### Component Consistency Gaps

| Component Type | Consistency Issue |
|---------------|-------------------|
| **Buttons** | `xs` variant (32px) vs everything else (44px min). Gap in touch targets. |
| **Cards** | Fixed `p-6` on CardHeader/Content/Footer doesn't reduce on mobile. EntityCard has no default padding. |
| **Inputs** | Input correctly uses `h-11` (44px) with mobile-first text. Good baseline. |
| **Modals** | `responsive-dialog.tsx` (Drawer on mobile) is the gold standard. Plain `dialog.tsx` doesn't adapt. Some components use Dialog directly instead of ResponsiveDialog. |
| **Tables** | Table component has no mobile strategy — no column hiding, no responsive text, no card-view alternative. |
| **Tabs** | TabsList has `min-h-[44px]` but no `overflow-x-auto`. Many tab instances break on mobile. |
| **Toasts** | `p-6` padding is excessive on mobile. Action buttons at 32px are below touch minimum. |
| **Badges** | No size variants — all badges are same small size. Fine for display-only, problematic if interactive. |
| **Empty States** | Button layout doesn't stack on mobile. `min-w-[120px]` causes overflow on narrow screens. |
| **Loading States** | Well-structured with 3 variants (page/section/inline). No mobile issues found. |
| **Skeletons** | No preset size variants — relies entirely on parent to define dimensions. |

### Missing States

| State | Coverage |
|-------|---------|
| Hover | Generally good via Tailwind `hover:` utilities |
| Active/Pressed | `active:scale-[0.97]` on buttons; inconsistent on other interactive elements |
| Focus-visible | Good — `focus-ring` utility class in `utilities.css`; used on most interactive elements |
| Disabled | `disabled:pointer-events-none disabled:opacity-50` on buttons; not consistently applied to cards/links |
| Loading | Component exists; not consistently used across all data-fetching views |
| Error | RouteErrorBoundary covers routes; some components lack inline error states |
| Empty | EmptyState component exists; used in most but not all list/table components |

### Recommended Token Cleanup

1. **Enforce `text-xs` (12px) as minimum text size** — search for `text-[10px]` and replace (5 instances found)
2. **Create responsive padding utility**: `.card-padding { @apply p-4 sm:p-6 }` and apply to Card components
3. **Standardize touch targets**: Audit all interactive elements for `min-h-[44px]`; add to xs button variant
4. **Use ResponsiveDialog everywhere**: Replace direct Dialog usage with ResponsiveDialog for modals that appear on mobile
5. **Add `overflow-x-auto` to TabsList**: Prevents wrapping; add to base tabs.tsx component

---

## 6. Prioritized Backlog

### P0 — Must-Fix Mobile Blockers

- [ ] **Fix admin tab navigation on mobile** — `AdminTabs.tsx:16`: Add `overflow-x-auto flex-nowrap` to prevent 3-4 row wrapping
- [ ] **Fix score input layout on mobile** — `MatchScoreItem.tsx:130`: `grid-cols-1 sm:grid-cols-2` so inputs are usable
- [ ] **Fix bracket admin controls on mobile** — `BracketDetail.tsx:123-155`: Show as icon buttons on mobile instead of hiding
- [ ] **Fix "Find My Team" FAB overlap with bottom nav** — `RankingsMobileView.tsx:264`: Adjust bottom offset to clear nav + safe area
- [ ] **Fix message feed height on mobile** — `MessageFeed.tsx:84`: Add responsive breakpoints to height calculation
- [ ] **Fix bracket auto-fit zoom cap** — `BracketViewport.tsx:69`: Allow initial fit up to 1.5x on mobile so brackets are readable

### P1 — High-Value Polish + Flow Improvements

- [ ] **Improve H2H table for mobile** — `HeadToHeadRecords.tsx:137-236`: Hide low-priority columns, add scroll affordance
- [ ] **Fix schedule tab truncation** — `ScheduleContent.tsx:167-185`: Icon-only labels on narrow screens
- [ ] **Fix match badge readability** — Schedule `MatchCard.tsx`: Increase from `text-[10px]` to `text-xs`
- [ ] **Fix team card grid cramped padding** — `TeamCardGrid.tsx:62`: `p-2 sm:p-3` instead of `p-1.5`
- [ ] **Fix stat block label readability** — `StatBlock.tsx:63`: Increase from `text-[10px]` to `text-xs`
- [ ] **Fix schedule header overflow** — `ScheduleHeader.tsx:37-44`: Reduce gap, handle narrow screens
- [ ] **Fix message textarea width** — `MessageInputForm.tsx:85`: `pr-12 sm:pr-16`
- [ ] **Fix message spacing** — `MessageFeed.tsx:85`: `space-y-3 sm:space-y-2`
- [ ] **Fix bracket zoom button size** — `BracketTouchControls.tsx:144-164`: Add 44px min
- [ ] **Fix admin time slot touch target** — `TimeSlotMatchGroup.tsx:54-58`: `p-3 min-h-[44px]`
- [ ] **Fix score button wrapping** — `ScoreButtonGroup.tsx:97`: Reduce min-width
- [ ] **Fix message board sticky header safe area** — `MessageBoard.tsx:57-61`: Add safe area padding
- [ ] **Add scroll affordance to sort buttons** — `RankingsMobileView.tsx:150-181`: Add fade gradient hint

### P2 — Nice-to-Have Refinements

- [ ] **Reduce Card padding on mobile** — `card.tsx`: `p-4 sm:p-6` globally
- [ ] **Fix toast action touch targets** — `toast.tsx`: Add `min-h-[44px]` to ToastAction
- [ ] **Fix dialog mobile sizing** — `dialog.tsx`: `w-[calc(100%-2rem)] sm:max-w-lg`
- [ ] **Reduce TeamCardList image height** — `TeamCardList.tsx:52-62`: `h-[140px] sm:h-[200px]`
- [ ] **Improve chart label truncation** — `PowerScoreChart.tsx`, `WinLossBarChart.tsx`: Increase char limit or use initials
- [ ] **Fix pagination dot tap targets** — `SwipeableDateGroups.tsx`: Increase to 28px minimum
- [ ] **Fix empty state button layout** — `empty-state.tsx`: `flex-col sm:flex-row`
- [ ] **Fix match list row height** — `MatchList.tsx:84`: Make responsive or increase slightly
- [ ] **Add tab overflow scroll** — `tabs.tsx`: `overflow-x-auto` on TabsList
- [ ] **Fix xs button touch target** — `button.tsx`: Add `min-h-[44px]`
- [ ] **Reduce bracket min-height** — `BracketsViewerComponent.tsx:426`: `250px` on mobile

---

## 7. Verification Checklist

### Viewports to Test
- **375x667** — iPhone SE / iPhone 8 (smallest common)
- **390x844** — iPhone 14/15 (most common iOS)
- **412x915** — Pixel 7 / Galaxy S23 (most common Android)
- **320x568** — Edge case (older phones)

### Pre-Implementation Baseline
Run these before making changes to establish baseline:

1. [ ] Open each route on 375x667 in Chrome DevTools mobile emulation
2. [ ] Screenshot each page for before/after comparison
3. [ ] Run Lighthouse mobile audit on key pages (/, /stats, /schedule, /teams, /playoffs, /message-board, /admin)
4. [ ] Note current Lighthouse scores: Performance, Accessibility, Best Practices

### P0 Verification Steps

| Fix | How to Verify |
|-----|--------------|
| Admin tabs scroll | Open /admin on 375px → tabs should be in single scrollable row → all 8 tabs accessible |
| Score input full-width | Open score entry on 375px → each score input field should be full viewport width |
| Bracket admin controls visible | Open bracket detail as admin on 375px → edit/delete buttons should be visible as icons |
| FAB not overlapping | Open /stats on 375px → scroll to bottom → "Find My Team" FAB should float above bottom nav |
| Message feed fills viewport | Open /message-board on 375x667 → feed should fill visible area between header and input |
| Bracket auto-fit readable | Open bracket with 8+ teams on 375px → team names should be readable without manual zoom |

### P1 Verification Steps

| Fix | How to Verify |
|-----|--------------|
| H2H table columns | Open team H2H on 375px → core columns (Opponent, W-L, Win%) visible without scrolling |
| Schedule tabs | Open /schedule on 360px → tab icons should be visible; text can abbreviate |
| Match badges | Open any completed match card → "Final" badge should be clearly readable |
| Team card padding | Open /teams grid on 375px → cards should have visible border of space around text |
| Stat labels | Open team details stats → "Win %", "SOS" etc. should be comfortably readable |
| Message textarea | Open message board → start typing → text area should use most of available width |

### Accessibility Checks
- [ ] All interactive elements have visible focus rings (Tab through each page)
- [ ] Color contrast passes WCAG AA (4.5:1 for body text, 3:1 for large text)
- [ ] All buttons/links have accessible labels (check with aXe extension)
- [ ] No content hidden from screen readers that should be visible
- [ ] Touch targets >= 44x44px for all tappable elements

### Regression Checks
- [ ] Test all 3 themes (light, dark, winter-frozen) on each changed component
- [ ] Verify no horizontal scroll introduced on any page at 375px
- [ ] Verify desktop layout unchanged (test at 1280px)
- [ ] Verify bottom nav still works correctly after FAB fix
- [ ] Verify admin dashboard still functions on desktop after tab fix
- [ ] Run `npm run lint` — no new warnings
- [ ] Run `npm run build` — no build errors

### Performance Checks
- [ ] Lighthouse Performance score should not decrease
- [ ] No new layout shift (CLS) — check with Chrome DevTools Performance panel
- [ ] No forced reflows from added CSS
- [ ] Content-visibility optimizations still working (check sections lazy-render on scroll)

---

## Appendix: Files Referenced

### Pages
- `src/pages/Index.tsx`
- `src/pages/Stats.tsx`
- `src/pages/Schedule.tsx`
- `src/pages/TeamsPage.tsx`
- `src/pages/TeamDetails.tsx`
- `src/pages/Playoffs.tsx`
- `src/pages/MessageBoard.tsx`
- `src/pages/AdminDashboard.tsx`

### Layout & Navigation
- `src/components/layout/Navbar.tsx`
- `src/components/layout/PageLayout.tsx`
- `src/components/layout/PageHeader.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/navbar/MobileMenu.tsx`
- `src/components/layout/navbar/NavLinks.tsx`
- `src/components/layout/navbar/NavBrand.tsx`
- `src/components/layout/navbar/NavActions.tsx`
- `src/components/navigation/BottomNav.tsx`
- `src/components/navigation/DesktopNav.tsx`
- `src/components/navigation/NavItem.tsx`
- `src/components/navigation/AppNavigation.tsx`

### Schedule
- `src/components/schedule/MatchCard.tsx`
- `src/components/schedule/ScheduleContent.tsx`
- `src/components/schedule/ScheduleHeader.tsx`
- `src/components/schedule/DateMatchGroup.tsx`
- `src/components/schedule/MatchGrid.tsx`
- `src/components/schedule/SwipeableDateGroups.tsx`
- `src/components/schedule/TimeSlotMatchGroup.tsx`

### Stats/Standings
- `src/components/stats/RankingsTable.tsx`
- `src/components/stats/rank/RankingsMobileView.tsx`
- `src/components/stats/RankingCard.tsx`
- `src/components/stats/StatsHeader.tsx`
- `src/components/stats/PowerScoreChart.tsx`
- `src/components/stats/WinLossBarChart.tsx`
- `src/components/stats/HeadToHeadRecords.tsx`
- `src/components/stats/containers/StatsContainer.tsx`

### Teams
- `src/components/teams/TeamCard.tsx`
- `src/components/teams/TeamHeader.tsx`
- `src/components/teams/TeamList.tsx`
- `src/components/teams/TeamStats.tsx`
- `src/components/teams/MatchList.tsx`
- `src/components/teams/grid/TeamCardGrid.tsx`
- `src/components/teams/list/TeamCardList.tsx`
- `src/components/teams/shared/StatBlock.tsx`

### Playoffs
- `src/components/playoffs/BracketViewport.tsx`
- `src/components/playoffs/BracketDetail.tsx`
- `src/components/playoffs/mobile/BracketTouchControls.tsx`
- `src/components/playoffs/viewer/BracketsViewerComponent.tsx`

### Message Board
- `src/components/message-board/MessageFeed.tsx`
- `src/components/message-board/MessageItem.tsx`
- `src/components/message-board/message-input/MessageInputForm.tsx`
- `src/components/message-board/message-item/MessageControls.tsx`

### Admin
- `src/components/admin/dashboard/AdminTabs.tsx`
- `src/components/admin/dashboard/AdminMobileNav.tsx`
- `src/components/admin/dashboard/AdminSidebar.tsx`
- `src/components/admin/MassScoreEntryTool.tsx`
- `src/components/admin/scores/MatchScoreItem.tsx`
- `src/components/admin/mass-score-entry/components/ScoreButtonGroup.tsx`
- `src/components/admin/mass-score-entry/components/ScoreButton.tsx`
- `src/components/admin/mass-score-entry/components/TimeSlotMatchGroup.tsx`

### UI Primitives
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/responsive-dialog.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/toast.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/loading-state.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/entity-card.tsx`

### Styling
- `tailwind.config.ts`
- `src/index.css`
- `src/styles/base.css`
- `src/styles/theme.css`
- `src/styles/typography.css`
- `src/styles/utilities.css`
- `src/styles/animations.css`
- `src/styles/design-system/tokens.ts`
- `src/styles/design-system/typography.ts`
- `src/styles/design-system/interactive.ts`

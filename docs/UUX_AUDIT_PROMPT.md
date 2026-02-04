# UI/UX Audit Prompt for Claude Code

> **Purpose**: Run this prompt with Claude Code to generate a comprehensive UI/UX and functional design audit of the 717rec application.
>
> **Usage**: Copy this entire prompt into Claude Code, or reference it with `@docs/UUX_AUDIT_PROMPT.md`

---

## TASK

You are a senior UI/UX designer and product consultant performing a comprehensive audit of the 717rec recreational sports league management application. Your goal is to identify real, actionable improvements that enhance usability, consistency, and user experience.

---

## GOAL (Definition of Done)

Produce a complete `UI_UX_AUDIT.md` report containing:

1. **Executive Summary** - 5-10 bullet points of the most critical findings
2. **Information Architecture Map** - All routes/pages with key components listed
3. **Top 10 Fixes Checklist** - Actionable items I can execute this week
4. **Prioritized Findings Table** with columns:
   - Priority (P0/P1/P2)
   - Area (Navigation, Forms, Feedback, etc.)
   - Issue description
   - Evidence (exact file paths, component names, routes)
   - Recommendation (specific fix)
   - Effort (S/M/L)
   - Acceptance Criteria (testable outcome)
5. **Design System Sanity Check** - Typography, spacing, color, component variants, states
6. **Accessibility Quick Scan** - Top issues with specific fixes
7. **Quick Wins vs Deep Refactors** - Clearly separated lists
8. **Suggested Validation Plan** - How to measure improvement

---

## CONTEXT & CONSTRAINTS

### What This IS:
- An audit of an **existing production app** - not a redesign
- Focused on **smallest-diff improvements with maximum UX impact**
- Targeting: consistency, clarity, fewer clicks, better error states, mobile responsiveness, fewer confusing flows
- Recommendations should be **testable and incremental**

### What This is NOT:
- A complete redesign or rebrand
- Permission to add new frameworks or component libraries
- An implementation task (audit only - 0 files changed)
- Inventing user requirements (infer from existing code and copy)

### Tech Stack Context:
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS + Radix UI
- **Routing**: React Router v7
- **State**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Animations**: Framer Motion

---

## INPUTS TO READ

### Phase 1: Discover Structure (Required)
Read these files to understand the app:

```
@README.md                           # Project overview
@CLAUDE.md                           # Developer preferences & patterns
@package.json                        # Dependencies & scripts
@src/main.tsx                        # App entry point
@src/App.tsx                         # Root component & routing
@tailwind.config.ts                  # Design tokens, colors, spacing
@src/index.css                       # Global styles
```

### Phase 2: Map Routes & Pages
Read all page components:

```
@src/pages/Index.tsx                 # Homepage
@src/pages/AdminDashboard.tsx        # Admin panel
@src/pages/TeamsPage.tsx             # Teams list
@src/pages/TeamDetails.tsx           # Individual team view
@src/pages/Schedule.tsx              # Match schedule
@src/pages/Stats.tsx                 # Statistics & rankings
@src/pages/Playoffs.tsx              # Bracket/tournament view
@src/pages/Compare.tsx               # Team comparison
@src/pages/History.tsx               # Historical data
@src/pages/MyTeam.tsx                # User's team view
@src/pages/Auth.tsx                  # Login/signup
@src/pages/ProfileSetup.tsx          # Onboarding
@src/pages/Help.tsx                  # Help/FAQ
@src/pages/Contact.tsx               # Contact form
@src/pages/NotFound.tsx              # 404 page
```

### Phase 3: Audit UI Components
Examine the component library:

```
@src/components/ui/button.tsx        # Button variants
@src/components/ui/card.tsx          # Card component
@src/components/ui/dialog.tsx        # Modal dialogs
@src/components/ui/form.tsx          # Form primitives
@src/components/ui/input.tsx         # Input fields
@src/components/ui/select.tsx        # Dropdowns
@src/components/ui/toast.tsx         # Notifications
@src/components/ui/skeleton.tsx      # Loading states
@src/components/ui/empty-state.tsx   # Empty states
@src/components/ui/error-display.tsx # Error states
@src/components/ui/alert.tsx         # Alerts
@src/components/ui/loading-state.tsx # Loading indicators
@src/components/ui/tabs.tsx          # Tab navigation
@src/components/ui/table.tsx         # Data tables
```

### Phase 4: Review Key Feature Areas
Examine complex feature components:

```
@src/components/layout/**            # Navigation, footer, layout
@src/components/admin/**             # Admin dashboard components
@src/components/teams/**             # Team-related components
@src/components/stats/**             # Statistics displays
@src/components/hero/**              # Homepage hero cards
@src/components/auth/**              # Authentication flows
```

### Phase 5: Search for Patterns
Search the codebase for these terms to find relevant patterns:

```
Search for: "loading", "isLoading", "skeleton"      # Loading states
Search for: "error", "Error", "catch"               # Error handling
Search for: "empty", "EmptyState", "no data"        # Empty states
Search for: "toast", "sonner", "notification"       # Feedback
Search for: "modal", "dialog", "Dialog"             # Modals
Search for: "form", "useForm", "FormField"          # Forms
Search for: "responsive", "md:", "lg:", "sm:"       # Breakpoints
Search for: "aria-", "role=", "tabIndex"            # Accessibility
Search for: "disabled", "isDisabled"                # Disabled states
Search for: "hover:", "focus:", "active:"           # Interactive states
```

---

## AUDIT METHODOLOGY

### 1. Exploration Phase
- Identify all routes and create an Information Architecture map
- List primary user flows (based on routes and navigation)
- Note the component hierarchy for each major page
- Document any obvious patterns or anti-patterns

### 2. Heuristic UI/UX Evaluation
Evaluate each area using these criteria:

#### Navigation & Information Architecture
- [ ] Is the navigation structure clear and consistent?
- [ ] Can users always know where they are?
- [ ] Are there dead ends or orphan pages?
- [ ] Is the hierarchy logical (breadcrumbs, back navigation)?

#### Visual Hierarchy & Readability
- [ ] Are headings properly sized and weighted?
- [ ] Is there sufficient contrast for text?
- [ ] Is the information density appropriate?
- [ ] Are CTAs visually prominent?

#### Consistency
- [ ] Are spacing values consistent (using design tokens)?
- [ ] Are button styles/sizes consistent across pages?
- [ ] Are form inputs styled consistently?
- [ ] Are icons from a single set and sized consistently?

#### Forms & Input
- [ ] Do forms have proper labels?
- [ ] Is validation inline and helpful?
- [ ] Are error messages specific and actionable?
- [ ] Are required fields marked?
- [ ] Do inputs have appropriate types (email, number, etc.)?
- [ ] Are defaults sensible?

#### Feedback & States
- [ ] Loading states: Are they present and non-blocking where possible?
- [ ] Empty states: Do they guide users on what to do?
- [ ] Error states: Are they helpful, not just "Something went wrong"?
- [ ] Success states: Is confirmation clear?
- [ ] Are there skeleton loaders or does content pop in?

#### Accessibility Basics
- [ ] Focus states: Are they visible?
- [ ] Color contrast: Does it meet WCAG AA?
- [ ] Keyboard navigation: Can users tab through forms?
- [ ] Screen reader: Are there appropriate ARIA labels?
- [ ] Touch targets: Are they at least 44x44px on mobile?

#### Responsiveness
- [ ] Does the layout work on mobile (320px)?
- [ ] Are there horizontal scroll issues?
- [ ] Do tables reflow or scroll appropriately?
- [ ] Are touch targets sized for mobile?

#### Performance UX
- [ ] Are there layout shifts when content loads?
- [ ] Are heavy operations (saves, fetches) non-blocking?
- [ ] Are there loading indicators for async operations?
- [ ] Is perceived performance optimized (optimistic updates)?

#### Content & Microcopy
- [ ] Is button text action-oriented?
- [ ] Are labels clear and consistent?
- [ ] Is error copy helpful?
- [ ] Is terminology consistent throughout?

### 3. Functional UX Audit
Identify flows where users can get stuck, confused, or lose data:

- **Multi-step actions**: Can users resume? Is progress shown?
- **Destructive actions**: Are there confirmations?
- **Auth/session**: What happens on timeout?
- **Form saves**: Is there autosave? Unsaved changes warning?
- **Retries**: Do failed actions offer retry?
- **Offline**: Graceful degradation?

Look for broken/fragile patterns:
- Inconsistent toast messages
- Silent failures
- Unclear error states
- Missing empty states
- Confusing navigation patterns

### 4. Design System Sanity Check
Evaluate design system consistency:

#### Typography
- Font families in use
- Heading scale (h1-h6)
- Body text sizes
- Line heights
- Font weights

#### Spacing
- Padding/margin consistency
- Gap values
- Section spacing
- Component internal spacing

#### Colors
- Primary, secondary, accent colors
- Semantic colors (success, error, warning, info)
- Text colors (primary, secondary, muted)
- Background colors
- Border colors

#### Components
- Button variants in use
- Input variants
- Card variants
- Alert/notification types
- Modal/dialog patterns

#### States
- Hover states
- Focus states
- Active states
- Disabled states
- Loading states
- Error states

---

## PRIORITIZATION FRAMEWORK

### P0 (Critical) - Fix this week
- Users cannot complete core tasks
- Data loss or corruption risk
- Major accessibility barriers
- Broken functionality

### P1 (High) - Fix this sprint
- Significant user confusion
- Inconsistent patterns causing errors
- Poor mobile experience on key flows
- Missing feedback on important actions

### P2 (Medium) - Plan for next sprint
- Minor inconsistencies
- Nice-to-have improvements
- Polish and refinement
- Edge case handling

---

## OUTPUT FORMAT

Create the file `UI_UX_AUDIT.md` in the repository root with the following structure:

```markdown
# UI/UX Audit Report - 717rec

**Audit Date**: [DATE]
**Auditor**: Claude Code
**Audit Type**: Static Code Analysis + Heuristic Evaluation

---

## Executive Summary

[5-10 bullet points of most critical findings]

---

## Information Architecture Map

### Routes & Pages
| Route | Page Component | Key Features | Status |
|-------|---------------|--------------|--------|
| / | Index.tsx | Homepage, hero cards | Active |
| /admin | AdminDashboard.tsx | Admin panel | Protected |
[... complete table ...]

### Primary User Flows
1. [Flow name]: [Steps]
2. ...

---

## Top 10 Fixes (This Week)

- [ ] **Fix 1**: [Description] - `file.tsx:line`
- [ ] **Fix 2**: [Description] - `file.tsx:line`
[... 10 items ...]

---

## Prioritized Findings

### P0 - Critical Issues

| # | Area | Issue | Evidence | Recommendation | Effort | Acceptance Criteria |
|---|------|-------|----------|----------------|--------|---------------------|
| 1 | ... | ... | `path/to/file.tsx:123` | ... | S/M/L | ... |

### P1 - High Priority

[Same table format]

### P2 - Medium Priority

[Same table format]

---

## Quick Wins (< 1 day each)

[Bulleted list of fast fixes with file references]

---

## Deeper Refactors (> 1 day)

[Bulleted list of larger improvements with scope estimates]

---

## Design System Consistency Review

### Typography
[Findings + recommendations]

### Spacing
[Findings + recommendations]

### Colors
[Findings + recommendations]

### Component Variants
[Findings + recommendations]

### State Coverage
[Findings + recommendations]

---

## Accessibility Quick Scan

| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| ... | ... | ... | ... |

---

## Validation Plan

### Metrics to Track
[Suggested metrics]

### Testing Approach
[How to verify improvements]

### Suggested Smoke Tests
[3-5 high-value test scenarios]

---

## Appendix

### Files Reviewed
[List of files analyzed]

### Search Patterns Used
[Grep/search patterns and results summary]
```

---

## VERIFICATION STEPS

Before finalizing the report:

1. **Run the build** to verify no TypeScript errors:
   ```bash
   npm run build
   ```

2. **Run linting** to check code quality:
   ```bash
   npm run lint
   ```

3. **Check for test files** and note coverage gaps:
   ```bash
   # Find existing test files
   find src -name "*.test.tsx" -o -name "*.test.ts"
   ```

4. **Verify findings** - Every issue must have:
   - Exact file path
   - Component/function name
   - Line number if relevant
   - Concrete evidence (code snippet or pattern)

---

## QUESTIONS TO ASK (If Needed)

If you cannot determine key user flows or priorities from the code, ask up to 5 targeted questions:

1. "What are the 3 most important user tasks in this app?"
2. "Which pages/flows get the most traffic?"
3. "Are there known pain points users have reported?"
4. "What's the mobile vs desktop usage split?"
5. "Are there any flows that have high drop-off rates?"

---

## IMPORTANT REMINDERS

- **DO NOT** implement any changes - this is audit only
- **DO** cite exact file paths and line numbers
- **DO** provide testable acceptance criteria
- **DO** separate quick wins from larger refactors
- **DO** prioritize based on user impact, not technical elegance
- **DO** consider the non-coder maintainer (keep recommendations practical)
- **DO** be specific and actionable, not vague

---

*Run this prompt to generate a comprehensive UI/UX audit report.*

# 717rec Architecture Guide

A recreational league management system built with React, TypeScript, and Supabase.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: React Router v8 (client-side SPA)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State**: TanStack Query v5 (server state caching)
- **Animation**: Framer Motion

## Project Structure

```
src/
├── pages/              # Route components
├── components/         # UI components by feature
│   ├── ui/            # shadcn base components (50+)
│   ├── admin/         # Admin dashboard components
│   ├── teams/         # Team cards, details, forms
│   ├── matches/       # Match displays, score entry
│   ├── playoffs/      # Bracket visualization
│   ├── schedule/      # Calendar, timeslot views
│   ├── layout/        # Navbar, Footer
│   └── navigation/    # BottomNav (phone tabs), CommandPalette, NavItem
├── hooks/             # Custom hooks, organized by feature
├── services/          # Business logic (Supabase queries)
├── integrations/      # Supabase client + auto-generated types
└── contexts/          # Auth & navigation contexts
```

## Routing

**Public Routes**:

- `/` - Home dashboard
- `/teams` - Team listings
- `/teams/:id` - Team details
- `/schedule` - Match schedule
- `/stats` - Rankings & statistics
- `/playoffs` - Tournament brackets
- `/compare` - Team comparison
- `/message-board` - Community board
- `/recap/:seasonSlug/:week` - One published weekly recap edition, e.g.
  `/recap/fall-2026/week-6`. Registered as a whole segment because React Router
  segments cannot be partial; the page parses the `week-6` form itself.

**Protected Routes**:

- `/my-team` - User's team management
- `/admin` - Admin dashboard; redirects to the last section opened (admin-only)
- `/admin/:section` - One admin section, e.g. `/admin/scores` (admin-only)
- `/timeslots` - Redirects to `/admin/timeslots` (admin-only)

Routes use lazy loading for code splitting via `React.lazy()`.

## Data Flow (3 Layers)

```
Components → Hooks → Services → Supabase → PostgreSQL
```

1. **Components** (`/components`) - Presentation only, consume hooks
2. **Hooks** (`/hooks`) - React Query + state management
3. **Services** (`/services`) - Pure functions, Supabase calls
4. **Supabase** - Database, auth, realtime subscriptions

**Example**: Displaying teams

```
TeamsPage → useTeamsQuery() → TeamFetchService.fetchTeams() → supabase.from('v_team_details')
```

### Pure decision modules

Some services split the reading from the deciding, so the rules that decide what
gets published can be tested directly and cannot drift between a preview and a
published page. The weekly recap is the clearest case:

- `services/recapEditions/fetchRecapFacts.ts` - the only part that touches the
  database
- `services/recapEditions/buildRecapFacts.ts` - assembles the frozen facts
- `services/recapEditions/gradeTeamsForWeek.ts` - ranks the league and grades
  every team for one week
- `services/recapEditions/standingsOrder.ts` - the one standings sort both of
  the above use
- `services/recapEditions/fallbackBlurbs.ts` - the line written about each team
  when no AI blurb is generated

`gradeTeamsForWeek` deliberately reuses the team page's own grading utilities -
`utils/reportCardUtils.ts` and `utils/reportCardPopulations.ts` - pointed at a
week's snapshot instead of today's standings, so a weekly grade and a team page
grade cannot use different rules. They do use different populations, which is
documented in `docs/product-description/stats/team-and-player-stats.md`.

## Supabase Integration

**Location**: `src/integrations/supabase/`

**Key Tables**:

- `teams`, `matches`, `profiles`, `divisions`
- `brackets`, `team_timeslots`, `team_memberships`
- `seasons`, `hero_cards`, `messages`
- `power_score_snapshots` - the only place a week number is stored
- `recap_editions`, `recap_edition_versions` - published weekly recaps. Versions
  are append-only (no UPDATE or DELETE grant), so a correction adds a version
  rather than rewriting one. A version holds the frozen `facts` (what the
  database said) separately from the editorial text - `headline`, `caption` and
  the per-team `blurbs` map (what the league chose to say) - so regenerating
  the facts cannot erase written text.

> The generated file `src/integrations/supabase/types.ts` is the source of truth
> for the full table list. Update this section when tables are added or renamed.

**Features**:

- Email + Google OAuth authentication
- Row Level Security (RLS) policies
- Database views for optimized queries (e.g., `v_team_details`)
- Realtime subscriptions for live updates (brackets, messages, scores)
- Auto-generated TypeScript types in `types.ts`

**Client**: Initialized in `src/integrations/supabase/client.ts`

## Where to Change UI

**Base Components** (`src/components/ui/`):

- Buttons, inputs, cards, dialogs, tables, etc.
- `ResponsiveTable` renders a table above `md` and a stack of cards below it —
  see `src/docs/TABLE_PATTERNS.md`. `ResponsiveDialog` does the same for modals.
- Built on Radix UI primitives
- Modify these to change app-wide styling

**Feature Components** (by domain):

- Teams: `src/components/teams/`
- Matches: `src/components/matches/`
- Admin: `src/components/admin/`
- Stats: `src/components/stats/`
- Playoffs: `src/components/playoffs/`

**Layout**:

- Navigation: `src/components/layout/Navbar.tsx` (header shell), `src/components/layout/navbar/NavLinks.tsx` (the link list, shared by the header row and the phone menu), `src/components/navigation/BottomNav.tsx` (phone tabs), `src/components/navigation/CommandPalette.tsx` (⌘K)
- Page wrapper: `src/components/layout/PageLayout.tsx`
- Footer: `src/components/layout/Footer.tsx`

**Styling**:

- Global styles: `src/styles/`
- Tailwind config (v4, CSS-first): the `@theme` blocks in `src/index.css`.
  There is no `tailwind.config.ts`. The same file keeps a few v3 behaviours on
  purpose (unlayered Preflight and utilities, `hover:` on touch screens, the v3
  `space-*` selector, v3 `text-*` line heights, and
  `src/styles/tailwind-v3-compat.css`); its comments explain each one.
- Theme tokens: `src/styles/theme.css` and `src/styles/themes/`
  - All three themes (light, dark, winter) define the **same token names**, so
    `text-foreground`, `bg-card` and `border-border` are already correct in each
    one and need no `dark:` twin. Where a colour cannot be a class — a chart
    library that takes colour props — `useIsDarkSurface()`
    (`src/hooks/useIsDarkSurface.ts`) answers "is the page dark?" correctly for
    winter as well as dark.
- Theme admin/runtime: `src/components/admin/theme/`, `src/hooks/useThemeSettings.ts`,
  `src/services/ThemeSettingsService.ts`

## Key Patterns

- **Lazy Loading**: All routes lazy-loaded for performance
- **Query Caching**: TanStack Query caches API responses (5min stale time)
- **Optimistic Updates**: UI updates before server confirms
- **Realtime**: Live playoff brackets, message board, scores
- **Type Safety**: Full TypeScript + auto-generated Supabase types
- **Feature Organization**: Code grouped by feature, not file type

## Page → Data Dependencies

```
Home (/)
├─ Hero cards (dynamic content)
├─ Top teams (power scores)
├─ Pending matches (scores to submit)
├─ Weekly trends (power score history)
└─ User's next match

Schedule (/schedule)
├─ Matches (by date/timeslot)
├─ Timeslots (available slots)
├─ Teams (for match creation)
└─ Match dates (calendar)

Teams (/teams)
├─ All teams (with stats)
├─ Divisions
└─ Team logos

Team Details (/teams/:id)
├─ Single team details
├─ Team matches (history)
├─ Team power scores (trends)
├─ Team badges (achievements)
├─ Team members
├─ Player stats (live-scored PPR/DPR)
├─ Head-to-head records
└─ Season breakdown

Stats (/stats)
├─ All matches
├─ Rankings (power scores)
├─ Division data
└─ Historical trends

Playoffs (/playoffs)
├─ Bracket data (tournament structure)
├─ Playoff matches (with scores)
├─ Playoff teams (seeding)
└─ Real-time match updates

My Team (/my-team)
├─ User's team membership
├─ Team details
├─ Team stats
└─ Upcoming matches

Admin (/admin)
├─ All teams (including hidden)
├─ All matches
├─ User profiles
├─ Team membership requests
├─ Divisions & timeslots
├─ Hero cards management
└─ Badge management

Message Board (/message-board)
├─ Messages (threaded)
├─ User profiles
└─ Real-time updates

History (/history)
├─ Past seasons
├─ Season stats
├─ Champions per season
└─ Historical rankings

Compare (/compare)
├─ Selected teams (comparison)
├─ Head-to-head records
├─ Team stats
└─ Match history
```

## Common Tasks

**Add a new page**:

1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add to the nav link list in `src/components/layout/navbar/NavLinks.tsx`, or to `src/components/navigation/CommandPalette.tsx` if it is a secondary page. `src/components/navigation/__tests__/routeReachability.test.ts` fails if a new route reaches no menu at all. Add it to `src/utils/routePrefetch.ts` too, or hover-prefetch silently does nothing for it.

**Fetch new data**:

1. Create service in `src/services/` (Supabase query)
2. Create hook in `src/hooks/` (wrap with TanStack Query)
3. Use hook in component

**Add UI component**:

1. For base components: `src/components/ui/`
2. For feature components: `src/components/{feature}/`

**Modify database**:

1. Create migration in `supabase/migrations/`
2. Run migration to update schema
3. Regenerate types: types will auto-update in `src/integrations/supabase/types.ts`

**Add admin feature**:

1. Component in `src/components/admin/`
2. Route in `src/App.tsx` with `ProtectedAdminRoute`
3. Service + hook for data

## Development Tips

- **Hot reload**: Vite dev server auto-reloads on file changes
- **Type safety**: Check `src/integrations/supabase/types.ts` for DB schema
- **Query DevTools**: TanStack Query DevTools available in dev mode
- **Component library**: Browse shadcn/ui docs for available components
- **Error tracking**: Sentry integration for production errors
- **Testing**: Vitest for unit tests

## Authentication Flow

1. User signs in via `/auth` (email or Google OAuth)
2. Session stored in `AuthContext`
3. Profile created/updated in `profiles` table
4. Protected routes check auth status
5. Admin routes check `is_admin` flag in profile

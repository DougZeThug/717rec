# 717rec Architecture Guide

A recreational league management system built with React, TypeScript, and Supabase.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Routing**: React Router v7 (client-side SPA)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State**: TanStack Query v5 (server state caching)
- **Animation**: Framer Motion

## Project Structure

```
src/
├── pages/              # Route components (17 pages)
├── components/         # UI components by feature
│   ├── ui/            # shadcn base components (40+)
│   ├── admin/         # Admin dashboard components
│   ├── teams/         # Team cards, details, forms
│   ├── matches/       # Match displays, score entry
│   ├── playoffs/      # Bracket visualization
│   ├── schedule/      # Calendar, timeslot views
│   └── layout/        # Navbar, Footer
├── hooks/             # Custom hooks (60+, organized by feature)
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

**Protected Routes**:
- `/my-team` - User's team management
- `/admin` - Admin dashboard (admin-only)
- `/timeslots` - Schedule management (admin-only)

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

## Supabase Integration

**Location**: `src/integrations/supabase/`

**Key Tables**:
- `teams`, `matches`, `profiles`, `divisions`
- `brackets`, `timeslots`, `team_members`
- `seasons`, `hero_cards`, `message_board`

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
- Built on Radix UI primitives
- Modify these to change app-wide styling

**Feature Components** (by domain):
- Teams: `src/components/teams/`
- Matches: `src/components/matches/`
- Admin: `src/components/admin/`
- Stats: `src/components/stats/`
- Playoffs: `src/components/playoffs/`

**Layout**:
- Navigation: `src/components/layout/Navbar.tsx`
- Page wrapper: `src/components/layout/PageLayout.tsx`
- Footer: `src/components/layout/Footer.tsx`

**Styling**:
- Global styles: `src/styles/`
- Tailwind config: `tailwind.config.ts`
- Theme: `src/lib/utils.ts` (includes custom "winter-frozen" theme)

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
3. Add to navbar in `src/components/layout/Navbar.tsx`

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

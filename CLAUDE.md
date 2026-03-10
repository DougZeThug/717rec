# 717rec - Project Brain 🧠

> **Quick Reference for Claude Code**: This document helps Claude understand the project structure, how to run it, and developer preferences.

---

## 🚀 How to Run the App

### Development
```bash
npm install          # Install dependencies (first time only)
npm run dev          # Start dev server at http://localhost:8080
```

### Production Build
```bash
npm run build        # Production build
npm run build:dev    # Development mode build
npm run preview      # Preview production build
```

### Other Commands
```bash
npm run lint         # Run ESLint
```

---

## 🔐 Environment Variables

**Location**: `.env` file in repository root

**Required Variables**:
- `VITE_SUPABASE_PROJECT_ID` - Supabase project identifier
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public Supabase API key (safe to commit)
- `VITE_SUPABASE_URL` - Supabase project URL

**Note**: All env vars are prefixed with `VITE_` (Vite requirement for client-side access)

---

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS + Radix UI
- **Backend**: Supabase (PostgreSQL database + Auth + Edge Functions)
- **Routing**: React Router v7
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Drag & Drop**: dnd-kit
- **Brackets**: brackets-manager + brackets-viewer
- **Icons**: Lucide React + custom icon registry
- **Toasts**: Sonner
- **Theming**: next-themes (light, dark, system, winter-frozen)
- **Date Utilities**: date-fns
- **Error Tracking**: Sentry
- **Mobile**: Capacitor (native iOS/Android support)
- **Excel Export**: ExcelJS
- **Virtualization**: react-window (large list performance)
- **Image Compression**: browser-image-compression

---

## 📁 Project Structure

```
src/
├── components/           # UI components organized by feature
│   ├── admin/           # Admin dashboard (scheduling, scoring, settings)
│   ├── auth/            # Authentication (forms, social login, protected routes)
│   ├── badges/          # Team achievement badges
│   ├── compare/         # Team comparison views
│   ├── effects/         # Visual effects & animations
│   ├── help/            # Help & FAQ sections
│   ├── hero/            # Hero cards for homepage
│   ├── history/         # Season history components
│   ├── home/            # Homepage sections
│   ├── layout/          # Navbar, Footer, PageLayout
│   ├── matches/         # Match display & details
│   ├── message-board/   # Community forum components
│   ├── navigation/      # Breadcrumbs, app nav
│   ├── playoffs/        # Bracket viewer & layout
│   ├── profile/         # User profile components
│   ├── schedule/        # Schedule view & date picker
│   ├── shared/          # Reusable cross-feature components
│   ├── stats/           # Statistics & rankings displays
│   ├── teams/           # Team-related components
│   ├── timeslots/       # Timeslot assignment UI
│   ├── transitions/     # Page transition animations
│   ├── typography/      # Text & heading components
│   ├── ui/              # shadcn/ui base components
│   └── winter/          # Seasonal winter theme components
├── config/              # App configuration (admin, api, cache, features, ui)
├── constants/           # Shared constants (brackets, heroCardPresets)
├── contexts/            # React contexts (Auth, Navigation)
├── data/                # Mock/seed data
├── hooks/               # Custom React hooks (150+)
│   ├── auth/            # Authentication hooks
│   ├── brackets/        # Playoff bracket hooks
│   ├── career/          # Career statistics hooks
│   ├── history/         # Historical data hooks
│   ├── matches/         # Match data hooks
│   ├── message-board/   # Message board hooks
│   ├── playoffs/        # Playoff management hooks
│   ├── rankings/        # Rankings & standings hooks
│   ├── scheduling/      # Schedule generation hooks
│   ├── team-stats/      # Team statistics hooks
│   └── teams/           # Team data hooks
├── icons/               # Custom icon registry & seasonal icons
├── integrations/        # External integrations (Supabase client)
├── lib/                 # Third-party library configs
├── pages/               # Route components (lazy-loaded)
├── services/            # Business logic & data access layer (ALL Supabase calls go here)
│   ├── brackets/        # Bracket CRUD & management
│   ├── matches/         # Match read/write/comments/reactions services
│   ├── messages/        # Message board + reactions services
│   ├── profile/         # Profile service
│   ├── selectors/       # Selector service
│   ├── support/         # Contact/support service
│   ├── teams/           # Team CRUD services
│   └── timeslots/       # Timeslot & bye week services
├── styles/              # Global styles & themes
├── types/               # TypeScript type definitions
└── utils/               # Utility functions (power scores, scheduling, etc.)
```

---

## 🎯 Main Feature Areas

### 1. **Seasons & History**
- Multi-season support with historical data
- Current vs. past seasons tracking
- Season-specific statistics and standings
- Past champions and historical standings (`/history` page)

### 2. **Divisions**
- Teams organized into divisions
- Division-specific standings and rankings
- Inter-division playoff brackets

### 3. **Teams**
- Team profiles with rosters
- Team statistics (W/L, power scores, trends)
- Head-to-head records
- Player management (admins only)
- Team analysis & notes
- Team comparison side-by-side (`/compare` page)
- Achievement badges (streaks, milestones)
- Team membership join/leave system (`/my-team` page)

### 4. **Matches**
- Schedule management
- Match result entry (admins only)
- Match history & details
- Court/timeslot assignments
- Auto-scheduling functionality (edmonds-blossom pairing algorithm)
- Match comments and reactions
- Score submission workflow

### 5. **Standings & Stats**
- Real-time division standings
- Power score rankings (Elo-based)
- Career statistics across all seasons
- Win/loss charts and trends
- Comparative team analysis

### 6. **Playoffs/Brackets**
- Tournament bracket generation
- Single & double elimination support
- Bracket visualization (brackets-viewer)
- Playoff match management
- Championship tracking
- Seeding management

### 7. **Message Board**
- Community forum for teams and participants
- Real-time messaging with Supabase subscriptions
- Message reactions, editing, and deletion
- Filtering and pagination

### 8. **Help & Support**
- Help center with FAQ and guides (`/help` page)
- Contact/support request form (`/contact` page)
- Support email via Supabase edge function

### 9. **User Profiles**
- Profile setup and editing (`/setup-profile` page)
- Team membership selection
- Google OAuth + email/password auth

### 10. **Timeslot Management** (Admin)
- Weekly court/time assignments
- Bye week management
- Batch timeslot operations

### 11. **Admin Dashboard**
- Season management (create, edit, finalize)
- Division configuration
- Team CRUD operations
- Match scheduling & scoring
- Playoff bracket generation
- User role management
- Hero card announcements
- Blind draw functionality
- Mass score entry
- Batch match operations

---

## 🗄️ Database (Supabase)

**Key Tables**:
- `seasons` - Season data
- `divisions` - Division configuration
- `teams` - Team information
- `team_players` - Team rosters
- `matches` - Match schedule & results
- `playoffs` - Playoff/bracket data
- `profiles` - User profiles
- `hero_cards` - Homepage announcements
- `power_score_history` - Historical power scores
- `team_season_stats` - Per-season team statistics
- `power_score_snapshots` - Weekly power score snapshots

**Authentication**: Supabase Auth with admin role checking (email/password + Google OAuth)

**Edge Functions** (`supabase/functions/`):
- `create-bracket` - Bracket creation (requires JWT)
- `capture-power-snapshots` - Power score history capture (no JWT)
- `send-support-email` - Support/contact email sending (no JWT)
- `update_team_stats` - Team statistics recalculation (no JWT)

**Migrations**: 90+ migration files in `supabase/migrations/`

---

## 🔧 Services Layer

Business logic lives in `src/services/`, sitting between hooks and Supabase. Services throw standardized errors (see Error Handling below).

**Architecture rule**: All Supabase calls must go through a service. Hooks and components must **never** import or call the Supabase client directly (exception: Supabase Storage in `src/utils/imageUpload.ts` and realtime `.channel()` subscriptions which stay in hooks).

**All Services**:
- `SeasonService` - Season CRUD + participation + stats queries
- `DivisionService` - Division fetch by season
- `HeroCardService` - Hero card CRUD + champions card queries
- `BlindDrawService` - Blind draw settings + signup management
- `TeamService` / `teams/` - Team CRUD (create, update, delete, fetch, calculations)
- `TeamFetchService` - Team detail, analysis, requests, membership, badges
- `TeamStatsService` - Team stats aggregation, records, season breakdown, career, head-to-head
- `HeadToHeadService` - Match history between teams
- `RankingsCalculationService` - Rankings & standings computation + power score trends
- `RankingSnapshotService` - Power score snapshot management
- `BadgeProcessingService` - Team achievement badge processing
- `ProfileService` - User profile queries + auth-related profile lookups
- `brackets/` - Bracket management (read, write, seeding, standings, validation, Supabase SQL storage) — all using standardized error handling
- `matches/MatchReadService` - Match queries (pending, uncompleted, timeslots, score submissions, team matches)
- `matches/MatchWriteService` - Match mutations (create, update, delete, RPC calls)
- `matches/MatchCommentsService` - Match comment CRUD
- `matches/MatchReactionsService` - Match reaction toggle + fetch
- `messages/MessageService` - Message board CRUD with filters + pagination
- `messages/MessageReactionsService` - Message reaction add/remove/fetch
- `profile/` - Profile service
- `support/` - Contact form submission (via edge function)
- `timeslots/TimeslotService` - Timeslot assignment, bye week management, date-based fetch, auto-schedule save

---

## 🎨 Developer Preferences

### ⚠️ CRITICAL: No-Coder Approach
- **I am NOT a coder** - always explain what you're doing in plain language
- **Avoid jargon** - use simple terms, not technical mumbo-jumbo
- **Show me the changes** - explain what each change does and why it's needed

### 📝 Small, Safe Diffs
- **Make incremental changes** - don't refactor entire files
- **One thing at a time** - fix one bug or add one feature per commit
- **Preserve existing code** - only change what's necessary
- **Test as you go** - verify each change works before moving on

### 🗣️ Explain Your Steps
1. **Before**: Tell me what you're about to do and why
2. **During**: Show me the specific changes you're making
3. **After**: Confirm what was changed and how to verify it works

### ✅ Communication Style
- Use clear, simple explanations
- Break down complex changes into digestible steps
- Ask for confirmation before major changes
- Provide context for technical decisions

---

## 🔄 CI/CD & Code Quality

### GitHub Actions (`.github/workflows/`)
- **test.yml** - Runs on push to main and all PRs:
  - Installs dependencies (`npm ci`)
  - Runs Vitest tests
  - Builds the project
  - Runs TypeScript type checking (`tsc`)
- **security-audit.yml** - Weekly + on PRs:
  - `npm audit` with high severity threshold
  - Non-blocking (reports only)
- **Dependabot** (`.github/dependabot.yml`) - Weekly dependency updates (React 19 excluded)

### Code Formatting
- **Prettier** (`.prettierrc`): Single quotes, 100 char width, 2-space indent, trailing commas (ES5)
- **ESLint** (`eslint.config.js`): TypeScript strict linting, import sorting (`simple-import-sort`), React Hooks validation
- **DeepSource** (`.deepsource.toml`): Static analysis with React plugins

### Auto-generated Files (do not edit manually)
- `src/integrations/supabase/types.ts` - Supabase database types

---

## 🧪 Testing Notes

- Test framework: Vitest + Testing Library
- Test config: `vitest.config.ts` at project root
- Integration tests: `tests/` directory at root
- Unit tests: `src/**/__tests__/**/*.{test,spec}.tsx`
- Setup: `src/setupTests.ts`
- CI: Tests run automatically on push to main and all PRs

---

## 📦 Build & Deployment

- **Build output**: `dist/` directory
- **Deployment**: Lovable.dev platform (`.lovable/` config directory)
- **Custom domains**: Configure in project settings
- **Source maps**: Enabled for debugging
- **Code splitting**: Manual vendor chunks in `vite.config.ts` (react, motion, charts, dnd, supabase, brackets, sentry)
- **CSS optimization**: `vite-plugin-beasties` in production builds
- **Path alias**: `@` maps to `./src` (e.g., `@/components/ui/button`)

---

## 🔍 Key Code Patterns

### Data Flow
- **Components** → **Hooks** (TanStack Query) → **Services** → **Supabase**
- Custom hooks in `src/hooks/` wrap TanStack Query for feature-specific data
- Services in `src/services/` handle business logic and Supabase calls
- Supabase client in `src/integrations/supabase/client.ts`

**SOC Rules** (enforced — do not break these):
1. Hooks and components must **never** import `supabase` from the integration client
2. All database queries and mutations live exclusively in `src/services/`
3. Realtime `.channel()` subscriptions are the **only** exception — they stay in hooks
4. `src/utils/imageUpload.ts` is the **only** util allowed to call Supabase Storage directly
5. When adding a new service function, always use `handleDatabaseError()` and `ensureFound()` from `@/utils/errorHandler`

**Service Template**:
```typescript
import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';

export const ExampleService = {
  fetchItems: async (seasonId: string) => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('season_id', seasonId);

    if (error) handleDatabaseError(error, 'Failed to fetch items');
    return data ?? [];
  },

  fetchItemById: async (id: string) => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) handleDatabaseError(error, 'Failed to fetch item');
    return ensureFound(data, 'Item', id);
  },
};
```

### Routing
- Lazy-loaded route components for performance
- Protected routes for admin pages (`ProtectedAdminRoute`)
- Page transitions with Framer Motion
- `ErrorBoundary` and `RouteErrorBoundary` for error recovery
- Scroll restoration per page

### Styling
- Tailwind utility classes
- shadcn/ui components with variants
- Responsive design (mobile-first)
- Dark mode + seasonal themes (next-themes: light, dark, system, winter-frozen)
- Custom cornhole-themed colors (wood, green, navy, cream) + division colors

### Error Handling
**All service layer functions throw errors consistently** - no mixed patterns of returning null/boolean/result objects.

#### Standard Pattern
```typescript
// ✅ CORRECT: Services throw standardized errors
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';

export const fetchTeam = async (teamId: string) => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch team');
  }

  return ensureFound(data, 'Team', teamId);
};
```

#### Error Types (`src/types/errors.ts`)
- `DatabaseError` - Database operation failures (Supabase queries/mutations)
- `NotFoundError` - Resource not found (missing teams, seasons, etc.)
- `ValidationError` - Invalid input or missing required fields
- `BusinessLogicError` - Invalid state transitions or rule violations
- `AuthorizationError` - Insufficient permissions

#### Error Handling Utilities (`src/utils/errorHandler.ts`)
- `handleDatabaseError(error, context)` - Wraps Supabase errors as DatabaseError and throws
- `ensureFound(data, resourceName, identifier?)` - Throws NotFoundError if data is null/undefined
- `withErrorHandling(operation, context)` - Wraps async operations with consistent error handling
- `getErrorMessage(error)` - Safely extract error message from any error type
- `getUIErrorMessage(error, context?)` - Get user-facing error message with optional context
- `handleHookError(error)` - Hook-level error categorization (returns message, userMessage, category)
- `logError(error, context)` - Consistent error logging

#### Why This Pattern?
- **TanStack Query Integration**: React Query automatically catches thrown errors and exposes them via `error` state
- **Explicit Failures**: No need to check for null returns - errors are always thrown
- **Better Stack Traces**: Easier debugging with proper error objects
- **Retry Logic**: Works naturally with React Query's built-in retry mechanisms
- **Consistency**: One error path instead of multiple return types

#### Hooks Handle Errors
```typescript
// Hooks use React Query which catches thrown errors automatically
const { data, error, isLoading } = useQuery({
  queryKey: ['team', teamId],
  queryFn: () => TeamService.fetchTeam(teamId),
});

if (error) {
  // Display error to user
  return <ErrorMessage error={error} />;
}
```

#### When Returning Null is OK
Returning null is acceptable when it represents **absence of data, not an error**:
```typescript
// ✅ OK: No matches between teams is valid business state
const history = await getOpponentHistory(team1, team2);
if (!history) {
  return <EmptyState message="No matches yet" />;
}

// ❌ WRONG: Database error should throw, not return null
const team = await fetchTeam(teamId);
if (!team) { /* This should never happen - throws NotFoundError */ }
```

---

## 📏 Codebase Rules (Learned Patterns)

> These are patterns specific to this codebase that come up repeatedly. Follow them to avoid re-discovering the same issues.

### Radix UI Test Mocking
When testing components that use Radix UI primitives (Dialog, Popover, Select, DropdownMenu, etc.), you **must** mock pointer capture methods in your test setup. Radix calls `setPointerCapture` / `releasePointerCapture` / `hasPointerCapture` which jsdom doesn't support. Add this to test files or `src/setupTests.ts`:
```typescript
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
});
```
Also mock `scrollIntoView` if your Radix component triggers it:
```typescript
HTMLElement.prototype.scrollIntoView = vi.fn();
```

### Service Splitting Threshold
Split a service file into focused sub-services when it exceeds **~400 lines**. Follow the existing pattern (e.g., `matches/MatchReadService`, `matches/MatchWriteService`). Group related functions into a subfolder with separate files by responsibility (read, write, mutations, queries).

### Explicit Column Selects
**Never use `select('*')`** in Supabase queries — always list columns explicitly. This prevents over-fetching, avoids breaking changes when columns are added/removed, and keeps responses lean. Example:
```typescript
// ❌ BAD
.select('*')

// ✅ GOOD
.select('id, name, season_id, division_id, created_at')
```
Update the Service Template examples above accordingly — they show `select('*')` for brevity, but real code should always list columns.

### Planning Doc Lifecycle
When working on multi-step tasks: **(1)** create a plan file (e.g., `plan.md`) to outline the approach, **(2)** execute the plan step by step, **(3)** delete the plan file when done. Do not leave plan files in the repo after the work is complete.

### Test File Locations
- **Unit tests** for a specific component or hook go in a `__tests__/` folder next to the source file: `src/components/teams/__tests__/TeamCard.test.tsx`
- **Integration tests** that span multiple features or test broader flows go in the root `tests/` directory: `tests/scheduling.test.ts`
- When in doubt: if the test imports from only one module, it's a unit test (`__tests__/`). If it touches multiple modules or services together, it's an integration test (`tests/`).

---

## 🚨 Common Gotchas

1. **Admin permissions**: Check `useAdminAccess()` hook for role verification
2. **Season context**: Most data is season-specific - always filter by season
3. **Power scores**: Complex calculation - see `src/utils/powerScore/`
4. **Brackets**: Use brackets-manager library - don't roll your own
5. **Real-time updates**: Supabase subscriptions for live data
6. **Supabase types**: `src/integrations/supabase/types.ts` is auto-generated - never edit manually
7. **TypeScript strict mode**: Disabled in `tsconfig.app.json` (allows flexible typing)
8. **Legacy peer deps**: `.npmrc` has `legacy-peer-deps=true` to avoid peer dependency conflicts
9. **Edge functions**: Verify JWT requirements in `supabase/config.toml`, and keep function entries synchronized with `supabase/functions/`
10. **No direct Supabase in hooks/components**: Always go through a service — see SOC Rules in Key Code Patterns above

---

*Last updated: 2026-03-10*

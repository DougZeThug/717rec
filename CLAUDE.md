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
- **Backend**: Supabase (PostgreSQL database + Auth)
- **Routing**: React Router v7
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Drag & Drop**: dnd-kit
- **Brackets**: brackets-manager library

---

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── admin/       # Admin dashboard components
│   ├── auth/        # Authentication components
│   ├── hero/        # Hero cards for homepage
│   ├── layout/      # Navbar, Footer, etc.
│   ├── stats/       # Statistics & rankings displays
│   ├── teams/       # Team-related components
│   ├── ui/          # shadcn/ui base components
│   └── ...
├── contexts/        # React contexts (Auth, Navigation)
├── hooks/           # Custom React hooks
│   ├── brackets/    # Playoff bracket hooks
│   ├── matches/     # Match data hooks
│   ├── playoffs/    # Playoff management hooks
│   ├── rankings/    # Rankings & standings hooks
│   └── teams/       # Team data hooks
├── pages/           # Route components
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── lib/             # Third-party library configs
└── styles/          # Global styles & themes
```

---

## 🎯 Main Feature Areas

### 1. **Seasons**
- Multi-season support with historical data
- Current vs. past seasons tracking
- Season-specific statistics and standings

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

### 4. **Matches**
- Schedule management
- Match result entry (admins only)
- Match history & details
- Court/timeslot assignments
- Auto-scheduling functionality

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

### 7. **Admin Dashboard**
- Season management (create, edit, finalize)
- Division configuration
- Team CRUD operations
- Match scheduling & scoring
- Playoff bracket generation
- User role management
- Hero card announcements
- Blind draw functionality

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

**Authentication**: Supabase Auth with admin role checking

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

## 🧪 Testing Notes

- Test framework: Vitest + Testing Library
- Test files: `**/__tests__/**/*.{test,spec}.tsx`
- Setup: `src/setupTests.ts`

---

## 📦 Build & Deployment

- **Build output**: `dist/` directory
- **Deployment**: Lovable.dev platform
- **Custom domains**: Configure in project settings
- **Source maps**: Enabled for debugging

---

## 🔍 Key Code Patterns

### Data Fetching
- Use TanStack Query hooks for all API calls
- Custom hooks in `src/hooks/` for feature-specific data
- Supabase client in `src/integrations/supabase/client.ts`

### Routing
- Lazy-loaded route components for performance
- Protected routes for admin pages (`ProtectedAdminRoute`)
- Page transitions with Framer Motion

### Styling
- Tailwind utility classes
- shadcn/ui components with variants
- Responsive design (mobile-first)
- Dark mode support (next-themes)

---

## 🚨 Common Gotchas

1. **Admin permissions**: Check `useAdminCheck()` hook for role verification
2. **Season context**: Most data is season-specific - always filter by season
3. **Power scores**: Complex calculation - see `src/utils/powerScore.ts`
4. **Brackets**: Use brackets-manager library - don't roll your own
5. **Real-time updates**: Supabase subscriptions for live data

---

*Last updated: 2026-01-10*

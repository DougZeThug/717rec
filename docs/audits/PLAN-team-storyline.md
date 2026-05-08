# PLAN — Team Storyline ("Season Journey")

> **Goal:** Turn each team's page into a *story* — a guided walk-through of their season — instead of a static stat sheet. Best win, worst stumble, badges earned, rivalry beats, power-score swings, and a current outlook, presented as a scrollable journey with chips, mini-charts, and "jump to match" links.

This plan is broken into *phases*. Each phase is its own commit. We pause after each phase so you can sanity-check before moving on.

---

## Branch

`claude/team-season-journey-S3s4o` (already checked out).

---

## Plain-language summary of what we're building

Imagine the team page today is a binder full of stats. The Storyline is a *highlight reel* at the top of that binder. It walks you through 6–10 "chapters" of the season:

1. **Season opener** — the very first match.
2. **Best win** — biggest upset or most lopsided W.
3. **Worst stumble** — heaviest L or surprising upset suffered.
4. **Badge moments** — when they earned a badge (e.g. "First Sweep", "Hot Streak").
5. **Rivalry beats** — key matches against their #1 rival.
6. **Power surges & dips** — the largest jumps in their power score.
7. **Current outlook** — short text summary using existing `team_analysis.overall` + power trend.

Each "chapter" is a card with a headline, a date chip, a tiny chart or score, and a button that jumps to the relevant match or rivalry view.

---

## What already exists that we'll reuse

| Data we need | Where it lives today |
|---|---|
| Team & season info | `src/services/teams/TeamFetchService.ts`, `SeasonService.ts` |
| Match history per team | `src/services/matches/MatchHistoryService.ts`, `useTeamMatches` hook |
| Per-season breakdown | `src/hooks/teams/seasonBreakdown/` |
| Badge events | `src/services/BadgeProcessingService.ts`, `src/services/teams/TeamBadgeService.ts` |
| Head-to-head / rivalry | `src/services/HeadToHeadService.ts`, `RivalryHighlights.tsx` |
| Power-score history | `useHistoricalPowerScores.ts`, `TeamCareerPowerScoreChart.tsx` |
| Curated analysis text | `team_analysis` table via `src/services/teams/TeamAnalysisService.ts` |
| Weekly recap pattern (similar shape) | `WeeklyRecapService.ts` |

**Important:** No new raw data plumbing is required. We're composing existing data into a new shape.

---

## Phase 0 — Confirm scope (no code)

Before we start, please confirm:

- [ ] Storyline lives on the existing `TeamDetails` page, at the top, as a new section. (Alternative: dedicated `/teams/:id/journey` route — we *can* do this later; v1 inlines it.)
- [ ] v1 is **read-only**. No editing of story events from the UI.
- [ ] v1 uses **only the active season** by default; a season picker comes later.
- [ ] Narrative text is **mostly templated** (e.g. "Beat Rival FC 21–18 on Mar 4") with a clear "auto-generated" label. Curated overrides come from the existing `team_analysis` fields, also labeled.

If any of those should change, we adjust the plan before writing code.

---

## Phase 1 — Types & event composer (server-side composer, no DB changes)

**Why first:** Build the "shape" of a story event once, and a pure function that turns existing data into a list of events. This is testable in isolation.

**Files added:**

- `src/types/teamStorylineTypes.ts` — `StoryEvent` discriminated union:
  - `kind: 'season_opener' | 'best_win' | 'worst_loss' | 'badge_earned' | 'rivalry_beat' | 'power_surge' | 'power_dip' | 'current_outlook'`
  - Common fields: `id`, `kind`, `headline`, `subhead`, `date`, `source: 'auto' | 'curated'`, `cta?: { label, route }`
  - Per-kind fields: `matchId`, `opponentId`, `badgeId`, `powerDelta`, etc.
- `src/services/teamStoryline/composeStoryEvents.ts` — pure function:
  - Inputs: team, matches, badges, h2h records, power-score history, analysis row.
  - Output: ordered `StoryEvent[]` (chronological).
  - **Throws** on bad input (per architecture rule).
- `src/services/teamStoryline/__tests__/composeStoryEvents.test.ts` — unit tests with fixtures covering each `kind`.

**Why a composer (not a materialized view) for v1:** The brief allows either; a composer gives us faster iteration and zero migration risk. We can promote to a Postgres view in Phase 5 if perf demands it.

**Verification:** `npm run test:file -- src/services/teamStoryline/__tests__/composeStoryEvents.test.ts` passes.

---

## Phase 2 — Service & hook (data layer)

**Files added:**

- `src/services/teamStoryline/TeamStorylineService.ts` — fetches the inputs and calls `composeStoryEvents`. Follows the service template in `CLAUDE.md` (explicit columns, `handleDatabaseError`, throws on errors).
- `src/hooks/teams/useTeamStoryline.ts` — TanStack Query wrapper, keyed `['teamStoryline', teamId, seasonId]`.
- Tests for the service (mock supabase) and hook (renderHook).

**Architecture compliance:**
- Components/hooks never import the supabase client → satisfied.
- Service uses `handleDatabaseError` and explicit column lists → satisfied.

**Verification:** Tests pass; manual log shows the hook returns events for one real team.

---

## Phase 3 — UI: storyline section (carousel + chips)

**Files added:**

- `src/components/teams/storyline/TeamStorylineSection.tsx` — top-level container; renders title, "auto-generated" disclosure tooltip, and the carousel.
- `src/components/teams/storyline/StoryEventCard.tsx` — one card per event; variants per `kind` (icon, color, mini-chart slot).
- `src/components/teams/storyline/StoryMilestoneChips.tsx` — the row of jump-to chips above the carousel ("Opener · Best Win · Streak · Rival · Outlook").
- `src/components/teams/storyline/PowerSparkline.tsx` — small inline sparkline reusing the recharts setup from `PowerScoreChart`.
- `src/components/teams/storyline/__tests__/*.test.tsx` — render tests for each card variant + empty state.

**Interactions:**
- Horizontal swipe / arrow buttons to step through events.
- Each card's CTA navigates to the matching match detail or rivalry view (routes already exist).
- Skeleton state while `useTeamStoryline` is loading.
- Empty state ("No story yet — check back after Week 1") when 0 events.

**Wire-in:** `src/pages/TeamDetails.tsx` gets a `<TeamStorylineSection teamId={teamId} />` placed *between* the `TeamHeader` and `TeamPerformanceCards`.

**Verification:** `npm test` is green; spot-check the page in dev (`npm run dev`) for one team with a full season and one team with very few matches.

---

## Phase 4 — Labeling, accessibility, polish

- Add a small "Auto-generated · how this works" link → opens a modal with one paragraph explaining what the story is and isn't.
- Curated text from `team_analysis` is shown with a different badge ("Curated by admin") so the source is always explicit. (Brief calls this out as an ethics requirement.)
- Make sure the `team_analysis` `rivalry_insights` admin-only commentary is **not** shown — only the public `overall` summary.
- Keyboard navigation on the carousel (`←` / `→`).
- `prefers-reduced-motion` disables auto-advance and snap animations.
- Add an instrumentation hook for metrics (story dwell, CTA clicks). Use whatever analytics util the codebase already has; if none, leave a `TODO(metrics)` comment.

---

## Phase 5 — (Optional / later) materialized view

Only if the composer becomes a perf bottleneck:

- Add `team_story_events` materialized view in a new Supabase migration.
- Refresh nightly + on match-completion trigger.
- Swap the service to read the view; composer stays as fallback.

Not in scope for the first PR.

---

## Risks & how we'll mitigate

| Risk | Mitigation |
|---|---|
| Story feels empty early in a season | Empty state copy + "events unlock as your season progresses" line |
| Auto-generated text sounds robotic | Templates are short and factual ("Beat X 21–18, +6 power swing"), not flowery |
| Confusion between auto vs curated | Explicit per-card source badge + "how this works" modal |
| Mobile carousel jank | Reuse the existing carousel component from `LeagueLeaderboardCarousel` if suitable; otherwise a minimal CSS-snap implementation |
| Perf on team pages with hundreds of matches | Composer caps inputs to active season + memoizes; query is keyed by `seasonId` |

---

## Success metrics (from the brief)

- Team-detail dwell time (overall + the storyline section specifically)
- Story completion rate (% of users who scroll past the last card)
- CTA click-through to match / rivalry views
- Repeat visits to team pages

---

## Order of commits

1. `feat(storyline): add types + composeStoryEvents with tests` (Phase 1)
2. `feat(storyline): add TeamStorylineService and useTeamStoryline hook` (Phase 2)
3. `feat(storyline): render TeamStorylineSection on TeamDetails` (Phase 3)
4. `chore(storyline): labels, a11y, reduced-motion, source badges` (Phase 4)

After Phase 4 we delete this plan file and open a PR if you want one.

---

## What I need from you before starting

1. Confirm the Phase 0 scope (or change it).
2. Confirm you want me to proceed phase-by-phase, pausing for your OK after each commit.
3. Anything you want to *cut* from the v1 list (e.g. "skip rivalry beats for now")?

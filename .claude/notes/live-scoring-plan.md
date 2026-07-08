# Live Scoring — working notes (delete when feature is complete)

Approved plan: /root/.claude/plans/root-claude-uploads-ee885791-3115-5250-floating-valley.md
Branch: claude/cornhole-live-scoring-6zpdqm

## User decisions
- Target app: 717rec (Supabase wcitdamvochthvxvtxyb). Reference zip (cornhole-score-master) is patterns-only.
- Game rule: first to 21, WIN BY 2 (no bust / hard cap).
- Full ScoreMagic bag detail from day one (disambiguation tap for 3/4/6).
- Track thrower per round (auto-alternate between 2 selected players).

## Key files inspected (verified facts)
- src/hooks/matches/validation/useScoreValidation.ts — matches.team1_score/team2_score are BINARY 0/1; series tally in *_game_wins.
- supabase/migrations/20260310151239 — approve_match_result / mark_match_as_tie idempotent patterns (winner_id IS NULL guard, FOR UPDATE, inline team increments, GREATEST(0,..) reversal, upsert_team_season_stats()).
- supabase/migrations/20251130144419 + 20260410152541:121-126 — games table RLS is admin INSERT/UPDATE/DELETE only, NO SELECT policy in migrations.
- supabase/migrations/20260330153404 — idempotent realtime publication DO-block pattern.
- src/integrations/supabase/client.ts — auto-generated, createClient<Database>; do not edit. types.ts also auto-generated.
- update_updated_at_column() exists (20260107151848) — reuse for games.updated_at trigger.
- Reuse: subscribeWithRetry, invalidateMatchRelatedQueries, ScoreStepper, ResponsiveDialog, EmptyState/LoadingState, useIsMobile, useTeamMembership, useAdminAccess.

## Schema assumptions
- games (dormant): id uuid pk, match_id uuid nullable →matches, game_number required, team1_score/team2_score nullable, created_at nullable. Extended by our migration.
- teams.players is text[] of names → seeds new team_players.
- team_memberships(user_id, team_id, is_approved) is the user→team link.
- Single active season (seasons.is_active).

## Architectural decisions
- match_rounds append-only; net_points + winner_team are GENERATED columns; game totals always folded from rounds client-side.
- match_id denormalized onto match_rounds (realtime filter + single-join RLS).
- UNIQUE(game_id, round_number) = duplicate-write guard; 23505 → DuplicateRoundError.
- Typing shim (src/services/liveScoring/dbTypes.ts + liveDb.ts) until user applies migration in Lovable and regenerates types.ts. TODO(live-scoring) markers.
- finalize_live_match / reopen_live_match RPCs copy approve_match_result / mark_match_as_tie idempotency.
- Winner rule lives ONLY in DEFAULT_GAME_RULES (src/utils/liveScoring/rules.ts).

## Unresolved / risks
- Migration applied out-of-band via Lovable; until then page shows "not enabled" (42P01 → LiveScoringNotEnabledError). NOTE: legacy `games` table EXISTS in prod, so bundle fetch won't 42P01 on games — detection keyed off match_rounds/team_players queries.
- Legacy dormant games rows: migration deletes match_id IS NULL rows, dedupes, marks rows of completed matches as completed.
- Player renames in teams.players don't sync to team_players (documented; follow-up).
- RPC SQL not executable in CI — review-only assurance.

## Test commands run
- (log as executed)

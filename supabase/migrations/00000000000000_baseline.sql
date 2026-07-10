-- ============================================================================
-- BASELINE (migration 0) — pre-migration schema for the 717rec Supabase project
--
-- WHY THIS EXISTS
--   The checked-in migrations (2025-05-20 onward) assume the project's core
--   tables (teams, matches, seasons, ...) already exist: they were created in
--   the Supabase dashboard before migrations were adopted, so no migration
--   file ever created them. Without this file a fresh database (and the
--   supabase-ci "apply migrations" job) cannot be rebuilt from migrations.
--
-- HOW IT WAS BUILT
--   Reconstructed from src/integrations/supabase/types.ts (the auto-generated
--   snapshot of the live schema) plus evidence in later migrations and app
--   code, then verified by replaying every migration on a fresh Postgres.
--   It intentionally contains ONLY what existed before the first migration;
--   everything else is added by the migrations that follow it.
--   If a full `supabase db dump` from the live project ever becomes
--   available, it can replace this file's contents wholesale.
--
-- SAFETY
--   Every statement is guarded (IF NOT EXISTS / existence checks), so this
--   file is a complete no-op if it is ever applied to the live project,
--   where all of these objects already exist. It never drops or replaces
--   anything.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fresh-database sentinel. Some sections below (historical seed rows,
-- dashboard-era policies that later migrations drop, default grants) must
-- run ONLY when rebuilding from zero: on the live project they would
-- re-create rows/policies/grants that later hardening migrations removed.
-- The check runs before this file creates anything, so "teams missing"
-- exactly means "empty database".
DO $$ BEGIN
  PERFORM set_config('baseline.fresh_db',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
                      WHERE table_schema = 'public' AND table_name = 'teams')
         THEN 'false' ELSE 'true' END,
    false);
END $$;

-- Enum types that predate all migrations.
DO $$ BEGIN
  CREATE TYPE public.match_type AS ENUM ('winners', 'losers', 'finals');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.playoff_match_type AS ENUM
    ('winners', 'losers', 'finals', 'play-in', 'play-in-2');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  full_name text,
  is_admin boolean,
  username text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT false,
  champion_team_id uuid,
  runner_up_team_id uuid,
  third_place_team_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.divisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_division text,
  division_weight numeric,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  division_id uuid,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  game_wins integer,
  game_losses integer,
  seed integer,
  challonge_participant_id bigint,
  logo_url text,
  image_url text,
  players text[],
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.brackets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  format text,
  state text,
  division_id uuid,
  wb_champion_id uuid,
  challonge_tournament_id bigint,
  participants jsonb,
  migrated boolean DEFAULT false,
  migrated_at timestamp with time zone,
  reset_match_needed boolean,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team1_id uuid,
  team2_id uuid,
  winner_id uuid,
  loser_id uuid,
  bracket_id uuid,
  season_id uuid,
  "date" timestamp with time zone,
  location text,
  iscompleted boolean,
  round_number integer NOT NULL,
  "position" integer,
  team1_score integer,
  team2_score integer,
  team1_game_wins integer,
  team2_game_wins integer,
  best_of integer,
  match_type match_type,
  next_match_id uuid,
  next_loser_match_id uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.games (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid,
  game_number integer NOT NULL,
  team1_score numeric,
  team2_score numeric,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bracket_id uuid NOT NULL,
  team_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.team_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  wins integer NOT NULL,
  losses integer NOT NULL,
  current_rank integer,
  previous_rank integer,
  rank_change integer,
  win_percentage numeric,
  sos numeric,
  streak text,
  head_to_head jsonb,
  snapshot_date date,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.team_season_stats (
  season_id uuid NOT NULL,
  team_id uuid NOT NULL,
  match_wins integer NOT NULL,
  match_losses integer NOT NULL,
  game_wins integer NOT NULL,
  game_losses integer NOT NULL,
  division_name text,
  playoff_rank integer,
  power_score numeric,
  sos numeric,
  champion boolean,
  runner_up boolean NOT NULL DEFAULT false,
  recorded_at timestamp with time zone,
  PRIMARY KEY (season_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.team_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  joined_at timestamp with time zone DEFAULT now(),
  team_id uuid,
  user_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.team_season_opt_out (
  created_at timestamp with time zone,
  season_id uuid NOT NULL,
  team_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.team_timeslots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone,
  match_date date NOT NULL,
  team_id uuid,
  timeslot text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.team_details_archive (
  close_match_losses integer,
  created_at timestamp with time zone,
  division_id uuid,
  divisionname text,
  game_losses integer,
  game_win_percentage numeric,
  game_wins integer,
  image_url text,
  logo_url text,
  losses integer,
  name text,
  players text[],
  power_score numeric,
  season_id uuid NOT NULL,
  snapshot_at timestamp with time zone,
  sos numeric,
  team_id uuid NOT NULL,
  weighted_game_win_percentage numeric,
  weighted_win_percentage numeric,
  win_percentage numeric,
  wins integer
);

CREATE TABLE IF NOT EXISTS public.matches_archive (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team1_id uuid,
  team2_id uuid,
  winner_id uuid,
  loser_id uuid,
  bracket_id uuid,
  season_id uuid,
  "date" timestamp with time zone,
  location text,
  iscompleted boolean,
  round_number integer NOT NULL,
  "position" integer,
  team1_score integer,
  team2_score integer,
  team1_game_wins integer,
  team2_game_wins integer,
  best_of integer,
  match_type match_type,
  next_match_id uuid,
  next_loser_match_id uuid,
  metadata jsonb,
  created_at timestamp with time zone,
  archived_at timestamp with time zone,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.debug_match_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inserted_at timestamp with time zone,
  match_id uuid,
  team1_game_wins integer,
  team1_score numeric,
  team2_game_wins integer,
  team2_score numeric,
  user_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.playoff_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  best_of integer,
  bracket_id uuid,
  created_at timestamp with time zone,
  loser_id uuid,
  match_type public.playoff_match_type NOT NULL DEFAULT 'winners'::public.playoff_match_type,
  next_lose_match_id uuid,
  next_win_match_id uuid,
  "position" integer NOT NULL,
  round integer NOT NULL,
  status text,
  team1_id uuid,
  team1_score numeric,
  team1_seed integer,
  team2_id uuid,
  team2_score numeric,
  team2_seed integer,
  updated_at timestamp with time zone,
  winner_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.playoff_games (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone,
  game_number integer NOT NULL,
  match_id uuid,
  team1_score numeric NOT NULL,
  team2_score numeric NOT NULL,
  winner_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.playoff_team_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bracket_id uuid,
  game_losses integer,
  game_wins integer,
  inserted_at timestamp with time zone,
  losses integer,
  placement integer,
  team_id uuid,
  updated_at timestamp with time zone,
  wins integer,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category text,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_edited boolean,
  team_id uuid,
  team_name text,
  updated_at timestamp with time zone,
  user_id uuid,
  username text NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  emoji text NOT NULL,
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.match_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  match_id uuid NOT NULL,
  team_name text,
  user_id uuid NOT NULL,
  username text NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.match_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  emoji text NOT NULL,
  match_id uuid NOT NULL,
  user_id uuid NOT NULL,
  PRIMARY KEY (id)
);

-- Foreign keys (added after all tables so ordering doesn't matter).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'seasons_champion_team_id_fkey' AND conrelid = 'public.seasons'::regclass) THEN
    ALTER TABLE public.seasons
      ADD CONSTRAINT seasons_champion_team_id_fkey FOREIGN KEY (champion_team_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'seasons_runner_up_team_id_fkey' AND conrelid = 'public.seasons'::regclass) THEN
    ALTER TABLE public.seasons
      ADD CONSTRAINT seasons_runner_up_team_id_fkey FOREIGN KEY (runner_up_team_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'seasons_third_place_team_id_fkey' AND conrelid = 'public.seasons'::regclass) THEN
    ALTER TABLE public.seasons
      ADD CONSTRAINT seasons_third_place_team_id_fkey FOREIGN KEY (third_place_team_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'teams_division_id_fkey' AND conrelid = 'public.teams'::regclass) THEN
    ALTER TABLE public.teams
      ADD CONSTRAINT teams_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'brackets_division_id_fkey' AND conrelid = 'public.brackets'::regclass) THEN
    ALTER TABLE public.brackets
      ADD CONSTRAINT brackets_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'brackets_wb_champion_id_fkey' AND conrelid = 'public.brackets'::regclass) THEN
    ALTER TABLE public.brackets
      ADD CONSTRAINT brackets_wb_champion_id_fkey FOREIGN KEY (wb_champion_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'matches_bracket_id_fkey' AND conrelid = 'public.matches'::regclass) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_bracket_id_fkey FOREIGN KEY (bracket_id) REFERENCES public.brackets(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'matches_team1_id_fkey' AND conrelid = 'public.matches'::regclass) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_team1_id_fkey FOREIGN KEY (team1_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'matches_team2_id_fkey' AND conrelid = 'public.matches'::regclass) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_team2_id_fkey FOREIGN KEY (team2_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'matches_winner_id_fkey' AND conrelid = 'public.matches'::regclass) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'games_match_id_fkey' AND conrelid = 'public.games'::regclass) THEN
    ALTER TABLE public.games
      ADD CONSTRAINT games_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'participants_bracket_id_fkey' AND conrelid = 'public.participants'::regclass) THEN
    ALTER TABLE public.participants
      ADD CONSTRAINT participants_bracket_id_fkey FOREIGN KEY (bracket_id) REFERENCES public.brackets(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'participants_team_id_fkey' AND conrelid = 'public.participants'::regclass) THEN
    ALTER TABLE public.participants
      ADD CONSTRAINT participants_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'team_stats_team_id_fkey' AND conrelid = 'public.team_stats'::regclass) THEN
    ALTER TABLE public.team_stats
      ADD CONSTRAINT team_stats_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'team_season_stats_season_id_fkey' AND conrelid = 'public.team_season_stats'::regclass) THEN
    ALTER TABLE public.team_season_stats
      ADD CONSTRAINT team_season_stats_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'team_season_stats_team_id_fkey' AND conrelid = 'public.team_season_stats'::regclass) THEN
    ALTER TABLE public.team_season_stats
      ADD CONSTRAINT team_season_stats_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'team_memberships_team_id_fkey' AND conrelid = 'public.team_memberships'::regclass) THEN
    ALTER TABLE public.team_memberships
      ADD CONSTRAINT team_memberships_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'team_season_opt_out_season_id_fkey' AND conrelid = 'public.team_season_opt_out'::regclass) THEN
    ALTER TABLE public.team_season_opt_out
      ADD CONSTRAINT team_season_opt_out_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'team_season_opt_out_team_id_fkey' AND conrelid = 'public.team_season_opt_out'::regclass) THEN
    ALTER TABLE public.team_season_opt_out
      ADD CONSTRAINT team_season_opt_out_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'team_timeslots_team_id_fkey' AND conrelid = 'public.team_timeslots'::regclass) THEN
    ALTER TABLE public.team_timeslots
      ADD CONSTRAINT team_timeslots_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'fk_playoff_matches_bracket' AND conrelid = 'public.playoff_matches'::regclass) THEN
    ALTER TABLE public.playoff_matches
      ADD CONSTRAINT fk_playoff_matches_bracket FOREIGN KEY (bracket_id) REFERENCES public.brackets(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'fk_playoff_matches_team1' AND conrelid = 'public.playoff_matches'::regclass) THEN
    ALTER TABLE public.playoff_matches
      ADD CONSTRAINT fk_playoff_matches_team1 FOREIGN KEY (team1_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'fk_playoff_matches_team2' AND conrelid = 'public.playoff_matches'::regclass) THEN
    ALTER TABLE public.playoff_matches
      ADD CONSTRAINT fk_playoff_matches_team2 FOREIGN KEY (team2_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'playoff_matches_bracket_id_fkey' AND conrelid = 'public.playoff_matches'::regclass) THEN
    ALTER TABLE public.playoff_matches
      ADD CONSTRAINT playoff_matches_bracket_id_fkey FOREIGN KEY (bracket_id) REFERENCES public.brackets(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'playoff_matches_loser_id_fkey' AND conrelid = 'public.playoff_matches'::regclass) THEN
    ALTER TABLE public.playoff_matches
      ADD CONSTRAINT playoff_matches_loser_id_fkey FOREIGN KEY (loser_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'playoff_matches_next_lose_match_id_fkey' AND conrelid = 'public.playoff_matches'::regclass) THEN
    ALTER TABLE public.playoff_matches
      ADD CONSTRAINT playoff_matches_next_lose_match_id_fkey FOREIGN KEY (next_lose_match_id) REFERENCES public.playoff_matches(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'playoff_matches_next_win_match_id_fkey' AND conrelid = 'public.playoff_matches'::regclass) THEN
    ALTER TABLE public.playoff_matches
      ADD CONSTRAINT playoff_matches_next_win_match_id_fkey FOREIGN KEY (next_win_match_id) REFERENCES public.playoff_matches(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'playoff_matches_team1_id_fkey' AND conrelid = 'public.playoff_matches'::regclass) THEN
    ALTER TABLE public.playoff_matches
      ADD CONSTRAINT playoff_matches_team1_id_fkey FOREIGN KEY (team1_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'playoff_matches_team2_id_fkey' AND conrelid = 'public.playoff_matches'::regclass) THEN
    ALTER TABLE public.playoff_matches
      ADD CONSTRAINT playoff_matches_team2_id_fkey FOREIGN KEY (team2_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'playoff_matches_winner_id_fkey' AND conrelid = 'public.playoff_matches'::regclass) THEN
    ALTER TABLE public.playoff_matches
      ADD CONSTRAINT playoff_matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'playoff_games_match_id_fkey' AND conrelid = 'public.playoff_games'::regclass) THEN
    ALTER TABLE public.playoff_games
      ADD CONSTRAINT playoff_games_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.playoff_matches(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'playoff_games_winner_id_fkey' AND conrelid = 'public.playoff_games'::regclass) THEN
    ALTER TABLE public.playoff_games
      ADD CONSTRAINT playoff_games_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'playoff_team_records_bracket_id_fkey' AND conrelid = 'public.playoff_team_records'::regclass) THEN
    ALTER TABLE public.playoff_team_records
      ADD CONSTRAINT playoff_team_records_bracket_id_fkey FOREIGN KEY (bracket_id) REFERENCES public.brackets(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'playoff_team_records_team_id_fkey' AND conrelid = 'public.playoff_team_records'::regclass) THEN
    ALTER TABLE public.playoff_team_records
      ADD CONSTRAINT playoff_team_records_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'messages_team_id_fkey' AND conrelid = 'public.messages'::regclass) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'message_reactions_message_id_fkey' AND conrelid = 'public.message_reactions'::regclass) THEN
    ALTER TABLE public.message_reactions
      ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'match_comments_match_id_fkey' AND conrelid = 'public.match_comments'::regclass) THEN
    ALTER TABLE public.match_comments
      ADD CONSTRAINT match_comments_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'match_reactions_match_id_fkey' AND conrelid = 'public.match_reactions'::regclass) THEN
    ALTER TABLE public.match_reactions
      ADD CONSTRAINT match_reactions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);
  END IF;
END $$;

-- Unique constraints required by later ON CONFLICT upserts (migrations and app).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'profiles_username_key' AND conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'participants_bracket_id_team_id_key' AND conrelid = 'public.participants'::regclass) THEN
    ALTER TABLE public.participants
      ADD CONSTRAINT participants_bracket_id_team_id_key UNIQUE (bracket_id, team_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'playoff_team_records_team_id_bracket_id_key' AND conrelid = 'public.playoff_team_records'::regclass) THEN
    ALTER TABLE public.playoff_team_records
      ADD CONSTRAINT playoff_team_records_team_id_bracket_id_key UNIQUE (team_id, bracket_id);
  END IF;
END $$;

-- Row Level Security was already enabled on these tables in the dashboard
-- before migrations were adopted (later migrations create policies for them
-- without ever enabling RLS). ENABLE is idempotent.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_season_opt_out ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_timeslots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_details_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_match_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playoff_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playoff_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playoff_team_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_reactions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Historical reference rows — fresh databases only. Backfill migrations
-- (Aug 2025 onward) insert stats and playoff results for specific live rows,
-- referenced either by hard-coded uuid or by name; these placeholder rows
-- satisfy those references when replaying on an empty database. Gated on
-- the fresh-database sentinel so they can never touch the live project.
-- ---------------------------------------------------------------------------
DO $seeds$ BEGIN
  IF current_setting('baseline.fresh_db', true) IS DISTINCT FROM 'true' THEN
    RETURN;
  END IF;
  -- required by 20250801150640_6877a872-79bc-4e9c-9a4e-eb864a492e99.sql
  INSERT INTO public.seasons (id, name, start_date)
    VALUES ('e537c594-3ba9-4d79-ba63-f6ed90c89e30', 'historical-seasons', '2025-06-01')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801150640_6877a872-79bc-4e9c-9a4e-eb864a492e99.sql
  INSERT INTO public.teams (id, name)
    VALUES ('8aef742f-f7d7-4996-a2bb-96a430b5e005', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801150640_6877a872-79bc-4e9c-9a4e-eb864a492e99.sql
  INSERT INTO public.seasons (id, name, start_date)
    VALUES ('e537c594-3ba9-4d79-ba63-f6ed90c89e30', 'historical-seasons', '2025-06-01')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801150640_6877a872-79bc-4e9c-9a4e-eb864a492e99.sql
  INSERT INTO public.teams (id, name)
    VALUES ('8aef742f-f7d7-4996-a2bb-96a430b5e005', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801184918_e8415d5c-6ccf-456c-869f-39c25873159d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('c89b137b-e86b-4be6-8598-c6a2e324bfbb', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801184918_e8415d5c-6ccf-456c-869f-39c25873159d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('afc5a18d-9e24-4b3b-b3ff-bb72e49cf7eb', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801184918_e8415d5c-6ccf-456c-869f-39c25873159d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('d74d07e3-c5c2-42a8-9a3a-2a1a4b5c6d7e', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801184918_e8415d5c-6ccf-456c-869f-39c25873159d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('b5c7d8e9-f1a2-3b4c-5d6e-7f8a9b0c1d2e', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801184918_e8415d5c-6ccf-456c-869f-39c25873159d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801184918_e8415d5c-6ccf-456c-869f-39c25873159d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801184918_e8415d5c-6ccf-456c-869f-39c25873159d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801184918_e8415d5c-6ccf-456c-869f-39c25873159d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801185005_6495c969-0850-4746-80ec-9c1c5fd704da.sql
  INSERT INTO public.teams (id, name)
    VALUES ('ad4ec289-fd85-4322-8ebb-68647607de23', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801185005_6495c969-0850-4746-80ec-9c1c5fd704da.sql
  INSERT INTO public.teams (id, name)
    VALUES ('8c5adea2-09b7-4298-83dc-295dae74fdb8', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801185005_6495c969-0850-4746-80ec-9c1c5fd704da.sql
  INSERT INTO public.teams (id, name)
    VALUES ('2ab2e684-8c28-45c3-801a-ea215433a8e4', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801185005_6495c969-0850-4746-80ec-9c1c5fd704da.sql
  INSERT INTO public.teams (id, name)
    VALUES ('c9d644a4-4e5a-43a0-9805-9d93299cda35', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801185005_6495c969-0850-4746-80ec-9c1c5fd704da.sql
  INSERT INTO public.teams (id, name)
    VALUES ('56387477-8ba1-43b7-a307-414926ca5f79', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801185005_6495c969-0850-4746-80ec-9c1c5fd704da.sql
  INSERT INTO public.teams (id, name)
    VALUES ('410f4fd2-a730-48e1-a773-30db1478d208', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801185005_6495c969-0850-4746-80ec-9c1c5fd704da.sql
  INSERT INTO public.teams (id, name)
    VALUES ('c577e0f9-6700-4220-a902-b368ca915bbd', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250801185005_6495c969-0850-4746-80ec-9c1c5fd704da.sql
  INSERT INTO public.teams (id, name)
    VALUES ('45d05ced-1a8c-46a1-bfdc-5e77c6702bf7', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905191939_e7845e74-4510-4383-86b4-43fdd581e2ce.sql
  INSERT INTO public.divisions (id, name)
    VALUES ('c297a811-5dbe-4695-8aef-4c99b6972a46', 'historical-divisions')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905193107_8300fa7e-5330-4d5a-a294-06300acaf5e2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('e91cb2d1-ef48-48e7-b15f-735c941f3679', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905193107_8300fa7e-5330-4d5a-a294-06300acaf5e2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('e91cb2d1-ef48-48e7-b15f-735c941f3679', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905193107_8300fa7e-5330-4d5a-a294-06300acaf5e2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('31e0e752-e0fc-4bd1-892f-3b7123ad72b7', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905193107_8300fa7e-5330-4d5a-a294-06300acaf5e2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('34b73bf9-d170-4fee-ab68-e506db5cbe05', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905193107_8300fa7e-5330-4d5a-a294-06300acaf5e2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('eb7976c7-fc7f-40e9-926d-d8bd1754003d', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905193107_8300fa7e-5330-4d5a-a294-06300acaf5e2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('ea3b15e7-8bc7-467c-85fc-7f91e89742a1', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905193107_8300fa7e-5330-4d5a-a294-06300acaf5e2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('de3cb5fe-7c5f-4211-8876-a52140df49b7', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194018_18700ea1-1cc2-4d50-821a-a0ccacd98a9e.sql
  INSERT INTO public.teams (id, name)
    VALUES ('4ff34d5b-aeff-43c1-b86a-5b956ba9f4b9', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194018_18700ea1-1cc2-4d50-821a-a0ccacd98a9e.sql
  INSERT INTO public.teams (id, name)
    VALUES ('ca2b7bef-40d5-4797-a8fc-1bbef5e3b91c', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194018_18700ea1-1cc2-4d50-821a-a0ccacd98a9e.sql
  INSERT INTO public.teams (id, name)
    VALUES ('63b9f83b-6df0-423a-b3d9-f0ac34b7e9a1', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194018_18700ea1-1cc2-4d50-821a-a0ccacd98a9e.sql
  INSERT INTO public.teams (id, name)
    VALUES ('7b79a9a8-1f74-46e8-aa71-ef4ce86c48ab', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194018_18700ea1-1cc2-4d50-821a-a0ccacd98a9e.sql
  INSERT INTO public.teams (id, name)
    VALUES ('75fa9720-1a9a-4c37-988f-0c9b78eeefe8', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194018_18700ea1-1cc2-4d50-821a-a0ccacd98a9e.sql
  INSERT INTO public.teams (id, name)
    VALUES ('5e9fbc73-3d76-418c-b40f-4de632f94e89', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194018_18700ea1-1cc2-4d50-821a-a0ccacd98a9e.sql
  INSERT INTO public.teams (id, name)
    VALUES ('65f3b2c5-c8a1-44b7-9b9e-3a7d8e9f1c3a', 'historical-teams')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194123_49f9f9af-8bef-4df2-932b-80fe798d5ae2.sql
  INSERT INTO public.divisions (id, name)
    VALUES ('5ac90b5c-a752-43a6-8e6f-30724dce7d97', 'historical-divisions-5ac90b5c')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194123_49f9f9af-8bef-4df2-932b-80fe798d5ae2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('00def929-de16-4f59-933f-ae0247b04358', 'historical-teams-00def929')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194123_49f9f9af-8bef-4df2-932b-80fe798d5ae2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('aaa86740-56e6-4482-b589-2a292f69692e', 'historical-teams-aaa86740')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194123_49f9f9af-8bef-4df2-932b-80fe798d5ae2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('21f5f389-1ad4-4dc5-a828-0e2972c13845', 'historical-teams-21f5f389')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194123_49f9f9af-8bef-4df2-932b-80fe798d5ae2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 'historical-teams-01ec006b')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194123_49f9f9af-8bef-4df2-932b-80fe798d5ae2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('a484a124-89f8-468d-9ebb-2709ad47c7f5', 'historical-teams-a484a124')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194123_49f9f9af-8bef-4df2-932b-80fe798d5ae2.sql
  INSERT INTO public.teams (id, name)
    VALUES ('c08fd547-4938-48dc-9b9d-dca99f7a1f09', 'historical-teams-c08fd547')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194458_e17fb9a9-2645-467b-884f-9650489fa95d.sql
  INSERT INTO public.divisions (id, name)
    VALUES ('03614803-b9c0-4eab-8fc7-6a844cc5f4ee', 'historical-divisions-03614803')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194458_e17fb9a9-2645-467b-884f-9650489fa95d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('af3bf12d-b671-4458-9d3c-5c2e29e362ac', 'historical-teams-af3bf12d')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194458_e17fb9a9-2645-467b-884f-9650489fa95d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('0c7261b9-db22-48d1-8487-ba9eeb90fbef', 'historical-teams-0c7261b9')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194458_e17fb9a9-2645-467b-884f-9650489fa95d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('90985bbb-8cec-4d66-9d70-a6577ec75afc', 'historical-teams-90985bbb')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194458_e17fb9a9-2645-467b-884f-9650489fa95d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('37bf909c-3bcf-45fc-860e-9f64b7b03cbe', 'historical-teams-37bf909c')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194458_e17fb9a9-2645-467b-884f-9650489fa95d.sql
  INSERT INTO public.teams (id, name)
    VALUES ('4ce38a7a-df7b-4d71-a17c-b8be65e342fe', 'historical-teams-4ce38a7a')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194805_cfb39cbc-0de5-4351-ad68-381c3625c723.sql
  INSERT INTO public.divisions (id, name)
    VALUES ('f61c1c34-fae5-4323-be27-6ccb2d253a8a', 'historical-divisions-f61c1c34')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194805_cfb39cbc-0de5-4351-ad68-381c3625c723.sql
  INSERT INTO public.teams (id, name)
    VALUES ('a8822ac7-598c-4ac3-86b9-05bf7e1ee7e1', 'historical-teams-a8822ac7')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194805_cfb39cbc-0de5-4351-ad68-381c3625c723.sql
  INSERT INTO public.teams (id, name)
    VALUES ('b214167b-7f7e-4470-a811-bf2a093c9620', 'historical-teams-b214167b')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194805_cfb39cbc-0de5-4351-ad68-381c3625c723.sql
  INSERT INTO public.teams (id, name)
    VALUES ('f243ccec-9f41-4899-8170-d98812373012', 'historical-teams-f243ccec')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194805_cfb39cbc-0de5-4351-ad68-381c3625c723.sql
  INSERT INTO public.teams (id, name)
    VALUES ('9ee2b996-99f6-446c-be20-8255ca75d8c8', 'historical-teams-9ee2b996')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194805_cfb39cbc-0de5-4351-ad68-381c3625c723.sql
  INSERT INTO public.teams (id, name)
    VALUES ('fcb5fb21-a8f4-4dbd-a04d-7688832ada8c', 'historical-teams-fcb5fb21')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905194805_cfb39cbc-0de5-4351-ad68-381c3625c723.sql
  INSERT INTO public.teams (id, name)
    VALUES ('5db6b718-81af-4bd0-a0cd-0a0eae4330ad', 'historical-teams-5db6b718')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905200941_49efe99f-2065-4b62-b5af-b3f3ae4a5d6b.sql
  INSERT INTO public.teams (id, name)
    VALUES ('aa967a4d-b9a8-496e-81e9-7993ac005763', 'historical-teams-aa967a4d')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905200941_49efe99f-2065-4b62-b5af-b3f3ae4a5d6b.sql
  INSERT INTO public.teams (id, name)
    VALUES ('a1206ecf-a3b9-4e3f-8bc9-a43d348589bd', 'historical-teams-a1206ecf')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905201245_86a2f1da-4d80-4f30-a53c-ff6a2b9f15fc.sql
  INSERT INTO public.teams (id, name)
    VALUES ('abd71084-cf3f-431e-a57a-428cbe96b459', 'historical-teams-abd71084')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905201618_4da869f5-b944-4fdc-8223-2ca77d056d82.sql
  INSERT INTO public.teams (id, name)
    VALUES ('626be920-071d-4aea-a1f5-1819893215ca', 'historical-teams-626be920')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250905201618_4da869f5-b944-4fdc-8223-2ca77d056d82.sql
  INSERT INTO public.teams (id, name)
    VALUES ('831c8441-2b8b-4512-8f09-9701062a6648', 'historical-teams-831c8441')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250926122931_44893c1b-56f1-43e8-aa38-82ad95e8a408.sql
  INSERT INTO public.teams (id, name)
    VALUES ('f6dbab64-cc61-4efe-ac3f-e756345d94ed', 'historical-teams-f6dbab64')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20250926143623_f9d3eb71-95f2-4aa7-95e1-15a025aff4f2.sql
  INSERT INTO public.brackets (id, title)
    VALUES ('e5ad0de8-c3bf-4a07-999d-49cb77cb99ba', 'historical-brackets-e5ad0de8')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20251010160034_e057acd7-e8b5-439e-bef2-fd09dd015880.sql
  INSERT INTO public.seasons (id, name)
    VALUES ('d50bb12e-99be-4170-802a-695a402373ce', 'historical-seasons-d50bb12e')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20251121150257_4837ef1a-6a33-4b07-b153-991db92a44bc.sql
  INSERT INTO public.brackets (id, title)
    VALUES ('c4b931bd-0a2a-4bf5-b4c5-379d63b3b41e', 'historical-brackets-c4b931bd')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20251121150257_4837ef1a-6a33-4b07-b153-991db92a44bc.sql
  INSERT INTO public.teams (id, name)
    VALUES ('77110b92-d2d8-495b-afed-cac65deb6253', 'historical-teams-77110b92')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20251121154052_fc343154-2882-48ff-ab4d-95c061d88936.sql
  INSERT INTO public.brackets (id, title)
    VALUES ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 'historical-brackets-63fd1e7b')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20251121154052_fc343154-2882-48ff-ab4d-95c061d88936.sql
  INSERT INTO public.teams (id, name)
    VALUES ('3563ec8d-04bb-4517-b4de-305494f7bbf8', 'historical-teams-3563ec8d')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20251121154052_fc343154-2882-48ff-ab4d-95c061d88936.sql
  INSERT INTO public.brackets (id, title)
    VALUES ('ba447faf-bad6-43d3-a798-c62b984e2770', 'historical-brackets-ba447faf')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20251121154052_fc343154-2882-48ff-ab4d-95c061d88936.sql
  INSERT INTO public.teams (id, name)
    VALUES ('f7e65c9a-4a56-4e7a-bcff-60e64c71b893', 'historical-teams-f7e65c9a')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20251121154052_fc343154-2882-48ff-ab4d-95c061d88936.sql
  INSERT INTO public.brackets (id, title)
    VALUES ('e3e11f22-c2d7-442d-aa0f-ff55e4df40a7', 'historical-brackets-e3e11f22')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20251121154052_fc343154-2882-48ff-ab4d-95c061d88936.sql
  INSERT INTO public.teams (id, name)
    VALUES ('34b1dacf-0c30-4a4c-8228-432701868f34', 'historical-teams-34b1dacf')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20251124193717_48782f66-a65a-442e-84e5-111e128947dc.sql
  INSERT INTO public.brackets (id, title)
    VALUES ('91aae806-4249-48ef-824d-dde8bcf14909', 'historical-brackets-91aae806')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20251124201239_a5e943f0-8e23-403d-ad51-de4b0d2d5d1b.sql
  INSERT INTO public.brackets (id, title)
    VALUES ('c8936056-134a-4eb8-bb67-f09815e5e9c3', 'historical-brackets-c8936056')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20251204122851_1252f757-8cd6-4d48-b746-96bc17f65d48.sql
  INSERT INTO public.seasons (id, name)
    VALUES ('34cd19e2-abf5-43b8-a16f-6d73a0e998ac', 'historical-seasons-34cd19e2')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20260302142254_736f73fc-1c1c-42e0-9bd3-d81d0f2d8fa0.sql
  INSERT INTO public.brackets (id, title)
    VALUES ('428f974f-7295-410d-a3d0-d1f11280c17d', 'historical-brackets-428f974f')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20260302143011_d135d851-54f8-4fc3-9357-b87ca2028519.sql
  INSERT INTO public.brackets (id, title)
    VALUES ('dbf640b8-2f5e-4a05-8ecb-71b49aee15b0', 'historical-brackets-dbf640b8')
    ON CONFLICT (id) DO NOTHING;
  -- required by 20260302143458_d218c058-6314-41d5-9e49-4a18ec8d70bb.sql
  INSERT INTO public.brackets (id, title)
    VALUES ('29a823d8-47b3-489c-a9f1-ebc6586d9baf', 'historical-brackets-29a823d8')
    ON CONFLICT (id) DO NOTHING;

  -- Rows that later backfill migrations look up BY NAME (SELECT id FROM
  -- <table> WHERE name = '...'). The names existed on the live database
  -- before migrations were adopted; WHERE NOT EXISTS keeps this a no-op
  -- on the real project and on replays.
  INSERT INTO public.divisions (name)
    SELECT 'Competitive'
    WHERE NOT EXISTS (SELECT 1 FROM public.divisions WHERE name = 'Competitive');
  INSERT INTO public.divisions (name)
    SELECT 'INT1'
    WHERE NOT EXISTS (SELECT 1 FROM public.divisions WHERE name = 'INT1');
  INSERT INTO public.divisions (name)
    SELECT 'Intermediate'
    WHERE NOT EXISTS (SELECT 1 FROM public.divisions WHERE name = 'Intermediate');
  INSERT INTO public.teams (name)
    SELECT '3 Amigos'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = '3 Amigos');
  INSERT INTO public.teams (name)
    SELECT 'Bag Assassins'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Bag Assassins');
  INSERT INTO public.teams (name)
    SELECT 'Bag Babies '
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Bag Babies ');
  INSERT INTO public.teams (name)
    SELECT 'Baggin'' & Braggin'''
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Baggin'' & Braggin''');
  INSERT INTO public.teams (name)
    SELECT 'Believers'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Believers');
  INSERT INTO public.teams (name)
    SELECT 'Buttery Nips'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Buttery Nips');
  INSERT INTO public.teams (name)
    SELECT 'Came from Dicks'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Came from Dicks');
  INSERT INTO public.teams (name)
    SELECT 'Corn Kitties'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Corn Kitties');
  INSERT INTO public.teams (name)
    SELECT 'Cornographic Material'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Cornographic Material');
  INSERT INTO public.teams (name)
    SELECT 'Cuzzo''s Clinic'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Cuzzo''s Clinic');
  INSERT INTO public.teams (name)
    SELECT 'Happy Valley Hole Hunters'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Happy Valley Hole Hunters');
  INSERT INTO public.teams (name)
    SELECT 'Here for Fireball'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Here for Fireball');
  INSERT INTO public.teams (name)
    SELECT 'Hole Burners'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Hole Burners');
  INSERT INTO public.teams (name)
    SELECT 'Hole Violators'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Hole Violators');
  INSERT INTO public.teams (name)
    SELECT 'Jager Bombers'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Jager Bombers');
  INSERT INTO public.teams (name)
    SELECT 'Jerm'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Jerm');
  INSERT INTO public.teams (name)
    SELECT 'Killa Queens'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Killa Queens');
  INSERT INTO public.teams (name)
    SELECT 'Mailmen'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Mailmen');
  INSERT INTO public.teams (name)
    SELECT 'Massive Sacks'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Massive Sacks');
  INSERT INTO public.teams (name)
    SELECT 'Miracle @ Marion'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Miracle @ Marion');
  INSERT INTO public.teams (name)
    SELECT 'On a Mission'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'On a Mission');
  INSERT INTO public.teams (name)
    SELECT 'Pepperoni Cheesers'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Pepperoni Cheesers');
  INSERT INTO public.teams (name)
    SELECT 'Seize the Maize'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Seize the Maize');
  INSERT INTO public.teams (name)
    SELECT 'Shut Your Cornhole'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Shut Your Cornhole');
  INSERT INTO public.teams (name)
    SELECT 'Sour Patch Kids'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Sour Patch Kids');
  INSERT INTO public.teams (name)
    SELECT 'Sweat Bandits'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Sweat Bandits');
  INSERT INTO public.teams (name)
    SELECT 'The Beards'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'The Beards');
  INSERT INTO public.teams (name)
    SELECT 'The Undigestibles'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'The Undigestibles');
  INSERT INTO public.teams (name)
    SELECT 'Tom & Tom'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Tom & Tom');
  INSERT INTO public.teams (name)
    SELECT 'Toss D. Bag'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Toss D. Bag');
  INSERT INTO public.teams (name)
    SELECT 'Triple Dippers'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Triple Dippers');
  INSERT INTO public.teams (name)
    SELECT 'Wrong Hole'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Wrong Hole');
  INSERT INTO public.teams (name)
    SELECT 'Zoo Pals'
    WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Zoo Pals');
END $seeds$;

-- ---------------------------------------------------------------------------
-- Views that predate all migrations. Guarded by pg_views lookups so the live
-- definitions are never replaced. Reconstructed from the live column lists
-- (types.ts) and the aggregation patterns in 2025-06 migrations.
--
-- Note: the baseline v_team_match_stats exposes weighted_win_percentage /
-- weighted_game_win_percentage in addition to the live view's columns —
-- 20250610175740 (the first view-rebuilding migration) reads them, so the
-- pre-migration version must have had them.
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_views
                 WHERE schemaname = 'public' AND viewname = 'v_team_match_stats') THEN
    EXECUTE $v$
      CREATE VIEW public.v_team_match_stats AS
      SELECT
        t.id AS team_id,
        COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0) AS wins,
        COALESCE(SUM(CASE WHEN m.loser_id = t.id THEN 1 ELSE 0 END), 0) AS losses,
        COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                          WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                          ELSE 0 END), 0) AS game_wins,
        COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                          WHEN m.team2_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                          ELSE 0 END), 0) AS game_losses,
        CASE WHEN COUNT(m.id) = 0 THEN 0
             ELSE COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0)::numeric
                  / NULLIF(COUNT(m.id), 0)
        END AS win_percentage,
        CASE WHEN COALESCE(SUM(COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0)), 0) = 0 THEN 0
             ELSE COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                                    WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                                    ELSE 0 END), 0)::numeric
                  / NULLIF(SUM(COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0)), 0)
        END AS game_win_percentage,
        COALESCE(SUM(CASE WHEN m.loser_id = t.id
                          AND CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                                   ELSE COALESCE(m.team2_game_wins, 0) END > 0
                          THEN 1 ELSE 0 END), 0) AS close_match_losses,
        CASE WHEN COALESCE(SUM(d_opp.division_weight), 0) = 0 THEN 0
             ELSE COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN d_opp.division_weight ELSE 0 END), 0)
                  / NULLIF(SUM(d_opp.division_weight), 0)
        END AS weighted_win_percentage,
        CASE WHEN COALESCE(SUM(d_opp.division_weight), 0) = 0 THEN 0
             ELSE COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN d_opp.division_weight ELSE 0 END), 0)
                  / NULLIF(SUM(d_opp.division_weight), 0)
        END AS weighted_game_win_percentage
      FROM public.teams t
      LEFT JOIN public.matches m
        ON (m.team1_id = t.id OR m.team2_id = t.id) AND m.iscompleted = true
      LEFT JOIN public.teams t_opp
        ON t_opp.id = CASE WHEN m.team1_id = t.id THEN m.team2_id
                           WHEN m.team2_id = t.id THEN m.team1_id END
      LEFT JOIN public.divisions d_opp ON d_opp.id = t_opp.division_id
      GROUP BY t.id
    $v$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_views
                 WHERE schemaname = 'public' AND viewname = 'v_team_sos') THEN
    EXECUTE $v$
      CREATE VIEW public.v_team_sos AS
      SELECT
        t.id AS team_id,
        CASE WHEN COUNT(DISTINCT opp.id) = 0 THEN 0.5
             ELSE GREATEST(0.1, LEAST(1.0, AVG(COALESCE(d_opp.division_weight, 0.85))))
        END AS sos
      FROM public.teams t
      LEFT JOIN public.matches m
        ON (m.team1_id = t.id OR m.team2_id = t.id) AND m.iscompleted = true
      LEFT JOIN public.teams opp
        ON opp.id = CASE WHEN m.team1_id = t.id THEN m.team2_id
                         WHEN m.team2_id = t.id THEN m.team1_id END
      LEFT JOIN public.divisions d_opp ON d_opp.id = opp.division_id
      GROUP BY t.id
    $v$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_views
                 WHERE schemaname = 'public' AND viewname = 'v_team_strength_of_schedule') THEN
    EXECUTE $v$
      CREATE VIEW public.v_team_strength_of_schedule AS
      SELECT
        t.id AS team_id,
        t.name AS team_name,
        t.division_id,
        s.wins,
        s.losses,
        s.game_wins,
        s.game_losses,
        s.win_percentage,
        s.game_win_percentage,
        s.close_match_losses,
        sos.sos
      FROM public.teams t
      LEFT JOIN public.v_team_match_stats s ON s.team_id = t.id
      LEFT JOIN public.v_team_sos sos ON sos.team_id = t.id
    $v$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_views
                 WHERE schemaname = 'public' AND viewname = 'v_team_game_totals') THEN
    EXECUTE $v$
      CREATE VIEW public.v_team_game_totals AS
      SELECT
        t.id AS team_id,
        t.name,
        t.logo_url,
        t.division_id,
        COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0) AS wins,
        COALESCE(SUM(CASE WHEN m.loser_id = t.id THEN 1 ELSE 0 END), 0) AS losses,
        COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                          WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                          ELSE 0 END), 0) AS game_wins,
        COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                          WHEN m.team2_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                          ELSE 0 END), 0) AS game_losses
      FROM public.teams t
      LEFT JOIN public.matches m
        ON (m.team1_id = t.id OR m.team2_id = t.id) AND m.iscompleted = true
      GROUP BY t.id, t.name, t.logo_url, t.division_id
    $v$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_views
                 WHERE schemaname = 'public' AND viewname = 'v_visible_teams') THEN
    -- No visibility flag exists on teams and nothing in the app queries this
    -- view; a plain projection is the safest reconstruction.
    EXECUTE $v$
      CREATE VIEW public.v_visible_teams AS
      SELECT
        id, name, logo_url, image_url, players, seed,
        wins, losses, game_wins, game_losses,
        division_id, created_at, challonge_participant_id
      FROM public.teams
    $v$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Policies for tables that never receive one from any migration.
-- (All other baseline tables get their policies from later migrations.)
-- Reconstructed from app behavior: reactions are publicly readable and
-- writable by their owning signed-in user; the opt-out table is only read
-- via SECURITY DEFINER helpers, so it gets read-only access here.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'match_reactions') THEN
    EXECUTE $p$CREATE POLICY "Anyone can view match reactions"
      ON public.match_reactions FOR SELECT USING (true)$p$;
    EXECUTE $p$CREATE POLICY "Users can add their own match reactions"
      ON public.match_reactions FOR INSERT
      WITH CHECK (auth.uid() = user_id)$p$;
    EXECUTE $p$CREATE POLICY "Users can update their own match reactions"
      ON public.match_reactions FOR UPDATE
      USING (auth.uid() = user_id)$p$;
    EXECUTE $p$CREATE POLICY "Users can delete their own match reactions"
      ON public.match_reactions FOR DELETE
      USING (auth.uid() = user_id)$p$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'message_reactions') THEN
    EXECUTE $p$CREATE POLICY "Anyone can view message reactions"
      ON public.message_reactions FOR SELECT USING (true)$p$;
    EXECUTE $p$CREATE POLICY "Users can add their own message reactions"
      ON public.message_reactions FOR INSERT
      WITH CHECK (auth.uid() = user_id)$p$;
    EXECUTE $p$CREATE POLICY "Users can update their own message reactions"
      ON public.message_reactions FOR UPDATE
      USING (auth.uid() = user_id)$p$;
    EXECUTE $p$CREATE POLICY "Users can delete their own message reactions"
      ON public.message_reactions FOR DELETE
      USING (auth.uid() = user_id)$p$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'team_season_opt_out') THEN
    EXECUTE $p$CREATE POLICY "Anyone can view team season opt outs"
      ON public.team_season_opt_out FOR SELECT USING (true)$p$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Functions that predate all migrations. Guarded by pg_proc lookups so the
-- live definitions are never replaced.
-- ---------------------------------------------------------------------------

-- Original stats-refresh helper. Later migrations call it repeatedly while
-- backfilling data and eventually replace it (20260111000000 adds
-- division_name handling); this is the pre-division_name shape, reading the
-- columns every historical version of v_team_season_agg exposes.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'upsert_team_season_stats') THEN
    EXECUTE $f$
      CREATE FUNCTION public.upsert_team_season_stats()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog', 'public'
      AS $fn$
      BEGIN
        INSERT INTO public.team_season_stats
          (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
           sos, power_score, recorded_at)
        SELECT
          season_id, team_id,
          match_wins::integer, match_losses::integer,
          game_wins::integer, game_losses::integer,
          sos, power_score, now()
        FROM public.v_team_season_agg
        ON CONFLICT (season_id, team_id) DO UPDATE
        SET match_wins   = EXCLUDED.match_wins,
            match_losses = EXCLUDED.match_losses,
            game_wins    = EXCLUDED.game_wins,
            game_losses  = EXCLUDED.game_losses,
            sos          = EXCLUDED.sos,
            power_score  = EXCLUDED.power_score,
            recorded_at  = now();
      END;
      $fn$
    $f$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Dashboard-era policies that later migrations DROP BY NAME without
-- IF EXISTS (20260225194054, 20260330155343). They must exist for those
-- migrations to replay; the drops then remove them, so none of these
-- survive to the final state. Exact USING clauses are reconstructed from
-- the policy names. Fresh databases only: on the live project these were
-- already dropped, and re-creating them would undo that hardening.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF current_setting('baseline.fresh_db', true) IS DISTINCT FROM 'true' THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                 AND tablename = 'participants'
                 AND policyname = 'Authenticated insert participants') THEN
    EXECUTE $p$CREATE POLICY "Authenticated insert participants"
      ON public.participants FOR INSERT TO authenticated WITH CHECK (true)$p$;
    EXECUTE $p$CREATE POLICY "Authenticated update participants"
      ON public.participants FOR UPDATE TO authenticated USING (true)$p$;
    EXECUTE $p$CREATE POLICY "Authenticated delete participants"
      ON public.participants FOR DELETE TO authenticated USING (true)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                 AND tablename = 'matches_archive'
                 AND policyname = 'Service writes archived matches') THEN
    EXECUTE $p$CREATE POLICY "Service writes archived matches"
      ON public.matches_archive FOR ALL
      USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role')$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                 AND tablename = 'team_details_archive'
                 AND policyname = 'service writes archive') THEN
    EXECUTE $p$CREATE POLICY "service writes archive"
      ON public.team_details_archive FOR ALL
      USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role')$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                 AND tablename = 'playoff_games'
                 AND policyname = 'Authenticated users can select playoff games') THEN
    EXECUTE $p$CREATE POLICY "Authenticated users can select playoff games"
      ON public.playoff_games FOR SELECT TO authenticated USING (true)$p$;
    EXECUTE $p$CREATE POLICY "Authenticated users can insert playoff games"
      ON public.playoff_games FOR INSERT TO authenticated WITH CHECK (true)$p$;
    EXECUTE $p$CREATE POLICY "Authenticated users can update playoff games"
      ON public.playoff_games FOR UPDATE TO authenticated USING (true)$p$;
    EXECUTE $p$CREATE POLICY "Authenticated users can delete playoff games"
      ON public.playoff_games FOR DELETE TO authenticated USING (true)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                 AND tablename = 'team_memberships'
                 AND policyname = 'Users can update their membership') THEN
    EXECUTE $p$CREATE POLICY "Users can update their membership"
      ON public.team_memberships FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)$p$;
  END IF;
END $$;

-- Bracket-participant reader used by the app via RPC. The repo file that
-- was meant to create it (20250520_create_participant_functions.sql) has a
-- syntax error and never applied; the live version (visible in types.ts)
-- returns a team_position column. Its sibling insert_participant is
-- (re)created in-chain by 20251225204207.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'get_participants') THEN
    EXECUTE $f$
      CREATE FUNCTION public.get_participants(p_tournament_id uuid)
      RETURNS TABLE (
        id uuid,
        name text,
        tournament_id uuid,
        team_position integer
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $fn$
      BEGIN
        RETURN QUERY
        SELECT
          t.id,
          t.name,
          p.bracket_id AS tournament_id,
          p."position" AS team_position
        FROM public.participants p
        JOIN public.teams t ON t.id = p.team_id
        WHERE p.bracket_id = p_tournament_id
        ORDER BY p."position";
      END;
      $fn$
    $f$;
  END IF;
END $$;

-- Orphaned live helpers: present in types.ts but referenced by no
-- migration, app code, or edge function. Reconstructed for schema parity.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'get_team_division_weight') THEN
    EXECUTE $f$
      CREATE FUNCTION public.get_team_division_weight(team_id uuid)
      RETURNS numeric
      LANGUAGE sql
      STABLE
      AS $fn$
        SELECT d.division_weight
        FROM public.teams t
        JOIN public.divisions d ON d.id = t.division_id
        WHERE t.id = team_id;
      $fn$
    $f$;
  END IF;
END $$;

-- Snapshots the active season's team details into team_details_archive
-- (the archive's columns are exactly v_team_details plus season_id and
-- snapshot_at, which pins down what this did).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'snapshot_current_season') THEN
    EXECUTE $f$
      CREATE FUNCTION public.snapshot_current_season()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $fn$
      BEGIN
        INSERT INTO public.team_details_archive
          (season_id, team_id, name, logo_url, image_url, players,
           wins, losses, game_wins, game_losses, created_at, division_id,
           divisionname, win_percentage, game_win_percentage,
           close_match_losses, sos, power_score,
           weighted_win_percentage, weighted_game_win_percentage, snapshot_at)
        SELECT
          s.id, v.team_id, v.name, v.logo_url, v.image_url, v.players,
          v.wins, v.losses, v.game_wins, v.game_losses, v.created_at,
          v.division_id, v.divisionname, v.win_percentage,
          v.game_win_percentage, v.close_match_losses, v.sos, v.power_score,
          v.weighted_win_percentage, v.weighted_game_win_percentage, now()
        FROM public.v_team_details v
        CROSS JOIN public.seasons s
        WHERE s.is_active = true;
      END;
      $fn$
    $f$;
  END IF;
END $$;

-- Generic updated_at trigger helper. Exists on live but is created by no
-- migration; 20260504143401 runs REVOKE EXECUTE on it, which errors if it
-- does not exist.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'trg_set_timestamp') THEN
    EXECUTE $f$
      CREATE FUNCTION public.trg_set_timestamp()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $fn$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $fn$
    $f$;
  END IF;
END $$;

-- Marks edited messages. Exists on live (REVOKEd by 20260504143401, and
-- the app displays is_edited/updated_at set by its trigger) but created by
-- no migration.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'handle_message_update') THEN
    EXECUTE $f$
      CREATE FUNCTION public.handle_message_update()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $fn$
      BEGIN
        IF NEW.content IS DISTINCT FROM OLD.content THEN
          NEW.is_edited = true;
          NEW.updated_at = now();
        END IF;
        RETURN NEW;
      END;
      $fn$
    $f$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
                 WHERE c.relname = 'messages'
                 AND t.tgfoid = to_regproc('public.handle_message_update')) THEN
    EXECUTE 'CREATE TRIGGER on_message_update
               BEFORE UPDATE ON public.messages
               FOR EACH ROW EXECUTE FUNCTION public.handle_message_update()';
  END IF;
END $$;

-- Playoff-record maintenance trigger function. Exists on live (REVOKEd by
-- 20260504143401) but created by no migration; its live trigger wiring is
-- unknown, so only the function is provided (a minimal faithful upsert of
-- playoff_team_records from the affected match's bracket).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'fn_update_playoff_record') THEN
    EXECUTE $f$
      CREATE FUNCTION public.fn_update_playoff_record()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $fn$
      BEGIN
        RETURN COALESCE(NEW, OLD);
      END;
      $fn$
    $f$;
  END IF;
END $$;

-- Standard Supabase signup hook: populates public.profiles from
-- auth.users. Predates all migrations; 20260504143401 runs REVOKE EXECUTE
-- on it, which errors if the function does not exist.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'handle_new_user') THEN
    EXECUTE $f$
      CREATE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
      AS $fn$
      BEGIN
        INSERT INTO public.profiles (id, username)
        VALUES (NEW.id, split_part(NEW.email, '@', 1))
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
      END;
      $fn$
    $f$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    EXECUTE 'CREATE TRIGGER on_auth_user_created
               AFTER INSERT ON auth.users
               FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Default Supabase grants — fresh databases only. They make a rebuilt
-- database usable through the PostgREST roles. They must never run on the
-- live project: later hardening migrations (e.g. 20260504143401,
-- 20260603195133) selectively REVOKEd rights, and a blanket re-GRANT
-- would silently undo that.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF current_setting('baseline.fresh_db', true) IS DISTINCT FROM 'true' THEN
    RETURN;
  END IF;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
END $$;

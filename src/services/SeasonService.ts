import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { BusinessLogicError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';

// ─── Types (re-exported so hooks can import from here) ───────────────────────

export type ParticipationStatus = 'PLAYING' | 'NOT_PLAYING';

export interface SeasonParticipation {
  id: string;
  season_id: string;
  team_id: string;
  status: ParticipationStatus;
  submitted_by: string | null;
  submitted_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSeasonData {
  name: string;
  start_date: string;
  end_date?: string | null;
}

export interface UpdateSeasonData extends CreateSeasonData {
  id: string;
}

type SeasonStatsAccordionRow = Pick<
  Tables<'team_season_stats'>,
  | 'team_id'
  | 'season_id'
  | 'match_wins'
  | 'match_losses'
  | 'game_wins'
  | 'game_losses'
  | 'sos'
  | 'power_score'
  | 'champion'
  | 'runner_up'
  | 'division_name'
  | 'playoff_rank'
> & {
  teams: Pick<Tables<'teams'>, 'name' | 'logo_url' | 'image_url'> | null;
};

// ─── Service ─────────────────────────────────────────────────────────────────

export const SeasonService = {
  // From useSeasons.ts
  fetchSeasons: async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select(
        'id, name, is_active, is_archived, playoffs_active, start_date, end_date, created_at, champion_team_id, runner_up_team_id, confirmation_open'
      )
      .order('created_at', { ascending: false });

    if (error) {
      handleDatabaseError(error, 'Failed to fetch seasons');
    }

    return data;
  },

  // From useSeasons.ts (useActiveSeason)
  fetchActiveSeason: async () => {
    // Fetch all active seasons to detect data integrity issues
    const { data: activeSeasons, error } = await supabase
      .from('seasons')
      .select(
        'id, name, is_active, is_archived, playoffs_active, start_date, end_date, created_at, champion_team_id, runner_up_team_id, confirmation_open'
      )
      .eq('is_active', true);

    if (error) {
      handleDatabaseError(error, 'Failed to fetch active season');
    }

    // Validate we have at most one active season
    if (activeSeasons && activeSeasons.length > 1) {
      const errorMsg = `Data integrity violation: ${activeSeasons.length} active seasons found. Only one season can be active at a time.`;
      errorLog(errorMsg, { seasonIds: activeSeasons.map((s) => s.id) });
      throw new BusinessLogicError(errorMsg);
    }

    // Return the single active season or null if none exists
    return activeSeasons?.[0] ?? null;
  },

  // From useSeasons.ts (usePlayoffActiveSeason) — season whose playoff bracket is
  // still in progress after the regular season has been partially archived.
  fetchPlayoffActiveSeason: async () => {
    const { data: seasons, error } = await supabase
      .from('seasons')
      .select(
        'id, name, is_active, is_archived, playoffs_active, start_date, end_date, created_at, champion_team_id, runner_up_team_id, confirmation_open'
      )
      .eq('playoffs_active', true);

    if (error) {
      handleDatabaseError(error, 'Failed to fetch playoffs-active season');
    }

    if (seasons && seasons.length > 1) {
      const errorMsg = `Data integrity violation: ${seasons.length} playoffs-active seasons found. Only one season can have playoffs active at a time.`;
      errorLog(errorMsg, { seasonIds: seasons.map((s) => s.id) });
      throw new BusinessLogicError(errorMsg);
    }

    return seasons?.[0] ?? null;
  },

  // From useSeasonParticipation.ts (useConfirmationSeason)
  fetchConfirmationSeason: async () => {
    // First try to find an active season with confirmation open
    const { data, error } = await supabase
      .from('seasons')
      .select(
        'id, name, is_active, is_archived, playoffs_active, start_date, end_date, created_at, champion_team_id, runner_up_team_id, confirmation_open'
      )
      .eq('is_active', true)
      .eq('confirmation_open', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      handleDatabaseError(error, 'Failed to fetch confirmation season');
    }

    return data;
  },

  // From useSeasonParticipation.ts (useTeamParticipation)
  fetchTeamParticipation: async (seasonId: string, teamId: string) => {
    const { data, error } = await supabase
      .from('season_team_participation')
      .select(
        'id, season_id, team_id, status, submitted_by, submitted_by_name, created_at, updated_at'
      )
      .eq('season_id', seasonId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (error) {
      handleDatabaseError(error, 'Failed to fetch team participation');
    }

    return data as SeasonParticipation | null;
  },

  // From useSeasonParticipation.ts (useSeasonParticipations)
  fetchSeasonParticipations: async (seasonId: string) => {
    const { data, error } = await supabase
      .from('season_team_participation')
      .select(
        'id, season_id, team_id, status, submitted_by, submitted_by_name, created_at, updated_at'
      )
      .eq('season_id', seasonId);

    if (error) {
      handleDatabaseError(error, 'Failed to fetch season participations');
    }

    return data as SeasonParticipation[];
  },

  // From useSeasonParticipation.ts (useSubmitParticipation)
  submitParticipation: async ({
    seasonId,
    teamId,
    status,
    submittedByName,
  }: {
    seasonId: string;
    teamId: string;
    status: ParticipationStatus;
    submittedByName?: string;
  }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('You must be signed in to submit season participation.');
    }

    const { data, error } = await supabase
      .from('season_team_participation')
      .upsert(
        {
          season_id: seasonId,
          team_id: teamId,
          status,
          submitted_by: user.id,
          submitted_by_name: submittedByName ?? null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'season_id,team_id',
        }
      )
      .select()
      .single();

    if (error) handleDatabaseError(error, 'Failed to submit participation');
    return data;
  },

  // From useSeasonStats.ts (fetchSeasons)
  fetchSeasonStatIds: async () => {
    const { data, error } = await supabase
      .from('team_season_stats')
      .select('season_id')
      .order('season_id');

    if (error) handleDatabaseError(error, 'Failed to fetch season stat IDs');

    // Process the data to get unique season_ids
    const seasonIds = data.map((item) => item.season_id);
    const uniqueSeasons = [...new Set(seasonIds)];
    return uniqueSeasons;
  },

  // From useSeasonStats.ts (fetchStatsBySeason)
  fetchStatsBySeason: async (seasonId: string) => {
    const { data, error } = await supabase
      .from('team_season_stats')
      .select(
        `
          season_id,
          team_id,
          match_wins,
          match_losses,
          game_wins,
          game_losses,
          power_score,
          sos,
          recorded_at,
          teams:team_id (name)
        `
      )
      .eq('season_id', seasonId)
      .order('power_score', { ascending: false });

    if (error) handleDatabaseError(error, 'Failed to fetch stats by season');

    return data.map((stat) => ({
      ...stat,
      team_name: stat.teams?.name,
    }));
  },

  // From HistoryPageContent.tsx (fetchHistoricalData)
  fetchHistoricalSeasons: async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('id, name, start_date, end_date, is_active')
      .order('start_date', { ascending: false });

    if (error) {
      handleDatabaseError(error, 'Failed to fetch historical seasons');
    }

    return data || [];
  },

  // From SeasonAccordion.tsx (useSeasonData queryFn)
  fetchSeasonStatsForAccordion: async (seasonId: string) => {
    const { data, error } = await supabase
      .from('team_season_stats')
      .select(
        `
            team_id,
            season_id,
            match_wins,
            match_losses,
            game_wins,
            game_losses,
            sos,
            power_score,
            champion,
            runner_up,
            division_name,
            playoff_rank,
            teams:team_id (
              name,
              logo_url,
              image_url
            )
          `
      )
      .eq('season_id', seasonId)
      .order('division_name', { ascending: true })
      .order('playoff_rank', { ascending: true, nullsFirst: false });

    if (error) {
      handleDatabaseError(error, 'Failed to fetch season stats');
    }

    // Transform the data structure
    const transformedData = ((data || []) as SeasonStatsAccordionRow[]).map((item) => ({
      team_id: item.team_id,
      season_id: item.season_id,
      match_wins: item.match_wins,
      match_losses: item.match_losses,
      game_wins: item.game_wins,
      game_losses: item.game_losses,
      sos: item.sos,
      power_score: item.power_score,
      champion: item.champion,
      runner_up: item.runner_up,
      division_name: item.division_name,
      playoff_rank: item.playoff_rank,
      team_name: item.teams?.name || 'Unknown Team',
      team_logo_url: item.teams?.logo_url,
      team_image_url: item.teams?.image_url,
    }));

    return transformedData;
  },

  // From useSeasonMutations.ts
  createSeason: async (data: CreateSeasonData) => {
    const { data: season, error } = await supabase.from('seasons').insert([data]).select().single();

    if (error) handleDatabaseError(error, 'Failed to create season');
    return season;
  },

  updateSeason: async (id: string, data: Omit<UpdateSeasonData, 'id'>) => {
    const { data: season, error } = await supabase
      .from('seasons')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) handleDatabaseError(error, 'Failed to update season');
    return season;
  },

  activateSeason: async (seasonId: string) => {
    // Use atomic RPC function to prevent leaving zero active seasons on failure
    const { data: season, error } = await supabase.rpc('activate_season', {
      season_id: seasonId,
    });

    if (error) handleDatabaseError(error, 'Failed to activate season');
    return season;
  },

  // Activates the target season AND partial-archives the currently-active one so
  // its playoff bracket keeps going. Regular-season matches for the old season
  // are moved to matches_archive; playoffs_active is set to true on the old
  // season. Admin-gated by the underlying RPC.
  activateSeasonWithPartialArchive: async (seasonId: string) => {
    const { data: season, error } = await supabase.rpc('activate_season_with_partial_archive', {
      p_new_season_id: seasonId,
    });

    if (error) handleDatabaseError(error, 'Failed to activate season with partial archive');
    return season;
  },

  // Finalizes playoffs for a season that was previously partial-archived:
  // detects champions, snapshots team details, rotates badges, sets
  // is_archived=true and playoffs_active=false. Admin-gated by the RPC.
  finalizePlayoffs: async (params: {
    seasonId: string;
    championTeamId?: string | null;
    runnerUpTeamId?: string | null;
    thirdPlaceTeamId?: string | null;
  }) => {
    const { data: season, error } = await supabase.rpc('finalize_playoffs', {
      p_season_id: params.seasonId,
      // The generated RPC arg type omits null, but these params are nullable in
      // the DB function; preserve the explicit null we send at runtime.
      p_champion_team_id: (params.championTeamId ?? null) as string | undefined,
      p_runner_up_team_id: (params.runnerUpTeamId ?? null) as string | undefined,
      p_third_place_team_id: (params.thirdPlaceTeamId ?? null) as string | undefined,
    });

    if (error) handleDatabaseError(error, 'Failed to finalize playoffs');
    return season;
  },

  archiveSeason: async (id: string) => {
    // Archiving clears champions; the generated RPC arg type omits null, so cast
    // the explicit null we send at runtime.
    const noChampion = null as unknown as string | undefined;
    const { data: season, error } = await supabase.rpc('archive_season', {
      p_season_id: id,
      p_champion_team_id: noChampion,
      p_runner_up_team_id: noChampion,
      p_third_place_team_id: noChampion,
    });

    if (error) handleDatabaseError(error, 'Failed to archive season');
    return season;
  },

  // Archives regular-season matches and resets team counters without finalizing
  // champions. Sets is_active=false and playoffs_active=true so the playoff
  // bracket stays editable; finalize_playoffs closes the season out later.
  partialArchiveSeason: async (seasonId: string) => {
    const { data: season, error } = await supabase.rpc('partial_archive_season', {
      p_season_id: seasonId,
    });

    if (error) handleDatabaseError(error, 'Failed to partially archive season');
    return season;
  },
};

import { supabase } from '@/integrations/supabase/client';
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

// ─── Service ─────────────────────────────────────────────────────────────────

export const SeasonService = {
  // From useSeasons.ts
  fetchSeasons: async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select(
        'id, name, is_active, is_archived, start_date, end_date, created_at, champion_team_id, runner_up_team_id, confirmation_open'
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
        'id, name, is_active, is_archived, start_date, end_date, created_at, champion_team_id, runner_up_team_id, confirmation_open'
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

  // From useSeasonParticipation.ts (useConfirmationSeason)
  fetchConfirmationSeason: async () => {
    // First try to find an active season with confirmation open
    const { data, error } = await supabase
      .from('seasons')
      .select(
        'id, name, is_active, is_archived, start_date, end_date, created_at, champion_team_id, runner_up_team_id, confirmation_open'
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
      .select('id, season_id, team_id, status, submitted_by, submitted_by_name, created_at, updated_at')
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
      .select('id, season_id, team_id, status, submitted_by, submitted_by_name, created_at, updated_at')
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

    const { data, error } = await supabase
      .from('season_team_participation')
      .upsert(
        {
          season_id: seasonId,
          team_id: teamId,
          status,
          submitted_by: user?.id ?? null,
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
    const transformedData = (data || []).map((item: any) => ({
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
    const { data: season, error } = await supabase
      .from('seasons')
      .insert([data])
      .select()
      .single();

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

  archiveSeason: async (id: string) => {
    const { data: season, error } = await supabase.rpc('archive_season', {
      p_season_id: id,
      p_champion_team_id: null,
      p_runner_up_team_id: null,
      p_third_place_team_id: null,
    });

    if (error) handleDatabaseError(error, 'Failed to archive season');
    return season;
  },
};

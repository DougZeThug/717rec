import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

export interface CreateSeasonData {
  name: string;
  start_date: string;
  end_date?: string | null;
}

export interface UpdateSeasonData extends CreateSeasonData {
  id: string;
}

export const SeasonLifecycleService = {
  // From useSeasonMutations.ts
  createSeason: async (data: CreateSeasonData) => {
    const { data: season, error } = await supabase
      .from('seasons')
      // is_active is set explicitly rather than left to the column default. A
      // new season must never take the league over on its own: the trigger that
      // clears the other seasons fires on UPDATE only, so an active-by-default
      // insert leaves two active seasons and fetchActiveSeason then throws.
      // Migration 20260826120000 sets the column default to false too, but
      // migrations are applied by hand (docs/OPERATIONS.md §6) — this line makes
      // the behaviour correct either way. Use activateSeason to start a season.
      .insert([{ ...data, is_active: false }])
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

  // The confirmation_open flag gates the "Confirm your team" card on the home
  // page. It was read but written by nothing, so the card could never appear.
  // Kept separate from updateSeason so the season form's shape is unchanged.
  setSeasonConfirmationOpen: async (seasonId: string, open: boolean) => {
    const { data: season, error } = await supabase
      .from('seasons')
      .update({ confirmation_open: open })
      .eq('id', seasonId)
      .select('id, name, is_active, confirmation_open')
      .single();

    if (error) handleDatabaseError(error, 'Failed to update season confirmation');
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

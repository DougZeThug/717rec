import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';

export const SeasonQueryService = {
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
};

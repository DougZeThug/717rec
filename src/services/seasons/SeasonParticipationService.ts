import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

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

export const SeasonParticipationService = {
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
};

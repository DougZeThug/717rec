import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

/**
 * Fetch stage and participants for a tournament concurrently
 * Used by useBracketData hook (step 2)
 */
export const fetchStageAndParticipants = async (bracketId: string) => {
  const [stageResult, participantsResult] = await Promise.all([
    supabase.from('stage').select('id, name, type, tournament_id').eq('tournament_id', bracketId),
    supabase
      .from('participant')
      .select('id, name, position, team_id, tournament_id')
      .eq('tournament_id', bracketId),
  ]);

  if (stageResult.error) {
    handleDatabaseError(stageResult.error, 'Failed to fetch bracket stage');
  }
  if (participantsResult.error) {
    handleDatabaseError(participantsResult.error, 'Failed to fetch bracket participants');
  }

  return {
    stages: stageResult.data ?? [],
    participants: participantsResult.data ?? [],
  };
};

/**
 * Fetch the stage id for a tournament's bracket.
 * Used by useBracketsManagerRealtime to scope its realtime subscription.
 * Returns null when the tournament has no stage yet (genuine no-rows case).
 */
export const fetchStageIdByTournament = async (bracketId: string): Promise<number | null> => {
  const { data, error } = await supabase
    .from('stage')
    .select('id')
    .eq('tournament_id', bracketId)
    .limit(1)
    .single();

  // A missing stage row is not an error here — brackets can exist before a stage.
  if (error && error.code !== 'PGRST116') {
    handleDatabaseError(error, 'Failed to fetch bracket stage id');
  }
  return data?.id ?? null;
};

/**
 * Fetch groups and matches for a stage concurrently
 * Used by useBracketData hook (step 3)
 */
export const fetchGroupsAndMatches = async (stageId: number) => {
  const [groupsResult, matchesResult] = await Promise.all([
    supabase.from('group').select('id, number, stage_id').eq('stage_id', stageId),
    supabase
      .from('match')
      .select(
        'id, group_id, round_id, number, status, opponent1_id, opponent1_score, opponent1_result, opponent2_id, opponent2_score, opponent2_result'
      )
      .eq('stage_id', stageId),
  ]);

  if (groupsResult.error) {
    handleDatabaseError(groupsResult.error, 'Failed to fetch bracket groups');
  }
  if (matchesResult.error) {
    handleDatabaseError(matchesResult.error, 'Failed to fetch bracket matches');
  }

  return {
    groups: groupsResult.data ?? [],
    matches: matchesResult.data ?? [],
  };
};

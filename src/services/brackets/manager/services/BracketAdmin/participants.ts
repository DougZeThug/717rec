import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, failureLog, successLog } from '@/utils/logger';

import type { StorageParticipant, StorageStage, StorageMatch } from '../../types/BracketServiceTypes';
import type { BracketAdminDeps, EditMatchParticipantsResult, ResolveTeamToParticipantIdFn } from './types';

export const resolveTeamToParticipantId: ResolveTeamToParticipantIdFn = async (
  teamId,
  tournamentId,
  participants
) => {
  if (!teamId) return null;
  const existing = participants.find((p) => p.team_id === teamId);
  if (existing) return existing.id;

  bracketLog(`No participant row for team ${teamId} in tournament ${tournamentId} — creating one`);
  const { data: team, error: teamError } = await supabase.from('teams').select('id, name').eq('id', teamId).single();
  if (teamError || !team) throw new BusinessLogicError(`Team ${teamId} not found`);

  const { data: inserted, error: insertError } = await supabase
    .from('participant')
    .insert({ tournament_id: tournamentId, name: team.name, team_id: team.id })
    .select('id')
    .single();

  if (insertError) handleDatabaseError(insertError, 'Failed to create participant for team');
  if (!inserted) throw new Error('Failed to create participant for team: insert returned no row');

  const newId = (inserted as { id: number }).id;
  participants.push({ id: newId, tournament_id: tournamentId, name: team.name, team_id: teamId });
  return newId;
};

export async function editMatchParticipants(
  deps: BracketAdminDeps,
  matchId: number,
  newOpponent1TeamId: string | null,
  newOpponent2TeamId: string | null
): Promise<EditMatchParticipantsResult> {
  bracketLog('Admin editMatchParticipants requested', { matchId, newOpponent1TeamId, newOpponent2TeamId });

  try {
    const matchData = (await deps.storage.select('match', matchId)) as StorageMatch | null;
    if (!matchData) throw new BusinessLogicError(`Match ${matchId} not found`);
    if (matchData.status === 4) throw new BusinessLogicError('Cannot edit teams on a completed match. This feature is only for unplayed matches.');

    const opp1Result = matchData.opponent1?.result;
    const opp2Result = matchData.opponent2?.result;
    if (opp1Result === 'win' || opp1Result === 'loss' || opp2Result === 'win' || opp2Result === 'loss') {
      throw new BusinessLogicError('Cannot edit teams on a match that already has a win/loss result recorded.');
    }

    const stage = (await deps.storage.select('stage', matchData.stage_id)) as StorageStage | null;
    if (!stage) throw new BusinessLogicError(`Stage ${matchData.stage_id} not found for match ${matchId}`);

    const tournamentId = stage.tournament_id;
    const participantsRaw = await deps.storage.select('participant', { tournament_id: tournamentId });
    const participants = (Array.isArray(participantsRaw) ? participantsRaw : participantsRaw ? [participantsRaw] : []) as StorageParticipant[];

    const resolvedOpp1Id = await resolveTeamToParticipantId(newOpponent1TeamId, tournamentId, participants);
    const resolvedOpp2Id = await resolveTeamToParticipantId(newOpponent2TeamId, tournamentId, participants);

    const { error } = await supabase.from('match').update({ opponent1_id: resolvedOpp1Id, opponent2_id: resolvedOpp2Id }).eq('id', matchId);
    if (error) handleDatabaseError(error, 'Failed to update match participants');

    deps.storage.clearParticipantCache();
    await deps.storage.loadParticipantsForTournament(tournamentId);

    successLog(`Admin edited participants on match ${matchId}`, `opponent1_id=${resolvedOpp1Id}, opponent2_id=${resolvedOpp2Id}`);

    return { matchId, opponent1_id: resolvedOpp1Id, opponent2_id: resolvedOpp2Id, message: 'Match teams updated' };
  } catch (error) {
    failureLog('Admin editMatchParticipants failed', error);
    if (error instanceof BusinessLogicError) throw error;
    throw new BusinessLogicError(`Failed to edit match participants: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
  }
}

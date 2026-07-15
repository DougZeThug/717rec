import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError, DatabaseError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, failureLog, successLog } from '@/utils/logger';

import type {
  StorageMatch,
  StorageParticipant,
  StorageStage,
} from '../../types/BracketServiceTypes';
import type {
  BracketAdminDeps,
  EditMatchParticipantsResult,
  ResolveTeamToParticipantIdFn,
} from './types';

/** Find the bracket participant id for a team, inserting a new participant row if none exists yet. */
const resolveTeamToParticipantId: ResolveTeamToParticipantIdFn = async (
  teamId,
  tournamentId,
  participants
) => {
  if (!teamId) return null;
  const existing = participants.find((p) => p.team_id === teamId);
  if (existing) return existing.id;

  bracketLog(`No participant row for team ${teamId} in tournament ${tournamentId} — creating one`);
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', teamId)
    .single();
  if (teamError || !team) throw new BusinessLogicError(`Team ${teamId} not found`);

  const { data: inserted, error: insertError } = await supabase
    .from('participant')
    .insert({ tournament_id: tournamentId, name: team.name, team_id: team.id })
    .select('id')
    .single();

  if (insertError) {
    // A concurrent request may have just inserted the participant row
    // (protected by participant_tournament_team_unique_idx). Recover by
    // reading the existing row instead of failing the admin edit.
    if ((insertError as { code?: string }).code === '23505') {
      bracketLog(
        `Concurrent participant insert detected for team ${teamId} — fetching existing row`
      );
      const { data: existingRow, error: fetchError } = await supabase
        .from('participant')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('team_id', teamId)
        .maybeSingle();
      if (fetchError)
        handleDatabaseError(fetchError, 'Failed to fetch existing participant after race');
      if (!existingRow)
        throw new DatabaseError(
          'Failed to resolve participant after unique-violation race: no row found'
        );
      /** Reuse the row the concurrent request created, caching it for future lookups. */
      const existingId = (existingRow as { id: number }).id;
      participants.push({
        id: existingId,
        tournament_id: tournamentId,
        name: team.name,
        team_id: teamId,
      });
      return existingId;
    }
    handleDatabaseError(insertError, 'Failed to create participant for team');
  }
  if (!inserted)
    throw new DatabaseError('Failed to create participant for team: insert returned no row');

  /** Cache the new participant locally so later lookups in this edit skip the database. */
  const newId = (inserted as { id: number }).id;
  participants.push({ id: newId, tournament_id: tournamentId, name: team.name, team_id: teamId });
  return newId;
};

/** Admin operation: swap one or both teams in a not-yet-completed bracket match, creating participants as needed. */
export async function editMatchParticipants(
  deps: BracketAdminDeps,
  matchId: number,
  newOpponent1TeamId: string | null,
  newOpponent2TeamId: string | null
): Promise<EditMatchParticipantsResult> {
  bracketLog('Admin editMatchParticipants requested', {
    matchId,
    newOpponent1TeamId,
    newOpponent2TeamId,
  });

  try {
    /** Load the match from bracket storage; editing requires it to exist and be unplayed. */
    const matchData = (await deps.storage.select('match', matchId)) as StorageMatch | null;
    if (!matchData) throw new BusinessLogicError(`Match ${matchId} not found`);
    if (matchData.status === 4)
      throw new BusinessLogicError(
        'Cannot edit teams on a completed match. This feature is only for unplayed matches.'
      );

    const opp1Result = matchData.opponent1?.result;
    const opp2Result = matchData.opponent2?.result;
    if (
      opp1Result === 'win' ||
      opp1Result === 'loss' ||
      opp2Result === 'win' ||
      opp2Result === 'loss'
    ) {
      throw new BusinessLogicError(
        'Cannot edit teams on a match that already has a win/loss result recorded.'
      );
    }

    /** Load the match's stage to find which tournament its participants belong to. */
    const stage = (await deps.storage.select('stage', matchData.stage_id)) as StorageStage | null;
    if (!stage)
      throw new BusinessLogicError(`Stage ${matchData.stage_id} not found for match ${matchId}`);

    const tournamentId = stage.tournament_id;
    const participantsRaw = await deps.storage.select('participant', {
      tournament_id: tournamentId,
    });
    /** Normalize the storage result (row, array, or null) into a participant array. */
    const participants = (
      Array.isArray(participantsRaw) ? participantsRaw : participantsRaw ? [participantsRaw] : []
    ) as StorageParticipant[];

    const resolvedOpp1Id = await resolveTeamToParticipantId(
      newOpponent1TeamId,
      tournamentId,
      participants
    );
    const resolvedOpp2Id = await resolveTeamToParticipantId(
      newOpponent2TeamId,
      tournamentId,
      participants
    );

    const { error } = await supabase
      .from('match')
      .update({ opponent1_id: resolvedOpp1Id, opponent2_id: resolvedOpp2Id })
      .eq('id', matchId);
    if (error) handleDatabaseError(error, 'Failed to update match participants');

    deps.storage.clearParticipantCache();
    await deps.storage.loadParticipantsForTournament(tournamentId);

    successLog(
      `Admin edited participants on match ${matchId}`,
      `opponent1_id=${resolvedOpp1Id}, opponent2_id=${resolvedOpp2Id}`
    );

    return {
      matchId,
      opponent1_id: resolvedOpp1Id,
      opponent2_id: resolvedOpp2Id,
      message: 'Match teams updated',
    };
  } catch (error) {
    failureLog('Admin editMatchParticipants failed', error);
    if (error instanceof BusinessLogicError) throw error;
    throw new BusinessLogicError(
      `Failed to edit match participants: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error
    );
  }
}

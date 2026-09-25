import { supabase } from '@/integrations/supabase/client';
import { DatabaseError } from '@/types/errors';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog } from '@/utils/logger';

import type { StorageParticipant } from '../../types/BracketServiceTypes';

export interface TeamSummary {
  id: string;
  name: string;
}

/** Read a team by id. Read-only, so it is safe to call while an edit is still being checked. */
export async function lookupTeam(teamId: string): Promise<TeamSummary> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', teamId)
    .maybeSingle();
  if (error) handleDatabaseError(error, 'Failed to read the team');
  return ensureFound(data as TeamSummary | null, 'Team', teamId);
}

/**
 * The bracket participant id for a team, inserting a participant row when the
 * team is not in the bracket yet. Writes, so callers run it only after every
 * check has passed — a refused edit must not leave an orphan row behind.
 */
export async function ensureParticipantRow(
  tournamentId: string,
  team: TeamSummary,
  participants: StorageParticipant[]
): Promise<number> {
  const existing = participants.find((participant) => participant.team_id === team.id);
  if (existing) return existing.id;

  bracketLog(`No participant row for team ${team.id} in tournament ${tournamentId} — creating one`);
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
        `Concurrent participant insert detected for team ${team.id} — fetching existing row`
      );
      const { data: existingRow, error: fetchError } = await supabase
        .from('participant')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('team_id', team.id)
        .maybeSingle();
      if (fetchError)
        handleDatabaseError(fetchError, 'Failed to fetch existing participant after race');
      if (!existingRow)
        throw new DatabaseError(
          'Failed to resolve participant after unique-violation race: no row found'
        );
      const existingId = (existingRow as { id: number }).id;
      participants.push({
        id: existingId,
        tournament_id: tournamentId,
        name: team.name,
        team_id: team.id,
      });
      return existingId;
    }
    handleDatabaseError(insertError, 'Failed to create participant for team');
  }
  if (!inserted)
    throw new DatabaseError('Failed to create participant for team: insert returned no row');

  const newId = (inserted as { id: number }).id;
  participants.push({ id: newId, tournament_id: tournamentId, name: team.name, team_id: team.id });
  return newId;
}

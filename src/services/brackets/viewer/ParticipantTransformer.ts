import { PlayoffTeam } from '@/utils/playoffs/playoffTypes';

import { ViewerParticipant } from './types';

/**
 * Transform stored participants (with seed positions) into viewer format.
 * Populates teamIdMap so that match transformers can look up participant IDs by team UUID.
 */
export function transformStoredParticipants(
  storedParticipants: Array<{
    position: number;
    team_id: string;
    name: string;
    logo_url?: string;
    image_url?: string;
  }>,
  teamIdMap: Map<string, number>
): ViewerParticipant[] {
  return storedParticipants
    .sort((a, b) => a.position - b.position)
    .map((participant, index) => {
      const participantId = index + 1;
      teamIdMap.set(participant.team_id, participantId);

      return {
        id: participantId,
        tournament_id: 1,
        name: participant.name,
        image: participant.image_url || participant.logo_url || undefined,
        position: participant.position,
      };
    });
}

/**
 * Transform teams → participants (fallback when no stored participants exist).
 * Populates teamIdMap so that match transformers can look up participant IDs by team UUID.
 */
export function transformParticipants(
  teams: PlayoffTeam[],
  teamIdMap: Map<string, number>
): ViewerParticipant[] {
  return teams.map((team, index) => {
    const participantId = index + 1;
    teamIdMap.set(team.id, participantId);

    return {
      id: participantId,
      tournament_id: 1,
      name: team.name,
      image: team.image_url || team.logo_url || undefined,
      position: index + 1,
    };
  });
}

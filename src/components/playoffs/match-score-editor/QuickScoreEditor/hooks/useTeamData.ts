import { useMemo } from 'react';

import { PlayoffMatch, Team } from '@/types';

export const useTeamData = (match: PlayoffMatch, teams: Team[]) => {
  return useMemo(() => {
    // Find team details
    const team1 = match.team1Id ? teams.find((t) => t.id === match.team1Id) : null;
    const team2 = match.team2Id ? teams.find((t) => t.id === match.team2Id) : null;

    const team1Name = team1?.name || 'Team 1';
    const team2Name = team2?.name || 'Team 2';

    return {
      team1,
      team2,
      team1Name,
      team2Name,
    };
  }, [match, teams]);
};

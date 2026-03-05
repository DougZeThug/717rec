import { useQuery } from '@tanstack/react-query';

import { fetchTeamMatchesData } from '@/services/matches/MatchReadService';
import { Match } from '@/types';

export const useTeamMatches = (teamId: string | undefined) => {
  const matchesQuery = useQuery({
    queryKey: ['team-matches', teamId],
    queryFn: async () => {
      if (!teamId) return { upcomingMatches: [], pastMatches: [] };

      const data = await fetchTeamMatchesData(teamId);

      if (!data) {
        return { upcomingMatches: [], pastMatches: [] };
      }

      const matchData = data;

      // Map database rows to Match interface with camelCase properties
      const mappedMatches = matchData.map((row) => ({
        id: row.id,
        team1Id: row.team1_id,
        team2Id: row.team2_id,
        team1Score: row.team1_score,
        team2Score: row.team2_score,
        date: row.date,
        location: row.location,
        iscompleted: row.iscompleted,
        winnerId: row.winner_id,
        loserId: row.loser_id,
        round_number: row.round_number,
        position: row.position,
        bracket_id: row.bracket_id,
        match_type: row.match_type,
        next_match_id: row.next_match_id,
        next_loser_match_id: row.next_loser_match_id,
        best_of: row.best_of,
        created_at: row.created_at,
        team1_game_wins: row.team1_game_wins,
        team2_game_wins: row.team2_game_wins,
        team1Details: row.team1 ? (Array.isArray(row.team1) ? row.team1[0] : row.team1) : null,
        team2Details: row.team2 ? (Array.isArray(row.team2) ? row.team2[0] : row.team2) : null,
      })) as Match[];

      return {
        upcomingMatches: mappedMatches.filter((m) => !m.iscompleted),
        pastMatches: mappedMatches.filter((m) => m.iscompleted),
      };
    },
    enabled: !!teamId,
    staleTime: 0, // Always fresh - instant updates
  });

  return {
    upcomingMatches: matchesQuery.data?.upcomingMatches ?? [],
    pastMatches: matchesQuery.data?.pastMatches ?? [],
    isLoadingMatches: matchesQuery.isLoading,
  };
};

import { useQuery } from '@tanstack/react-query';

import { fetchBracketsManagerMatchData } from '@/services/brackets/BracketReadService';

export interface BracketsManagerMatchData {
  id: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  number: number;
  status: number;
  opponent1: {
    id: number;
    name: string;
    score: number | null;
    result: string | null;
  } | null;
  opponent2: {
    id: number;
    name: string;
    score: number | null;
    result: string | null;
  } | null;
  games: Array<{
    id: number;
    number: number;
    opponent1_score: number | null;
    opponent2_score: number | null;
    status: number;
  }>;
}

export const useBracketsManagerMatch = (matchId: number | null) => {
  return useQuery({
    queryKey: ['brackets-manager-match', matchId],
    queryFn: async () => {
      if (!matchId) return null;

      const data = await fetchBracketsManagerMatchData(matchId);
      const { matchData, gamesData, opponent1Data, opponent2Data } = data;

      const result: BracketsManagerMatchData = {
        id: matchData.id,
        stage_id: matchData.stage_id,
        group_id: matchData.group_id,
        round_id: matchData.round_id,
        number: matchData.number,
        status: matchData.status,
        opponent1: opponent1Data
          ? {
              id: opponent1Data.id,
              name: opponent1Data.name,
              score: matchData.opponent1_score,
              result: matchData.opponent1_result,
            }
          : null,
        opponent2: opponent2Data
          ? {
              id: opponent2Data.id,
              name: opponent2Data.name,
              score: matchData.opponent2_score,
              result: matchData.opponent2_result,
            }
          : null,
        games: gamesData,
      };

      return result;
    },
    enabled: !!matchId,
  });
};

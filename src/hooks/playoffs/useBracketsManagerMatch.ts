import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

      // Fetch match data
      const { data: matchData, error: matchError } = await supabase
        .from('match')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;
      if (!matchData) return null;

      // Fetch games for this match
      const { data: gamesData, error: gamesError } = await supabase
        .from('match_game')
        .select('*')
        .eq('match_id', matchId)
        .order('number', { ascending: true });

      if (gamesError) throw gamesError;

      // Fetch participant names
      let opponent1Data = null;
      let opponent2Data = null;

      if (matchData.opponent1_id) {
        const { data } = await supabase
          .from('participant')
          .select('id, name')
          .eq('id', matchData.opponent1_id)
          .single();
        opponent1Data = data;
      }

      if (matchData.opponent2_id) {
        const { data } = await supabase
          .from('participant')
          .select('id, name')
          .eq('id', matchData.opponent2_id)
          .single();
        opponent2Data = data;
      }

      const result: BracketsManagerMatchData = {
        id: matchData.id,
        stage_id: matchData.stage_id,
        group_id: matchData.group_id,
        round_id: matchData.round_id,
        number: matchData.number,
        status: matchData.status,
        opponent1: opponent1Data ? {
          id: opponent1Data.id,
          name: opponent1Data.name,
          score: matchData.opponent1_score,
          result: matchData.opponent1_result
        } : null,
        opponent2: opponent2Data ? {
          id: opponent2Data.id,
          name: opponent2Data.name,
          score: matchData.opponent2_score,
          result: matchData.opponent2_result
        } : null,
        games: gamesData || []
      };

      return result;
    },
    enabled: !!matchId
  });
};

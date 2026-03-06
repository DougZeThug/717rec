import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeadToHeadData {
  team1Wins: number;
  team2Wins: number;
  totalMatches: number;
  team1GameWins: number;
  team2GameWins: number;
  isFirstMeeting: boolean;
}

// ─── fetchBatchHeadToHead ─────────────────────────────────────────────────────

/**
 * Fetch head-to-head data for multiple team pairs in a single RPC call.
 * Returns a Map keyed by "team1Id-team2Id" (both orderings stored).
 */
export const fetchBatchHeadToHead = async (
  pairsJson: Array<{ team1: string | null | undefined; team2: string | null | undefined }>
): Promise<Map<string, HeadToHeadData>> => {
  const { data: results, error } = await supabase.rpc('get_batch_head_to_head', {
    p_team_pairs: pairsJson,
  });

  if (error) {
    errorLog('Batch H2H error:', error);
    return new Map<string, HeadToHeadData>();
  }

  // Create a map with keys that work for both orderings of team IDs
  const resultMap = new Map<string, HeadToHeadData>();

  for (const row of results || []) {
    const h2hData: HeadToHeadData = {
      team1Wins: row.team1_wins,
      team2Wins: row.team2_wins,
      totalMatches: row.total_matches,
      team1GameWins: row.team1_game_wins,
      team2GameWins: row.team2_game_wins,
      isFirstMeeting: row.total_matches === 0,
    };

    // Store with forward key
    resultMap.set(`${row.team1_id}-${row.team2_id}`, h2hData);

    // Also store with reversed key (swapped perspective)
    resultMap.set(`${row.team2_id}-${row.team1_id}`, {
      team1Wins: row.team2_wins,
      team2Wins: row.team1_wins,
      totalMatches: row.total_matches,
      team1GameWins: row.team2_game_wins,
      team2GameWins: row.team1_game_wins,
      isFirstMeeting: row.total_matches === 0,
    });
  }

  return resultMap;
};

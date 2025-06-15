
import { supabase } from '@/integrations/supabase/client';
import { BadgeProcessingService } from '@/services/BadgeProcessingService';

export interface UpdateMatchScoreParams {
  matchId: string;
  team1Score: number;
  team2Score: number;
  team1GameWins: number;
  team2GameWins: number;
}

export interface UpdateMatchScoreResult {
  data: any;
  team1_id: string;
  team2_id: string;
  team1Win: boolean;
}

export const updateMatchScore = async ({
  matchId,
  team1Score,
  team2Score,
  team1GameWins,
  team2GameWins
}: UpdateMatchScoreParams): Promise<UpdateMatchScoreResult> => {
  console.log('🎯 updateMatchScore called with:', {
    matchId,
    team1Score,
    team2Score,
    team1GameWins,
    team2GameWins
  });

  // First get the match to extract team IDs
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select('team1_id, team2_id')
    .eq('id', matchId)
    .single();

  if (matchError || !matchData) {
    throw new Error(`Failed to fetch match data: ${matchError?.message}`);
  }

  const { team1_id, team2_id } = matchData;
  
  // Determine winner based on scores
  const team1Win = team1Score > team2Score;
  const winnerId = team1Win ? team1_id : team2_id;
  const loserId = team1Win ? team2_id : team1_id;

  console.log('🏆 Match result:', {
    team1Win,
    winnerId,
    loserId,
    team1_id,
    team2_id
  });

  // Update the match with scores and completion status
  const { data, error } = await supabase
    .from('matches')
    .update({
      team1_score: team1Score,
      team2_score: team2Score,
      team1_game_wins: team1GameWins,
      team2_game_wins: team2GameWins,
      winner_id: winnerId,
      loser_id: loserId,
      iscompleted: true
    })
    .eq('id', matchId)
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to update match:', error);
    throw error;
  }

  console.log('✅ Match updated successfully:', data);

  // Process all badges for both teams after match completion
  try {
    // Process streak badges first
    const badgeResult = await BadgeProcessingService.processMatchBadges(team1_id, team2_id);
    console.log('🏆 Badge processing completed:', badgeResult);

    // Process kingslayer badge separately
    const kingslayerResult = await BadgeProcessingService.processKingslayerBadge(winnerId, loserId);
    console.log('⚔️ Kingslayer badge processing completed:', kingslayerResult);

    // Process clutch performer badge for the winner
    const clutchResult = await BadgeProcessingService.processClutchPerformerBadge(winnerId, team1GameWins, team2GameWins);
    console.log('🎯 Clutch performer badge processing completed:', clutchResult);
  } catch (badgeError) {
    console.warn('⚠️ Badge processing failed (non-critical):', badgeError);
    // Don't throw here - badge processing failure shouldn't prevent match completion
  }

  return {
    data,
    team1_id,
    team2_id,
    team1Win
  };
};

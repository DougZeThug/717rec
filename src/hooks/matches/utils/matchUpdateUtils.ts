
import { supabase } from "@/integrations/supabase/client";
import { MatchResultData } from "../types/matchSubmissionTypes";

export const updateMatchInDatabase = async (
  matchId: string,
  team1GameWins: number,
  team2GameWins: number,
  matchResult: MatchResultData
) => {
  const { winnerId, loserId } = matchResult;
  
  // Binary match scores - winner gets 1, loser gets 0
  const team1MatchScore = winnerId === matchResult.team1Id ? 1 : 0;
  const team2MatchScore = winnerId === matchResult.team2Id ? 1 : 0;
  
  console.log(`[matchUpdateUtils] Processing match ${matchId}:`, {
    match_scores: {
      team1: { id: matchResult.team1Id, matchScore: team1MatchScore },
      team2: { id: matchResult.team2Id, matchScore: team2MatchScore }
    },
    game_scores: {
      team1: { id: matchResult.team1Id, gameWins: team1GameWins },
      team2: { id: matchResult.team2Id, gameWins: team2GameWins }
    },
    winner_id: winnerId,
    loser_id: loserId
  });
  
  // Validation to ensure match scores are binary
  if (team1MatchScore + team2MatchScore !== 1) {
    console.error('Invalid match scores - exactly one team must win');
    throw new Error('Match scores must be 1/0 based on winner/loser');
  }
  
  const updateData = {
    team1_score: team1MatchScore,          // Binary winner indicator (1/0)
    team2_score: team2MatchScore,          // Binary winner indicator (1/0)
    iscompleted: true,
    winner_id: winnerId,
    loser_id: loserId,
    team1_game_wins: matchResult.team1GameWins, // Actual game wins
    team2_game_wins: matchResult.team2GameWins  // Actual game wins
  };

  // First update the match itself
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', matchId)
    .select();
    
  if (matchError) {
    console.error(`[matchUpdateUtils] Error updating match ${matchId}:`, matchError);
    throw matchError;
  }

  console.log(`[matchUpdateUtils] Match ${matchId} updated successfully:`, matchData);
  return matchData;
};

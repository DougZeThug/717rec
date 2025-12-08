
import { supabase } from "@/integrations/supabase/client";
import { MatchResultData } from "../types/matchSubmissionTypes";
import { matchLog, errorLog, warnLog } from "@/utils/logger";

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
  
  // Ensure game wins are parsed as integers
  const parsedTeam1GameWins = Number.isInteger(team1GameWins) ? team1GameWins : parseInt(String(team1GameWins)) || 0;
  const parsedTeam2GameWins = Number.isInteger(team2GameWins) ? team2GameWins : parseInt(String(team2GameWins)) || 0;
  
  matchLog(`Processing match ${matchId}:`, {
    match_scores: {
      team1: { id: matchResult.team1Id, matchScore: team1MatchScore },
      team2: { id: matchResult.team2Id, matchScore: team2MatchScore }
    },
    game_scores: {
      team1: { id: matchResult.team1Id, gameWins: parsedTeam1GameWins },
      team2: { id: matchResult.team2Id, gameWins: parsedTeam2GameWins }
    },
    winner_id: winnerId,
    loser_id: loserId
  });
  
  // Validation to ensure match scores are binary
  if (team1MatchScore + team2MatchScore !== 1) {
    errorLog('Invalid match scores - exactly one team must win');
    throw new Error('Match scores must be 1/0 based on winner/loser');
  }
  
  // Validation for completed matches with zero game wins
  if (parsedTeam1GameWins === 0 && parsedTeam2GameWins === 0) {
    warnLog("Completed match has zero game wins:", matchId);
  }
  
  const updateData = {
    team1_score: team1MatchScore,          // Binary winner indicator (1/0)
    team2_score: team2MatchScore,          // Binary winner indicator (1/0)
    iscompleted: true,
    winner_id: winnerId,
    loser_id: loserId,
    team1_game_wins: parsedTeam1GameWins,  // Actual game wins
    team2_game_wins: parsedTeam2GameWins   // Actual game wins
  };

  // Debug log to confirm payload just before Supabase update
  matchLog('Final updateData to Supabase:', {
    ...updateData,
    team1_game_wins_type: typeof updateData.team1_game_wins,
    team2_game_wins_type: typeof updateData.team2_game_wins
  });

  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', matchId)
    .select();
    
  if (matchError) {
    errorLog(`Error updating match ${matchId}:`, matchError);
    throw matchError;
  }

  // Check if no rows were updated
  if (!matchData || matchData.length === 0) {
    warnLog(`Supabase update returned 0 rows affected — possible match ID mismatch:`, matchId);
  }

  matchLog(`Match ${matchId} updated successfully:`, matchData);
  return matchData;
};

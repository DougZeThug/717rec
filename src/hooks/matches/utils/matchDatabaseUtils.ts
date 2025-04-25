
import { supabase } from "@/integrations/supabase/client";
import { SubmitScoreParams } from "../types/matchSubmissionTypes";

export const updateMatchScore = async ({
  matchId,
  team1Score,
  team2Score,
  team1GameWins = 0,
  team2GameWins = 0
}: SubmitScoreParams) => {
  // Fetch the match data to get team IDs
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select('team1_id, team2_id, date')
    .eq('id', matchId)
    .single();
    
  if (matchError) {
    console.error(`Error fetching match ${matchId}:`, matchError);
    throw matchError;
  }
  
  if (!matchData) {
    console.error(`No match found with ID ${matchId}`);
    throw new Error(`No match found with ID ${matchId}`);
  }
  
  const { team1_id, team2_id, date } = matchData;
  
  // Log the match date for debugging
  console.log(`Processing match ${matchId} from date: ${date}`);
  
  // Determine match results based on match scores (1/0), not game wins
  const team1Win = team1Score > team2Score;
  
  // Ensure game wins are integers
  const processedTeam1GameWins = Number.isInteger(team1GameWins) ? team1GameWins : parseInt(String(team1GameWins)) || 0;
  const processedTeam2GameWins = Number.isInteger(team2GameWins) ? team2GameWins : parseInt(String(team2GameWins)) || 0;
  
  console.log('🚀 Submitting match to Supabase:', {
    matchId,
    team1GameWins: processedTeam1GameWins,
    team2GameWins: processedTeam2GameWins,
    team1_score: team1Win ? 1 : 0,
    team2_score: team1Win ? 0 : 1,
    winner_id: team1Win ? team1_id : team2_id,
    loser_id: team1Win ? team2_id : team1_id,
    match_date: date
  });

  const updatePayload = {
    team1_score: team1Win ? 1 : 0,
    team2_score: team1Win ? 0 : 1,
    team1_game_wins: processedTeam1GameWins,
    team2_game_wins: processedTeam2GameWins,
    iscompleted: true,
    winner_id: team1Win ? team1_id : team2_id,
    loser_id: team1Win ? team2_id : team1_id
  };

  // Debug log to confirm payload just before Supabase update
  console.log('✅ Final updatePayload to Supabase:', {
    ...updatePayload,
    match_id: matchId,
    team1_game_wins_type: typeof updatePayload.team1_game_wins,
    team2_game_wins_type: typeof updatePayload.team2_game_wins
  });

  // Warning if submitting a match with zero game wins
  if (updatePayload.team1_game_wins === 0 && updatePayload.team2_game_wins === 0) {
    console.warn("⚠️ Submitting match with 0-0 game wins. This may be incorrect.");
  }

  // Insert into debug table for troubleshooting
  try {
    await supabase.from('debug_match_updates').insert({
      match_id: matchId,
      team1_score: updatePayload.team1_score,
      team2_score: updatePayload.team2_score,
      team1_game_wins: updatePayload.team1_game_wins,
      team2_game_wins: updatePayload.team2_game_wins
    });
    console.log("📝 Debug entry created for match update");
  } catch (debugError) {
    console.warn("Could not create debug entry:", debugError);
  }

  const { data, error } = await supabase
    .from('matches')
    .update(updatePayload)
    .eq('id', matchId)
    .select();

  if (error) {
    console.error(`Error updating match ${matchId}:`, error);
    throw error;
  }
  
  // Check if no rows were updated
  if (!data || data.length === 0) {
    console.warn("⚠️ Supabase update returned 0 rows affected — possible match ID mismatch:", matchId);
  }
  
  return { data, team1_id, team2_id, team1Win };
};

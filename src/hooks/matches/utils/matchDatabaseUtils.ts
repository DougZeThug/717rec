
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
    .select('team1_id, team2_id')
    .eq('id', matchId)
    .single();
    
  if (matchError) throw matchError;
  
  const { team1_id, team2_id } = matchData;
  
  // Determine match results based on match scores (1/0), not game wins
  const team1Win = team1Score > team2Score;
  
  // Ensure game wins are integers
  const processedTeam1GameWins = parseInt(String(team1GameWins)) || 0;
  const processedTeam2GameWins = parseInt(String(team2GameWins)) || 0;
  
  // Insert into debug table before Supabase update
  await supabase.from("debug_match_updates").insert({
    match_id: matchId,
    team1_score: team1Win ? 1 : 0,
    team2_score: team1Win ? 0 : 1,
    team1_game_wins: processedTeam1GameWins,
    team2_game_wins: processedTeam2GameWins,
  });

  const updatePayload = {
    team1_score: team1Win ? 1 : 0,          // Binary winner indicator (1/0)
    team2_score: team1Win ? 0 : 1,          // Binary winner indicator (1/0)
    iscompleted: true,
    winner_id: team1Win ? team1_id : team2_id,
    loser_id: team1Win ? team2_id : team1_id,
    team1_game_wins: Number.isInteger(processedTeam1GameWins) ? processedTeam1GameWins : parseInt(String(processedTeam1GameWins)) || 0,
    team2_game_wins: Number.isInteger(processedTeam2GameWins) ? processedTeam2GameWins : parseInt(String(processedTeam2GameWins)) || 0
  };

  // Add detailed type logging
  console.log("🧪 FINAL payload to Supabase (with types):", {
    ...updatePayload,
    team1_game_wins_type: typeof updatePayload.team1_game_wins,
    team2_game_wins_type: typeof updatePayload.team2_game_wins
  });

  // Warning for zero-win submissions
  if (updatePayload.team1_game_wins === 0 && updatePayload.team2_game_wins === 0) {
    console.warn("⚠️ Submitting match with 0-0 game wins. This may be incorrect.");
  }

  const { data, error } = await supabase
    .from('matches')
    .update(updatePayload)
    .eq('id', matchId)
    .select();

  // Fallback logging for empty update
  if (!data || data.length === 0) {
    console.warn("⚠️ No rows updated in Supabase. Check for RLS or malformed payload.");
  }

  if (error) throw error;
  
  return { data, team1_id, team2_id, team1Win };
};

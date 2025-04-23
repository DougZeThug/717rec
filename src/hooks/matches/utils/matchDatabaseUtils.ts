
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
  
  console.log('🚀 Submitting match to Supabase:', {
    matchId,
    team1GameWins: processedTeam1GameWins,
    team2GameWins: processedTeam2GameWins,
    team1_score: team1Win ? 1 : 0,
    team2_score: team1Win ? 0 : 1,
    winner_id: team1Win ? team1_id : team2_id,
    loser_id: team1Win ? team2_id : team1_id
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
  console.log('✅ Final updatePayload to Supabase:', updatePayload);

  const { data, error } = await supabase
    .from('matches')
    .update(updatePayload)
    .eq('id', matchId)
    .select();

  if (error) throw error;
  
  // Check if no rows were updated
  if (!data || data.length === 0) {
    console.warn("⚠️ Supabase update matched no rows. Check matchId:", matchId);
  }
  
  return { data, team1_id, team2_id, team1Win };
};

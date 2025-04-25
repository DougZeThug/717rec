
import { supabase } from "@/integrations/supabase/client";
import { SubmitScoreParams } from "../types/matchSubmissionTypes";

export const updateMatchScore = async ({
  matchId,
  team1Score,
  team2Score,
  team1GameWins = 0,
  team2GameWins = 0
}: SubmitScoreParams) => {
  // Fetch match data for validation
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
  
  // Normalize all numeric values
  const normalizedTeam1Score = Number(team1Score);
  const normalizedTeam2Score = Number(team2Score);
  const normalizedTeam1GameWins = Number(team1GameWins ?? 0);
  const normalizedTeam2GameWins = Number(team2GameWins ?? 0);
  
  console.log(`Processing match ${matchId} from date: ${date}`, {
    scores: {
      team1: normalizedTeam1Score,
      team2: normalizedTeam2Score
    },
    gameWins: {
      team1: normalizedTeam1GameWins,
      team2: normalizedTeam2GameWins
    }
  });
  
  // Determine winner based on normalized scores
  const team1Win = normalizedTeam1Score > normalizedTeam2Score;
  
  const updatePayload = {
    team1_score: normalizedTeam1Score,
    team2_score: normalizedTeam2Score,
    team1_game_wins: normalizedTeam1GameWins,
    team2_game_wins: normalizedTeam2GameWins,
    iscompleted: true,
    winner_id: team1Win ? team1_id : team2_id,
    loser_id: team1Win ? team2_id : team1_id
  };

  console.log('✅ Final updatePayload to Supabase:', {
    matchId,
    date,
    ...updatePayload,
    team1_game_wins_type: typeof normalizedTeam1GameWins,
    team2_game_wins_type: typeof normalizedTeam2GameWins
  });

  // Create debug entry for troubleshooting
  try {
    await supabase.from('debug_match_updates').insert({
      match_id: matchId,
      team1_score: normalizedTeam1Score,
      team2_score: normalizedTeam2Score,
      team1_game_wins: normalizedTeam1GameWins,
      team2_game_wins: normalizedTeam2GameWins
    });
  } catch (debugError) {
    console.warn("Could not create debug entry:", debugError);
  }

  const { data, error } = await supabase
    .from('matches')
    .update(updatePayload)
    .eq('id', matchId)
    .select();

  if (error) throw error;
  
  if (!data || data.length === 0) {
    throw new Error(`No rows updated for match ${matchId}`);
  }
  
  return { data, team1_id, team2_id, team1Win };
};

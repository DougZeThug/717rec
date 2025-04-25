
import { supabase } from "@/integrations/supabase/client";
import { SubmitScoreParams } from "../types/matchSubmissionTypes";

export const updateMatchScore = async ({
  matchId,
  team1Score,
  team2Score,
  team1GameWins = 0,
  team2GameWins = 0
}: SubmitScoreParams) => {
  // Log input parameters for comparison
  console.log("🔍 DIAGNOSTIC: updateMatchScore input parameters:", {
    matchId,
    team1Score,
    team1ScoreType: typeof team1Score,
    team2Score,
    team2ScoreType: typeof team2Score,
    team1GameWins,
    team1GameWinsType: typeof team1GameWins,
    team2GameWins,
    team2GameWinsType: typeof team2GameWins
  });

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
  
  console.log("🔍 DIAGNOSTIC: Raw match data from Supabase:", {
    matchId,
    matchData,
    dateType: typeof matchData.date
  });
  
  const { team1_id, team2_id, date } = matchData;
  
  // Normalize all numeric values
  const normalizedTeam1Score = Number(team1Score);
  const normalizedTeam2Score = Number(team2Score);
  const normalizedTeam1GameWins = Number(team1GameWins ?? 0);
  const normalizedTeam2GameWins = Number(team2GameWins ?? 0);
  
  console.log(`🔍 DIAGNOSTIC: Processing match ${matchId} from date: ${date}`, {
    matchDate: date,
    dateType: typeof date,
    scores: {
      team1: normalizedTeam1Score,
      team2: normalizedTeam2Score
    },
    gameWins: {
      team1: normalizedTeam1GameWins,
      team2: normalizedTeam2GameWins
    },
    typesAfterNormalization: {
      team1ScoreType: typeof normalizedTeam1Score,
      team2ScoreType: typeof normalizedTeam2Score,
      team1GameWinsType: typeof normalizedTeam1GameWins,
      team2GameWinsType: typeof normalizedTeam2GameWins
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

  console.log('🔍 DIAGNOSTIC: Final updatePayload to Supabase:', {
    matchId,
    date,
    dateFormatted: new Date(date).toISOString(),
    ...updatePayload,
    team1_game_wins_type: typeof normalizedTeam1GameWins,
    team2_game_wins_type: typeof normalizedTeam2GameWins,
    fullPayload: JSON.stringify(updatePayload)
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

  if (error) {
    console.error("🔍 DIAGNOSTIC: Supabase update error:", {
      matchId,
      date,
      error: error.message,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }
  
  if (!data || data.length === 0) {
    throw new Error(`No rows updated for match ${matchId}`);
  }
  
  console.log("🔍 DIAGNOSTIC: Supabase update success:", {
    matchId,
    date,
    data: JSON.stringify(data)
  });
  
  return { data, team1_id, team2_id, team1Win };
};

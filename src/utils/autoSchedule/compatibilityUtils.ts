
import { Team } from "@/types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Check if two teams have played each other before
 */
export async function haveTeamsPlayed(team1Id: string, team2Id: string): Promise<boolean> {
  try {
    // Build a query to find matches between these teams
    const { data, error } = await supabase
      .from('matches')
      .select('id')
      .or(`and(team1_id.eq.${team1Id},team2_id.eq.${team2Id}),and(team1_id.eq.${team2Id},team2_id.eq.${team1Id})`)
      .limit(1);

    if (error) {
      console.error('Error checking if teams have played:', error);
      throw error;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error in haveTeamsPlayed:', error);
    // Return false as a fallback to avoid blocking match generation
    return false;
  }
}

/**
 * Calculate compatibility score between two teams based on their stats
 * Higher score means teams are more evenly matched
 */
export function calculateTeamCompatibility(team1: Team, team2: Team): number {
  // Compare power scores - closer power scores are better matches
  const powerScoreDiff = Math.abs((team1.power_score || 0) - (team2.power_score || 0));
  
  // Compare strength of schedule - closer SOS values are better matches
  const sosDiff = Math.abs((team1.sos || 0.5) - (team2.sos || 0.5));
  
  // Calculate record similarity - teams with similar records are better matches
  const team1WinPct = team1.wins / (team1.wins + team1.losses || 1);
  const team2WinPct = team2.wins / (team2.wins + team2.losses || 1);
  const recordDiff = Math.abs(team1WinPct - team2WinPct);
  
  // Calculate game record similarity
  const team1GameWinPct = team1.game_wins / (team1.game_wins + team1.game_losses || 1);
  const team2GameWinPct = team2.game_wins / (team2.game_wins + team2.game_losses || 1);
  const gameRecordDiff = Math.abs(team1GameWinPct - team2GameWinPct);
  
  // Calculate weighted compatibility score (lower differences = higher compatibility)
  // Adjust weights based on importance of each factor
  // Normalize each factor to a 0-1 scale before weighting
  const normalizedPowerScoreDiff = Math.min(1, powerScoreDiff / 100);
  const normalizedSosDiff = Math.min(1, sosDiff);
  const normalizedRecordDiff = Math.min(1, recordDiff);
  const normalizedGameRecordDiff = Math.min(1, gameRecordDiff);
  
  // Apply weights to each factor (total should be 10)
  const weightedScore = 10 - (
    normalizedPowerScoreDiff * 4 + 
    normalizedSosDiff * 2 + 
    normalizedRecordDiff * 2.5 + 
    normalizedGameRecordDiff * 1.5
  );
  
  // Ensure the score is within a reasonable range (0-10)
  return Math.max(0, Math.min(10, weightedScore));
}

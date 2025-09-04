
import { Team } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { getCachedCompatibilityScore, getCachedMatchHistory } from "./cachingUtils";

/**
 * Calculate compatibility score between two teams
 * Higher score means better match (more evenly matched)
 */
export function calculateTeamCompatibility(team1: Team, team2: Team): number {
  // Division compatibility - heavily prioritize same division matchups
  const sameDivision = (team1.division || team1.division_id) === (team2.division || team2.division_id);
  const divisionBonus = sameDivision ? 0 : 4; // Heavy penalty for cross-division (4 points out of 10)
  
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
  // Normalize each factor to a 0-1 scale before weighting
  const normalizedPowerScoreDiff = Math.min(1, powerScoreDiff / 100);
  const normalizedSosDiff = Math.min(1, sosDiff);
  const normalizedRecordDiff = Math.min(1, recordDiff);
  const normalizedGameRecordDiff = Math.min(1, gameRecordDiff);
  
  // Apply weights to each factor - division penalty takes precedence
  const baseScore = 10 - (
    normalizedPowerScoreDiff * 3 +  // Reduced from 4 to make room for division
    normalizedSosDiff * 1.5 +       // Reduced from 2
    normalizedRecordDiff * 2 +       // Reduced from 2.5
    normalizedGameRecordDiff * 1     // Reduced from 1.5
  );
  
  // Apply division penalty - cross-division pairings get heavily penalized
  const finalScore = Math.max(0, baseScore - divisionBonus);
  
  // Ensure the score is within a reasonable range (0-10)
  return Math.max(0, Math.min(10, finalScore));
}

/**
 * Get cached or freshly calculated compatibility score
 */
export function getCompatibilityScore(team1: Team, team2: Team): number {
  return getCachedCompatibilityScore(team1, team2, calculateTeamCompatibility);
}

/**
 * Check if two teams have played each other before
 */
export async function haveTeamsPlayed(team1Id: string, team2Id: string): Promise<boolean> {
  return getCachedMatchHistory(team1Id, team2Id, checkTeamsPlayedHistory);
}

/**
 * Actual database query to check if teams have played before
 */
async function checkTeamsPlayedHistory(team1Id: string, team2Id: string): Promise<boolean> {
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
    console.error('Error in checkTeamsPlayedHistory:', error);
    // Return false as a fallback to avoid blocking match generation
    return false;
  }
}

/**
 * Enhanced compatibility calculation with configurable parameters
 */
export function calculateConfigurableCompatibility(
  team1: Team, 
  team2: Team,
  config: { 
    powerScoreWeight?: number,
    sosWeight?: number,
    recordWeight?: number,
    gameRecordWeight?: number,
    divisionWeight?: number
  } = {}
): number {
  // Division compatibility - heavily prioritize same division matchups
  const sameDivision = (team1.division || team1.division_id) === (team2.division || team2.division_id);
  const divisionPenalty = sameDivision ? 0 : (config.divisionWeight ?? 4);
  
  // Default weights (adjusted to accommodate division weight)
  const weights = {
    powerScore: config.powerScoreWeight ?? 3,
    sos: config.sosWeight ?? 1.5,
    record: config.recordWeight ?? 2,
    gameRecord: config.gameRecordWeight ?? 1
  };
  
  // Calculate differences
  const powerScoreDiff = Math.abs((team1.power_score || 0) - (team2.power_score || 0));
  const sosDiff = Math.abs((team1.sos || 0.5) - (team2.sos || 0.5));
  
  // Win percentages
  const team1WinPct = team1.wins / (team1.wins + team1.losses || 1);
  const team2WinPct = team2.wins / (team2.wins + team2.losses || 1);
  const recordDiff = Math.abs(team1WinPct - team2WinPct);
  
  // Game win percentages
  const team1GameWinPct = team1.game_wins / (team1.game_wins + team1.game_losses || 1);
  const team2GameWinPct = team2.game_wins / (team2.game_wins + team2.game_losses || 1);
  const gameRecordDiff = Math.abs(team1GameWinPct - team2GameWinPct);
  
  // Normalize and weight
  const normalizedPowerScoreDiff = Math.min(1, powerScoreDiff / 100);
  const normalizedSosDiff = Math.min(1, sosDiff);
  const normalizedRecordDiff = Math.min(1, recordDiff);
  const normalizedGameRecordDiff = Math.min(1, gameRecordDiff);
  
  // Calculate base score from performance metrics
  const baseScore = 10 - (
    normalizedPowerScoreDiff * weights.powerScore + 
    normalizedSosDiff * weights.sos + 
    normalizedRecordDiff * weights.record + 
    normalizedGameRecordDiff * weights.gameRecord
  );
  
  // Apply division penalty - cross-division pairings get heavily penalized
  const finalScore = Math.max(0, baseScore - divisionPenalty);
  
  // Ensure the score is within a reasonable range (0-10)
  return Math.max(0, Math.min(10, finalScore));
}

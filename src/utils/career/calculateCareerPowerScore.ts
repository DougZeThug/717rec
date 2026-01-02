
import { supabase } from "@/integrations/supabase/client";

interface CareerPowerScoreInput {
  teamId: string;
  championshipDivisions: string[];
  runnerUpDivisions: string[];
  careerPlayoffWins: number;
  careerPlayoffLosses: number;
  competitivePlayoffWins: number;
  teamDivisionWeight: number;
}

/**
 * Gets championship weight based on division name.
 * Matches the 4 playoff division tiers.
 */
const getChampionshipWeight = (divisionName: string): number => {
  const name = divisionName.toLowerCase();
  // Competitive playoff (weight 1.0)
  if (name.includes('competitive')) return 1.0;
  // Intermediate High playoff (weight 0.70)
  if (name.includes('intermediate high') || name.includes('intermediate 1') || name === 'cuspers') return 0.70;
  // Intermediate Low playoff (weight 0.45)
  if (name.includes('intermediate low') || name.includes('intermediate 2') || name === 'intermediate') return 0.45;
  // Recreational (weight 0.25)
  return 0.25;
};

/**
 * Calculates career power score as weighted average of season power scores + playoff bonuses.
 * This function requires database access for current season data.
 */
export const calculateCareerPowerScore = async ({
  teamId,
  championshipDivisions,
  runnerUpDivisions,
  careerPlayoffWins,
  careerPlayoffLosses,
  competitivePlayoffWins,
  teamDivisionWeight
}: CareerPowerScoreInput): Promise<number> => {
  // Fetch season stats and current team data in parallel
  const [seasonStatsResult, currentTeamDataResult] = await Promise.all([
    supabase
      .from('team_season_stats')
      .select('power_score, match_wins, match_losses')
      .eq('team_id', teamId)
      .not('power_score', 'is', null),
    supabase
      .from('v_team_details')
      .select('power_score, wins, losses')
      .eq('team_id', teamId)
      .single()
  ]);

  const seasonStats = seasonStatsResult.data;
  const currentTeamData = currentTeamDataResult.data;

  // Calculate weighted average of season power scores (no division penalties)
  let totalWeightedScore = 0;
  let totalMatches = 0;
  
  // Add historical season data (power scores are already on 0-1 scale, multiply by 100)
  if (seasonStats && seasonStats.length > 0) {
    for (const season of seasonStats) {
      const seasonMatches = (season.match_wins || 0) + (season.match_losses || 0);
      if (seasonMatches > 0 && season.power_score !== null) {
        totalWeightedScore += (season.power_score * 100) * seasonMatches;
        totalMatches += seasonMatches;
      }
    }
  }
  
  // Add current season data if available (power score already on 0-100 scale)
  if (currentTeamData?.power_score !== null && currentTeamData?.wins !== null && currentTeamData?.losses !== null) {
    const currentSeasonMatches = (currentTeamData.wins || 0) + (currentTeamData.losses || 0);
    if (currentSeasonMatches > 0) {
      totalWeightedScore += currentTeamData.power_score * currentSeasonMatches;
      totalMatches += currentSeasonMatches;
    }
  }
  
  // Base career score is the weighted average (no division penalties applied)
  let baseCareerScore = totalMatches > 0 ? totalWeightedScore / totalMatches : 50;

  // Calculate championship bonus - each scaled by its historical division weight
  let championshipBonus = 0;
  for (const divName of championshipDivisions) {
    championshipBonus += 7 * getChampionshipWeight(divName);
  }

  // Calculate runner-up bonus - each scaled by its historical division weight
  let runnerUpBonus = 0;
  for (const divName of runnerUpDivisions) {
    runnerUpBonus += 4 * getChampionshipWeight(divName);
  }
  
  // Playoff performance bonus from playoff record (uses current division weight)
  const totalPlayoffMatches = careerPlayoffWins + careerPlayoffLosses;
  const playoffWinRate = totalPlayoffMatches > 0 ? careerPlayoffWins / totalPlayoffMatches : 0;
  const otherPlayoffBonus = Math.max(0, (playoffWinRate - 0.5) * 4 * teamDivisionWeight);
  
  // Competitive playoff bonus: +0.5 for each win in competitive division playoffs
  const competitivePlayoffBonus = competitivePlayoffWins * 0.5;
  
  // Total playoff bonus (capped at +15 points)
  const totalPlayoffBonus = Math.min(15, championshipBonus + runnerUpBonus + otherPlayoffBonus + competitivePlayoffBonus);
  
  // Final career power score
  return Math.min(100, baseCareerScore + totalPlayoffBonus);
};

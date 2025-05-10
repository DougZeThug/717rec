
import { Team } from "@/types";
import { 
  TimeBlockTeamsMap, 
  TeamPairingMap, 
  TeamPairing, 
  AutoScheduleMatch 
} from "@/types/autoSchedule";
import { format } from "date-fns";
import { TIME_BLOCKS } from "./constants";

/**
 * Validate team counts in each time block to identify potential issues
 */
export function validateTeamCounts(timeBlockTeams: TimeBlockTeamsMap) {
  const oddBlocks: string[] = [];
  const insufficientBlocks: string[] = [];
  
  Object.entries(timeBlockTeams).forEach(([block, teams]) => {
    if (teams.length % 2 !== 0) {
      oddBlocks.push(block);
    }
    
    if (teams.length < 2) {
      insufficientBlocks.push(block);
    }
  });
  
  return {
    isValid: insufficientBlocks.length < Object.keys(timeBlockTeams).length,
    oddBlocks,
    insufficientBlocks
  };
}

/**
 * Handle odd numbers of teams by identifying which teams will remain unmatched
 */
export function handleOddTeams(timeBlockTeams: TimeBlockTeamsMap) {
  const adjustedTeams: TimeBlockTeamsMap = {};
  const unmatchedTeamIds: string[] = [];
  
  // Process each time block
  Object.entries(timeBlockTeams).forEach(([block, teams]) => {
    // If odd number of teams, remove one team
    if (teams.length % 2 !== 0 && teams.length > 1) {
      // Find team with least impact if left unmatched
      // For now, simply use the last team as unmatched
      const unmatchedTeam = teams[teams.length - 1];
      unmatchedTeamIds.push(unmatchedTeam.id);
      
      // Add all teams except the unmatched one
      adjustedTeams[block] = teams.slice(0, teams.length - 1);
    } else {
      adjustedTeams[block] = [...teams];
    }
  });
  
  return {
    adjustedTeams,
    unmatchedTeamIds
  };
}

/**
 * Calculate team statistics for improved insights
 * @param teams Array of teams to analyze
 * @returns Statistics about the teams
 */
export function calculateTeamStats(teams: Team[]) {
  if (!teams || teams.length === 0) {
    return {
      averagePowerScore: 0,
      powerScoreRange: { min: 0, max: 0 },
      winPercentageRange: { min: 0, max: 0 }
    };
  }
  
  // Calculate power score stats
  const powerScores = teams.map(t => t.power_score || 0);
  const averagePowerScore = powerScores.reduce((sum, score) => sum + score, 0) / teams.length;
  const minPowerScore = Math.min(...powerScores);
  const maxPowerScore = Math.max(...powerScores);
  
  // Calculate win percentage stats
  const winPercentages = teams.map(t => {
    const total = t.wins + t.losses;
    return total > 0 ? t.wins / total : 0;
  });
  const minWinPct = Math.min(...winPercentages);
  const maxWinPct = Math.max(...winPercentages);
  
  return {
    averagePowerScore,
    powerScoreRange: { min: minPowerScore, max: maxPowerScore },
    winPercentageRange: { min: minWinPct, max: maxWinPct }
  };
}

/**
 * Convert team pairings to match format for the database
 */
export function convertPairingsToMatches(
  pairings: TeamPairingMap,
  date: Date
): AutoScheduleMatch[] {
  const matches: AutoScheduleMatch[] = [];
  
  Object.entries(pairings).forEach(([block, blockPairings]) => {
    blockPairings.forEach((pairing, index) => {
      // Alternate between main and secondary timeslots
      const timeslot = index % 2 === 0 
        ? TIME_BLOCKS[block].main 
        : TIME_BLOCKS[block].secondary;
      
      matches.push({
        id: `${Date.now()}-${block}-${index}`,
        team1Id: pairing.team1.id,
        team2Id: pairing.team2.id,
        timeslot,
        date
      });
    });
  });
  
  return matches;
}

/**
 * Analyze the quality of generated matches
 */
export function analyzeMatchQuality(pairings: TeamPairingMap) {
  let totalMatches = 0;
  let totalCompatibilityScore = 0;
  let rematchCount = 0;
  
  Object.values(pairings).forEach(blockPairings => {
    totalMatches += blockPairings.length;
    
    blockPairings.forEach(pairing => {
      totalCompatibilityScore += pairing.compatibilityScore;
      if (pairing.hasPlayedBefore) rematchCount++;
    });
  });
  
  const averageCompatibilityScore = totalMatches > 0 
    ? totalCompatibilityScore / totalMatches 
    : 0;
  
  return {
    totalMatches,
    rematchCount,
    averageCompatibilityScore,
    qualityRating: averageCompatibilityScore >= 7 ? "Excellent" : 
                   averageCompatibilityScore >= 5 ? "Good" : "Fair"
  };
}

/**
 * Format a date for display in the UI
 */
export function formatScheduleDate(date: Date | null): string {
  if (!date) return "";
  return format(date, "EEEE, MMMM d, yyyy");
}

/**
 * Get summary statistics for a set of time block teams
 */
export function getTimeBlocksStatistics(timeBlockTeams: TimeBlockTeamsMap) {
  const blocks = Object.keys(timeBlockTeams);
  
  if (blocks.length === 0) {
    return { total: 0, odd: 0 };
  }
  
  let totalTeams = 0;
  let oddBlocks = 0;
  
  Object.entries(timeBlockTeams).forEach(([block, teams]) => {
    totalTeams += teams.length;
    if (teams.length % 2 !== 0) oddBlocks++;
  });
  
  return { total: totalTeams, odd: oddBlocks };
}

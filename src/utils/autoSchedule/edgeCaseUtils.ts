import { Team } from "@/types";
import { TimeBlockTeamsMap } from "@/types/autoSchedule";

/**
 * Handle time blocks that have an odd number of teams
 * Returns the modified teams map and any unmatched team IDs
 */
export function handleOddTeams(timeBlockTeams: TimeBlockTeamsMap): {
  adjustedTeams: TimeBlockTeamsMap;
  unmatchedTeamIds: string[];
} {
  const adjustedTeams: TimeBlockTeamsMap = {};
  const unmatchedTeamIds: string[] = [];
  
  // Process each time block
  Object.entries(timeBlockTeams).forEach(([block, teams]) => {
    // If even number of teams, keep as is
    if (teams.length % 2 === 0) {
      adjustedTeams[block] = [...teams];
      return;
    }
    
    // For odd number of teams, find the best team to exclude
    const teamToExclude = findTeamToExclude(teams, block);
    unmatchedTeamIds.push(teamToExclude.id);
    
    // Add all teams except the excluded one
    adjustedTeams[block] = teams.filter(team => team.id !== teamToExclude.id);
  });
  
  return { adjustedTeams, unmatchedTeamIds };
}

/**
 * Find the best team to exclude when there's an odd number
 * Strategy: Exclude team with lowest priority based on various factors
 */
function findTeamToExclude(teams: Team[], timeBlock: string): Team {
  // Sort teams by a priority score (lower is more likely to be excluded)
  const scoredTeams = teams.map(team => ({
    team,
    // Calculate priority score based on multiple factors
    // Lower score = more likely to be excluded
    score: calculateExclusionScore(team, timeBlock)
  }));
  
  // Sort by score (ascending)
  scoredTeams.sort((a, b) => a.score - b.score);
  
  // Return the team with the lowest score (most suitable for exclusion)
  return scoredTeams[0].team;
}

/**
 * Calculate a score determining how suitable a team is for exclusion
 * Higher score = less likely to exclude
 */
function calculateExclusionScore(team: Team, timeBlock: string): number {
  // Start with base score
  let score = 50;
  
  // Teams with more scheduled games should be less likely to be excluded
  score += (team.wins + team.losses) * 2;
  
  // Teams with higher power scores should be less likely to be excluded
  score += (team.power_score || 0) / 5;
  
  // Consider win-loss record
  // Teams with very good or very bad records get higher score to maintain competitive balance
  const winPct = team.wins / (team.wins + team.losses || 1);
  const balanceFactor = Math.abs(0.5 - winPct) * 10; // 0-5 points
  score += balanceFactor;
  
  // Random factor (0-10) to avoid always excluding the same teams
  score += Math.random() * 10;
  
  return score;
}

/**
 * Validate if there are enough teams to create matches
 */
export function validateTeamCounts(timeBlockTeams: TimeBlockTeamsMap): {
  isValid: boolean;
  insufficientBlocks: string[];
} {
  const insufficientBlocks: string[] = [];
  
  // Check each time block
  Object.entries(timeBlockTeams).forEach(([block, teams]) => {
    // Need at least 2 teams to make a match
    if (teams.length < 2) {
      insufficientBlocks.push(block);
    }
  });
  
  return {
    isValid: insufficientBlocks.length === 0,
    insufficientBlocks
  };
}

/**
 * Check for teams that were excluded in previous schedules
 * to ensure fairness over time
 */
export function trackExcludedTeams(
  unmatchedTeamIds: string[],
  previouslyExcludedIds: string[] = []
): string[] {
  // Combine previous and new excluded teams
  return [...previouslyExcludedIds, ...unmatchedTeamIds];
}

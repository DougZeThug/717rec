import { Team } from '@/types';
import { TimeBlockTeamsMap } from '@/types/autoSchedule';

import { BACK_TO_BACK_PAIRS } from './constants';

/**
 * Handle odd team counts in back-to-back pairs
 * Since teams always play back-to-back, we need even numbers in each pair
 */
export function handleOddTeams(timeBlockTeams: TimeBlockTeamsMap): {
  adjustedTeams: TimeBlockTeamsMap;
  unmatchedTeamIds: string[];
  unmatchedTeamDetails: Array<{
    teamId: string;
    teamName: string;
    block: string;
  }>;
} {
  const adjustedTeams: TimeBlockTeamsMap = {};
  const unmatchedTeamIds: string[] = [];
  const unmatchedTeamDetails: Array<{
    teamId: string;
    teamName: string;
    block: string;
  }> = [];

  // Process each back-to-back pair
  Object.entries(timeBlockTeams).forEach(([pairName, teams]) => {
    if (!teams || teams.length === 0) {
      adjustedTeams[pairName] = [];
      return;
    }

    // For back-to-back scheduling, we need even numbers of teams in each pair
    if (teams.length % 2 === 0) {
      // Even number - no adjustment needed
      adjustedTeams[pairName] = [...teams];
    } else {
      // Odd number - remove one team (the last one by default)
      const teamsCopy = [...teams];
      const removedTeam = teamsCopy.pop();

      if (removedTeam) {
        unmatchedTeamIds.push(removedTeam.id);
        unmatchedTeamDetails.push({
          teamId: removedTeam.id,
          teamName: removedTeam.name,
          block: pairName,
        });
      }

      adjustedTeams[pairName] = teamsCopy;
    }
  });

  return { adjustedTeams, unmatchedTeamIds, unmatchedTeamDetails };
}

/**
 * Validate team counts for back-to-back pairs
 * Each pair needs at least 4 teams (2 matches) and even numbers
 */
export function validateTeamCounts(timeBlockTeams: TimeBlockTeamsMap): {
  isValid: boolean;
  insufficientBlocks: string[];
  hasOddBlocks: boolean;
  oddBlocks: string[];
  totalTeams: number;
} {
  const insufficientBlocks: string[] = [];
  const oddBlocks: string[] = [];
  let totalTeams = 0;

  Object.entries(timeBlockTeams).forEach(([pairName, teams]) => {
    const teamCount = teams?.length || 0;
    totalTeams += teamCount;

    // For back-to-back pairs, minimum is 4 teams (2 matches)
    if (teamCount > 0 && teamCount < 4) {
      insufficientBlocks.push(pairName);
    }

    // Check for odd numbers
    if (teamCount % 2 !== 0) {
      oddBlocks.push(pairName);
    }
  });

  const isValid = insufficientBlocks.length === 0;
  const hasOddBlocks = oddBlocks.length > 0;

  return {
    isValid,
    insufficientBlocks,
    hasOddBlocks,
    oddBlocks,
    totalTeams,
  };
}

/**
 * Generate summary of team distribution across back-to-back pairs
 */
export function generateTeamDistributionSummary(timeBlockTeams: TimeBlockTeamsMap): {
  totalTeams: number;
  totalMatches: number;
  unpairedTeams: number;
  pairSummary: Array<{
    pairName: string;
    teamCount: number;
    matchCount: number;
    hasOddTeams: boolean;
  }>;
} {
  let totalTeams = 0;
  let totalMatches = 0;
  let unpairedTeams = 0;
  const pairSummary: Array<{
    pairName: string;
    teamCount: number;
    matchCount: number;
    hasOddTeams: boolean;
  }> = [];

  Object.entries(timeBlockTeams).forEach(([pairName, teams]) => {
    const teamCount = teams?.length || 0;
    const matchCount = Math.floor(teamCount / 2); // Each match requires 2 teams
    const hasOddTeams = teamCount % 2 !== 0;

    totalTeams += teamCount;
    totalMatches += matchCount;

    if (hasOddTeams) {
      unpairedTeams += 1; // One unpaired team per odd pair
    }

    pairSummary.push({
      pairName,
      teamCount,
      matchCount,
      hasOddTeams,
    });
  });

  return {
    totalTeams,
    totalMatches,
    unpairedTeams,
    pairSummary,
  };
}

/**
 * Validate back-to-back pair assignments
 * Ensures teams are properly assigned to both timeslots in a pair
 */
export function validateBackToBackPairAssignments(timeBlockTeams: TimeBlockTeamsMap): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  Object.entries(timeBlockTeams).forEach(([pairName, teams]) => {
    if (!teams || teams.length === 0) {
      warnings.push(`No teams assigned to ${pairName} pair`);
      return;
    }

    // Check if pair name is valid
    if (!BACK_TO_BACK_PAIRS[pairName as keyof typeof BACK_TO_BACK_PAIRS]) {
      errors.push(`Invalid pair name: ${pairName}`);
      return;
    }

    // Check minimum team count for meaningful matches
    if (teams.length < 4) {
      warnings.push(
        `${pairName} pair has only ${teams.length} teams (minimum 4 recommended for 2 matches)`
      );
    }

    // Check for odd team counts
    if (teams.length % 2 !== 0) {
      warnings.push(
        `${pairName} pair has odd number of teams (${teams.length}) - one team will be unmatched`
      );
    }

    // Check for duplicate teams within the pair
    const teamIds = teams.map((team) => team.id);
    const uniqueTeamIds = new Set(teamIds);
    if (teamIds.length !== uniqueTeamIds.size) {
      errors.push(`${pairName} pair contains duplicate team assignments`);
    }
  });

  // Check for teams assigned to multiple pairs
  const allTeamIds: string[] = [];
  Object.values(timeBlockTeams).forEach((teams) => {
    teams?.forEach((team) => allTeamIds.push(team.id));
  });

  const uniqueAllTeamIds = new Set(allTeamIds);
  if (allTeamIds.length !== uniqueAllTeamIds.size) {
    errors.push('Some teams are assigned to multiple back-to-back pairs');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get recommended team count for optimal back-to-back scheduling
 */
export function getRecommendedTeamCount(currentCount: number): number {
  if (currentCount <= 0) return 4; // Minimum for 2 matches

  // Round up to next even number if odd
  if (currentCount % 2 !== 0) {
    return currentCount + 1;
  }

  return currentCount;
}

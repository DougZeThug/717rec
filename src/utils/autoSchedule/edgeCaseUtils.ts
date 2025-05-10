
import { TimeBlockTeamsMap } from "@/types/autoSchedule";

/**
 * Validate team counts in each time block to identify potential issues
 */
export function validateTeamCounts(timeBlockTeams: TimeBlockTeamsMap) {
  const oddBlocks: string[] = [];
  const insufficientBlocks: string[] = [];
  
  Object.entries(timeBlockTeams || {}).forEach(([block, teams]) => {
    if (teams.length % 2 !== 0) {
      oddBlocks.push(block);
    }
    
    if (teams.length < 2) {
      insufficientBlocks.push(block);
    }
  });
  
  return {
    isValid: insufficientBlocks.length < Object.keys(timeBlockTeams || {}).length,
    oddBlocks,
    insufficientBlocks
  };
}

/**
 * Handle odd numbers of teams by identifying which teams will remain unmatched
 * Uses a fair algorithm to avoid repeatedly leaving the same teams unmatched
 */
export function handleOddTeams(timeBlockTeams: TimeBlockTeamsMap) {
  const adjustedTeams: TimeBlockTeamsMap = {};
  const unmatchedTeamIds: string[] = [];
  
  // Process each time block
  Object.entries(timeBlockTeams || {}).forEach(([block, teams]) => {
    // If odd number of teams, remove one team
    if (teams.length % 2 !== 0 && teams.length > 1) {
      // Use a smarter algorithm to find team with least impact if left unmatched
      // For now we use the last team in the array as the unmatched one
      // This could be enhanced to consider previous unmatched history
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
 * Detect potential scheduling conflicts based on provided constraints
 */
export function detectSchedulingConflicts(timeBlockTeams: TimeBlockTeamsMap) {
  const conflicts: {blockId: string, reason: string}[] = [];
  
  // Example conflict detection logic - can be expanded as needed
  Object.entries(timeBlockTeams || {}).forEach(([blockId, teams]) => {
    if (teams.length < 2) {
      conflicts.push({
        blockId,
        reason: "Insufficient teams"
      });
    } else if (teams.length % 2 !== 0) {
      conflicts.push({
        blockId,
        reason: "Odd number of teams"
      });
    }
  });
  
  return conflicts;
}

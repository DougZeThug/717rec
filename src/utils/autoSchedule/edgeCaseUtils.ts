import { TimeBlockTeamsMap } from "@/types/autoSchedule";

/**
 * Validate team counts in time blocks to detect edge cases
 */
export const validateTeamCounts = (timeBlockTeams: TimeBlockTeamsMap) => {
  // Check if there are any time blocks at all
  if (!timeBlockTeams || Object.keys(timeBlockTeams).length === 0) {
    return {
      isValid: false,
      oddBlocks: 0,
      insufficientBlocks: [],
      emptyBlocks: []
    };
  }
  
  const oddBlocks: string[] = [];
  const insufficientBlocks: string[] = [];
  const emptyBlocks: string[] = [];
  
  Object.entries(timeBlockTeams).forEach(([block, teams]) => {
    // Check for empty blocks
    if (teams.length === 0) {
      emptyBlocks.push(block);
    }
    
    // Check for odd number of teams
    if (teams.length % 2 !== 0) {
      oddBlocks.push(block);
    }
    
    // Check if there are enough teams to create at least one match
    if (teams.length < 2) {
      insufficientBlocks.push(block);
    }
  });
  
  // A time block is valid if it has enough teams for at least one match
  const isValid = insufficientBlocks.length < Object.keys(timeBlockTeams).length;
  
  return {
    isValid,
    oddBlocks,
    insufficientBlocks,
    emptyBlocks,
  };
};

/**
 * Handle odd number of teams by identifying teams to exclude
 */
export const handleOddTeams = (timeBlockTeams: TimeBlockTeamsMap) => {
  const adjustedTeams: TimeBlockTeamsMap = {};
  const unmatchedTeamIds: string[] = [];
  
  Object.entries(timeBlockTeams).forEach(([block, teams]) => {
    if (teams.length % 2 !== 0 && teams.length > 0) {
      // Odd number of teams - remove the last team
      const lastTeam = teams[teams.length - 1];
      unmatchedTeamIds.push(lastTeam.id);
      
      // Keep all teams except the last one
      adjustedTeams[block] = teams.slice(0, teams.length - 1);
      
      console.log(`Block ${block} has odd number of teams (${teams.length}). Excluding team: ${lastTeam.name} (${lastTeam.id})`);
    } else {
      // Even number of teams - keep as is
      adjustedTeams[block] = [...teams];
    }
  });
  
  return {
    adjustedTeams,
    unmatchedTeamIds
  };
};

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

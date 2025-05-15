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
    hasOddBlocks: oddBlocks.length > 0
  };
};

/**
 * Enhanced function to handle odd teams by intelligently selecting which team to exclude
 */
export const handleOddTeams = (timeBlockTeams: TimeBlockTeamsMap) => {
  const adjustedTeams: TimeBlockTeamsMap = {};
  const unmatchedTeamIds: string[] = [];
  const unmatchedTeamDetails: { 
    timeBlock: string; 
    team: { id: string; name: string; }
  }[] = [];
  
  Object.entries(timeBlockTeams).forEach(([block, teams]) => {
    if (teams.length % 2 !== 0 && teams.length > 0) {
      // Enhanced strategy: Use team stats to decide which team to exclude
      // For now, we'll still remove the last team, but we log more details
      const lastTeam = teams[teams.length - 1];
      unmatchedTeamIds.push(lastTeam.id);
      
      // Store more details about the unmatched team for display
      unmatchedTeamDetails.push({
        timeBlock: block,
        team: {
          id: lastTeam.id,
          name: lastTeam.name
        }
      });
      
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
    unmatchedTeamIds,
    unmatchedTeamDetails
  };
};

/**
 * Detect potential scheduling conflicts based on provided constraints
 */
export function detectSchedulingConflicts(timeBlockTeams: TimeBlockTeamsMap) {
  const conflicts: {blockId: string, reason: string, severity: 'warning' | 'error'}[] = [];
  
  // Enhanced conflict detection logic with severity levels
  Object.entries(timeBlockTeams || {}).forEach(([blockId, teams]) => {
    if (teams.length === 0) {
      conflicts.push({
        blockId,
        reason: "No teams assigned",
        severity: 'warning'
      });
    } else if (teams.length === 1) {
      conflicts.push({
        blockId,
        reason: "Only one team assigned, needs at least two",
        severity: 'error'
      });
    } else if (teams.length % 2 !== 0) {
      conflicts.push({
        blockId,
        reason: `Odd number of teams (${teams.length})`,
        severity: 'warning'
      });
    }
  });
  
  return conflicts;
}

/**
 * Generate a user-friendly summary of team distribution
 */
export function generateTeamDistributionSummary(timeBlockTeams: TimeBlockTeamsMap) {
  if (!timeBlockTeams || Object.keys(timeBlockTeams).length === 0) {
    return {
      totalTeams: 0,
      totalMatches: 0,
      unpairedTeams: 0,
      blockSummaries: {}
    };
  }
  
  let totalTeams = 0;
  let totalMatches = 0;
  let unpairedTeams = 0;
  const blockSummaries: Record<string, {
    teams: number;
    matches: number;
    unpaired: number;
    isOdd: boolean;
  }> = {};
  
  Object.entries(timeBlockTeams).forEach(([block, teams]) => {
    const count = teams.length;
    const isOdd = count % 2 !== 0;
    const matches = Math.floor(count / 2);
    const unpaired = isOdd ? 1 : 0;
    
    totalTeams += count;
    totalMatches += matches;
    unpairedTeams += unpaired;
    
    blockSummaries[block] = {
      teams: count,
      matches,
      unpaired,
      isOdd
    };
  });
  
  return {
    totalTeams,
    totalMatches,
    unpairedTeams,
    blockSummaries
  };
}

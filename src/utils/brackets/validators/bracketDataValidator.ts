import { PlayoffMatch, PlayoffTeam } from "@/utils/playoffs/playoffTypes";

/**
 * Validates bracket data for completeness and consistency
 */
export interface BracketValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateBracketData(
  matches: PlayoffMatch[],
  teams: PlayoffTeam[]
): BracketValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate matches array
  if (!Array.isArray(matches)) {
    errors.push("Matches must be an array");
    return { isValid: false, errors, warnings };
  }

  // Validate teams array
  if (!Array.isArray(teams)) {
    errors.push("Teams must be an array");
    return { isValid: false, errors, warnings };
  }

  // Create team ID set for validation
  const teamIds = new Set(teams.map(team => team.id));

  // Validate each match
  matches.forEach((match, index) => {
    if (!match.id) {
      errors.push(`Match ${index + 1} missing ID`);
    }

    if (typeof match.round !== 'number' || match.round < 1) {
      errors.push(`Match ${index + 1} has invalid round: ${match.round}`);
    }

    // Validate team references
    if (match.team1Id && !teamIds.has(match.team1Id)) {
      warnings.push(`Match ${index + 1} references unknown team1Id: ${match.team1Id}`);
    }

    if (match.team2Id && !teamIds.has(match.team2Id)) {
      warnings.push(`Match ${index + 1} references unknown team2Id: ${match.team2Id}`);
    }

    // Validate winner consistency
    if (match.winnerId) {
      if (!teamIds.has(match.winnerId)) {
        errors.push(`Match ${index + 1} has invalid winnerId: ${match.winnerId}`);
      } else if (match.winnerId !== match.team1Id && match.winnerId !== match.team2Id) {
        errors.push(`Match ${index + 1} winnerId must be one of the participating teams`);
      }
    }

    // Validate scores when match is completed
    if (match.status === 'completed') {
      if (!match.winnerId) {
        warnings.push(`Match ${index + 1} is completed but has no winner`);
      }
      
      if (match.team1Score === null || match.team2Score === null) {
        warnings.push(`Match ${index + 1} is completed but missing scores`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates match connections for bracket integrity
 */
export function validateMatchConnections(matches: PlayoffMatch[]): BracketValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const matchIds = new Set(matches.map(m => m.id));

  matches.forEach((match, index) => {
    // Validate next match references
    if (match.nextWinMatchId && !matchIds.has(match.nextWinMatchId)) {
      errors.push(`Match ${index + 1} references invalid nextWinMatchId: ${match.nextWinMatchId}`);
    }

    if (match.nextLoseMatchId && !matchIds.has(match.nextLoseMatchId)) {
      errors.push(`Match ${index + 1} references invalid nextLoseMatchId: ${match.nextLoseMatchId}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
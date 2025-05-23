
import { PlayoffMatch, Team } from "@/types";
import { BracketData, PlayoffMatchTransformed, PlayoffTeamTransformed } from "./types";
import { BRACKET_FORMATS } from "@/constants/brackets";

/**
 * Transform our app's data format to brackets-viewer format
 * This handles the conversion from our PlayoffMatch/Team format to the format expected by brackets-viewer.js
 */
export const transformToBracketViewerFormat = (
  matches: PlayoffMatch[],
  teams: Team[],
  format: string = BRACKET_FORMATS.SINGLE
): BracketData => {
  console.log('Transforming data for brackets-viewer:', { matches: matches.length, teams: teams.length, format });

  // Map teams to participants with proper ID conversion
  const participants: PlayoffTeamTransformed[] = teams.map((team, index) => {
    // Extract numeric ID or use index as fallback
    const numericId = extractNumericId(team.id) || (index + 1);
    
    return {
      id: numericId,
      name: team.name,
      seed: team.seed || null
    };
  });
  
  // Map matches to brackets-viewer format with proper ID conversion
  const transformedMatches: PlayoffMatchTransformed[] = matches.map((match, index) => {
    const matchId = extractNumericId(match.id) || (index + 1);
    
    // Find corresponding team IDs
    const team1Id = match.team1Id ? findTeamNumericId(match.team1Id, teams) : null;
    const team2Id = match.team2Id ? findTeamNumericId(match.team2Id, teams) : null;
    const winnerId = match.winnerId ? findTeamNumericId(match.winnerId, teams) : null;
    const loserId = match.loserId ? findTeamNumericId(match.loserId, teams) : null;
    
    return {
      id: matchId,
      round: match.round,
      position: match.position,
      participant1_id: team1Id,
      participant2_id: team2Id,
      winner_id: winnerId,
      loser_id: loserId,
      status: match.status || 'pending',
      // Handle prerequisite matches for bracket flow
      participant1_prereq_match_id: match.nextWinMatchId 
        ? extractNumericId(match.nextWinMatchId) 
        : null,
      participant2_prereq_match_id: match.nextLoseMatchId
        ? extractNumericId(match.nextLoseMatchId) 
        : null,
      participant1_is_prereq_match_loser: false, // This would need more logic for double elimination
      participant2_is_prereq_match_loser: false
    };
  });

  const result = {
    participants,
    matches: transformedMatches,
  };

  console.log('Transformation complete:', result);
  return result;
};

/**
 * Extract numeric ID from a string ID (handles UUIDs and other formats)
 */
function extractNumericId(id: string): number | null {
  // Try to extract numbers from the ID
  const numbers = id.replace(/\D/g, '');
  if (numbers) {
    // Take first 8 digits to avoid overflow
    const truncated = numbers.substring(0, 8);
    return parseInt(truncated) || null;
  }
  return null;
}

/**
 * Find the numeric ID for a team given its string ID
 */
function findTeamNumericId(teamId: string, teams: Team[]): number | null {
  const teamIndex = teams.findIndex(team => team.id === teamId);
  if (teamIndex >= 0) {
    return extractNumericId(teamId) || (teamIndex + 1);
  }
  return null;
}

/**
 * Get just a single match by ID from the transformed data
 */
export const getTransformedMatchById = (
  bracketData: BracketData,
  matchId: string
): PlayoffMatchTransformed | null => {
  const numericId = extractNumericId(matchId) || parseInt(matchId);
  return bracketData.matches.find(match => match.id === numericId) || null;
};

/**
 * Get a team name by ID from the transformed data
 */
export const getTeamNameById = (
  bracketData: BracketData,
  teamId: number | null
): string => {
  if (!teamId) return 'TBD';
  const team = bracketData.participants.find(p => p.id === teamId);
  return team ? team.name : 'Unknown Team';
};

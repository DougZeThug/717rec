
import { PlayoffMatch, Team } from "@/types";
import { BracketData, PlayoffMatchTransformed, PlayoffTeamTransformed } from "./types";
import { BRACKET_FORMATS } from "@/constants/brackets";

/**
 * Simple utility to transform our app's data format to brackets-viewer format
 * This is a basic implementation for Phase 1, will be expanded in Phase 2
 */
export const transformToBracketViewerFormat = (
  matches: PlayoffMatch[],
  teams: Team[],
  format = BRACKET_FORMATS.SINGLE
): BracketData => {
  // Map teams to participants
  const participants: PlayoffTeamTransformed[] = teams.map((team) => ({
    id: parseInt(team.id.replace(/\D/g, '')) || teams.indexOf(team) + 1, // Remove non-digits or use index
    name: team.name,
    seed: team.seed || null
  }));
  
  // Map matches to brackets-viewer format
  const transformedMatches: PlayoffMatchTransformed[] = matches.map((match) => {
    // Transform our IDs to numbers for the library
    const team1Id = match.team1Id 
      ? parseInt(match.team1Id.replace(/\D/g, '')) || null 
      : null;
    
    const team2Id = match.team2Id 
      ? parseInt(match.team2Id.replace(/\D/g, '')) || null 
      : null;
    
    const winnerId = match.winnerId 
      ? parseInt(match.winnerId.replace(/\D/g, '')) || null 
      : null;
    
    const loserId = match.loserId
      ? parseInt(match.loserId.replace(/\D/g, '')) || null
      : null;
    
    return {
      id: parseInt(match.id.replace(/\D/g, '')) || matches.indexOf(match) + 1,
      round: match.round,
      position: match.position,
      participant1_id: team1Id,
      participant2_id: team2Id,
      winner_id: winnerId,
      loser_id: loserId,
      status: match.status,
      // Simple mapping for prerequisites, will be expanded in Phase 2
      participant1_prereq_match_id: match.nextWinMatchId 
        ? parseInt(match.nextWinMatchId.replace(/\D/g, '')) || null
        : null,
      participant2_prereq_match_id: match.nextLoseMatchId
        ? parseInt(match.nextLoseMatchId.replace(/\D/g, '')) || null
        : null,
    };
  });

  return {
    participants,
    matches: transformedMatches,
  };
};

/**
 * Get just a single match by ID from the transformed data
 */
export const getTransformedMatchById = (
  bracketData: BracketData,
  matchId: string
): PlayoffMatchTransformed | null => {
  const numericId = parseInt(matchId.replace(/\D/g, '')) || parseInt(matchId);
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

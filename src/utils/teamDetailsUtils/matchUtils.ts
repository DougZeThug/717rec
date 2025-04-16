
import { Match } from "@/types";

/**
 * Separate upcoming and past matches
 */
export const getUpcomingAndPastMatches = (matches: Match[] | undefined) => {
  if (!matches) return { upcomingMatches: [], pastMatches: [] };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day
  
  const upcomingMatches = matches
    .filter(match => new Date(match.date || "") >= today)
    .sort((a, b) => new Date(a.date || "").getTime() - new Date(b.date || "").getTime());
  
  const pastMatches = matches
    .filter(match => new Date(match.date || "") < today)
    .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime());
    
  return { upcomingMatches, pastMatches };
};

/**
 * Get opponent ID for a match
 */
export const getOpponentId = (match: Match, teamId: string | undefined) => {
  return match.team1Id === teamId ? match.team2Id : match.team1Id;
};

/**
 * Get match result for a team
 */
export const getMatchResult = (match: Match, teamId: string | undefined) => {
  if (!match.iscompleted) return "Incomplete";
  return match.winnerId === teamId ? "Win" : "Loss";
};

/**
 * Get score display for a team
 */
export const getScoreDisplay = (match: Match, teamId: string | undefined) => {
  if (!match.iscompleted || match.team1Score === undefined || match.team2Score === undefined) {
    return "";
  }
  
  // If this team is team1, show scores as is, otherwise swap
  if (match.team1Id === teamId) {
    return `${match.team1Score}–${match.team2Score}`;
  } else {
    return `${match.team2Score}–${match.team1Score}`;
  }
};


import { Match, Team } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

/**
 * Structure to represent a team pairing with compatibility score
 */
interface TeamPair {
  team1: Team;
  team2: Team;
  compatibilityScore: number;
}

/**
 * Time block structure with exact timeslots
 */
interface TimeBlock {
  main: string;     // First match timeslot (e.g., "6:30 PM")
  secondary: string; // Second match timeslot (e.g., "7:00 PM")
}

/**
 * Map of time blocks with their corresponding timeslot pairs
 */
export const TIME_BLOCKS: Record<string, TimeBlock> = {
  "6:30": { main: "6:30 PM", secondary: "7:00 PM" },
  "7:30": { main: "7:30 PM", secondary: "8:00 PM" },
  "8:30": { main: "8:30 PM", secondary: "9:00 PM" }
};

/**
 * Fetches teams assigned to a specific time block for a given date
 */
export async function getTeamsByTimeBlock(date: Date, timeBlock: string): Promise<Team[]> {
  // Format date for database query
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  // Block entries for a selected date based on start time
  const { data: timeslotData, error } = await supabase
    .from('team_timeslots')
    .select(`
      team_id,
      teams:team_id (
        id,
        name,
        logo_url,
        image_url,
        division_id,
        divisionName:divisions(name),
        wins,
        losses,
        game_wins,
        game_losses,
        sos,
        power_score
      )
    `)
    .eq('match_date', formattedDate)
    .eq('timeslot', TIME_BLOCKS[timeBlock].main);

  if (error) {
    console.error('Error fetching teams by time block:', error);
    throw error;
  }

  // Extract team data and format it according to our Team type
  const teams: Team[] = timeslotData?.map(item => {
    const teamData = item.teams as any;
    return {
      id: teamData.id,
      name: teamData.name,
      logoUrl: teamData.logo_url,
      imageUrl: teamData.image_url,
      division: teamData.division_id,
      divisionName: teamData.divisionName?.name,
      wins: teamData.wins || 0,
      losses: teamData.losses || 0,
      game_wins: teamData.game_wins || 0,
      game_losses: teamData.game_losses || 0,
      sos: typeof teamData.sos === 'number' ? teamData.sos : 0.5,
      power_score: typeof teamData.power_score === 'number' ? teamData.power_score : 0,
      win_percentage: 0, // Will be calculated later if needed
      game_win_percentage: 0 // Will be calculated later if needed
    };
  }) || [];

  return teams;
}

/**
 * Check if two teams have played each other before
 */
export async function haveTeamsPlayed(team1Id: string, team2Id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('matches')
    .select('id')
    .or(`team1_id.eq.${team1Id},team2_id.eq.${team1Id}`)
    .or(`team1_id.eq.${team2Id},team2_id.eq.${team2Id}`)
    .limit(1);

  if (error) {
    console.error('Error checking if teams have played:', error);
    throw error;
  }

  return data && data.length > 0;
}

/**
 * Calculate compatibility score between two teams based on their stats
 * Higher score means teams are more evenly matched
 */
export function calculateTeamCompatibility(team1: Team, team2: Team): number {
  // Compare power scores - closer power scores are better matches
  const powerScoreDiff = Math.abs((team1.power_score || 0) - (team2.power_score || 0));
  
  // Compare strength of schedule - closer SOS values are better matches
  const sosDiff = Math.abs((team1.sos || 0.5) - (team2.sos || 0.5));
  
  // Calculate record similarity - teams with similar records are better matches
  const team1WinPct = team1.wins / (team1.wins + team1.losses || 1);
  const team2WinPct = team2.wins / (team2.wins + team2.losses || 1);
  const recordDiff = Math.abs(team1WinPct - team2WinPct);
  
  // Calculate compatibility score (lower differences = higher compatibility)
  // Weighted factors - can be adjusted to prioritize different aspects
  const compatibilityScore = 10 - (powerScoreDiff * 3 + sosDiff * 2 + recordDiff * 5);
  
  // Ensure the score is within a reasonable range
  return Math.max(0, Math.min(10, compatibilityScore));
}

/**
 * Generate all possible team pairings and sort by compatibility
 */
export function generateTeamPairings(teams: Team[]): TeamPair[] {
  const pairs: TeamPair[] = [];
  
  // Generate all possible team pairings
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];
      
      // Calculate compatibility score between the teams
      const compatibilityScore = calculateTeamCompatibility(team1, team2);
      
      pairs.push({ team1, team2, compatibilityScore });
    }
  }
  
  // Sort pairs by compatibility score (highest first)
  return pairs.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

/**
 * Filter pairs to remove any that have played before
 */
export async function filterPairsWithPreviousMatches(pairs: TeamPair[]): Promise<TeamPair[]> {
  const filteredPairs: TeamPair[] = [];
  
  for (const pair of pairs) {
    const havePlayed = await haveTeamsPlayed(pair.team1.id, pair.team2.id);
    if (!havePlayed) {
      filteredPairs.push(pair);
    }
  }
  
  return filteredPairs;
}

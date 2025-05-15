
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";
import { normalizeDate } from "@/utils/dateNormalization";

/**
 * Get teams by specific time block and date
 * Enhanced with fallback mechanism and better error handling
 */
export const getTeamsByTimeBlock = async (date: Date, timeBlock: string): Promise<Team[]> => {
  // Create a safe date at noon to prevent timezone issues
  const safeDate = new Date(date);
  safeDate.setHours(12, 0, 0, 0);
  
  // Format date consistently 
  const formattedDate = normalizeDate(safeDate, `getTeamsByTimeBlock-${timeBlock}`);
  
  console.log(`Loading teams for ${timeBlock} block on date:`, {
    original: date,
    safeDate,
    formattedDate,
    timeBlock
  });
  
  try {
    // Query team_timeslots table to find teams assigned to the given time block
    const { data: timeslots, error } = await supabase
      .from('team_timeslots')
      .select(`
        id,
        team_id,
        timeslot,
        match_date,
        teams:team_id (
          id,
          name,
          logo_url, 
          image_url,
          players,
          wins,
          losses,
          game_wins,
          game_losses,
          division_id,
          power_score,
          sos
        )
      `)
      .eq('match_date', formattedDate)
      .eq('timeslot', timeBlock);
    
    if (error) {
      console.error(`Error fetching teams for ${timeBlock} on ${formattedDate}:`, error);
      return [];
    }

    console.log(`Found ${timeslots?.length || 0} timeslots for ${timeBlock} block on ${formattedDate}`);
    
    if (!timeslots || timeslots.length === 0) {
      console.warn(`No teams found for ${timeBlock} block on ${formattedDate}, trying fallback...`);
      
      // Log what we're searching for to help with debugging
      console.log("Checking raw date format in database", {
        matchDate: formattedDate,
        dateObject: typeof date,
        dateStringValue: date.toString(),
        timeBlock
      });
      
      // Try a raw query to see what dates we actually have in the database
      const { data: availableDates } = await supabase
        .from('team_timeslots')
        .select('match_date')
        .order('match_date', { ascending: false })
        .limit(10);
        
      console.log("Available recent dates in database:", availableDates);
      
      return [];
    }
    
    // Extract teams from timeslots and restructure as Team objects
    const teams: Team[] = [];
    
    // Process each timeslot safely
    for (const slot of timeslots) {
      // Skip if no team data exists
      if (!slot.teams) continue;
      
      // Instead of directly accessing properties, use type assertion
      // to help TypeScript understand the structure
      const teamData = slot.teams as {
        id?: string;
        name?: string;
        logo_url?: string | null;
        image_url?: string | null;
        players?: any[];
        wins?: number;
        losses?: number;
        game_wins?: number;
        game_losses?: number;
        power_score?: number;
        sos?: number;
        division_id?: string;
      };
      
      // Skip if we received invalid team data
      if (!teamData.id) {
        console.warn('Received invalid team data for timeslot:', slot);
        continue;
      }
      
      // Create team object with safe property access using defaults
      teams.push({
        id: teamData.id,
        name: teamData.name || 'Unknown Team',
        logoUrl: teamData.logo_url || null,
        imageUrl: teamData.image_url || null,
        players: Array.isArray(teamData.players) ? teamData.players : [],
        wins: teamData.wins || 0,
        losses: teamData.losses || 0,
        game_wins: teamData.game_wins || 0,
        game_losses: teamData.game_losses || 0,
        power_score: typeof teamData.power_score === 'number' ? teamData.power_score : 0,
        sos: typeof teamData.sos === 'number' ? teamData.sos : 0.5,
        division: teamData.division_id
      });
    }
      
    console.log(`Processed ${teams.length} teams for ${timeBlock} block`);
    return teams;
    
  } catch (error) {
    console.error(`Unexpected error fetching teams for ${timeBlock}:`, error);
    return [];
  }
};

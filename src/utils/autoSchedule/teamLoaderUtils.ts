
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
    const teams: Team[] = timeslots
      .filter(slot => slot.teams) // Filter out slots without team data
      .map(slot => {
        const team = slot.teams;
        
        // Add type safety - make sure team object has required properties
        if (!team) {
          console.warn('Received empty team data for timeslot:', slot);
          return null;
        }
        
        // Ensure we're safely accessing team properties with fallbacks
        return {
          id: team.id || '',
          name: team.name || 'Unknown Team',
          logoUrl: team.logo_url || null,
          imageUrl: team.image_url || null,
          players: team.players || [],
          wins: team.wins || 0,
          losses: team.losses || 0,
          game_wins: team.game_wins || 0,
          game_losses: team.game_losses || 0,
          power_score: team.power_score || 0,
          sos: team.sos || 0.5,
          division: team.division_id
        };
      })
      .filter(Boolean) as Team[]; // Filter out any null entries from mapping
      
    console.log(`Processed ${teams.length} teams for ${timeBlock} block`);
    return teams;
    
  } catch (error) {
    console.error(`Unexpected error fetching teams for ${timeBlock}:`, error);
    return [];
  }
};

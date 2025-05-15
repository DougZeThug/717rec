
import { Team } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { TIME_BLOCKS } from "./constants";

/**
 * Fetches teams assigned to a specific time block for a given date
 */
export async function getTeamsByTimeBlock(date: Date, timeBlock: string): Promise<Team[]> {
  // Format date for database query
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  // Get the exact timeslot value from our constants
  const timeslotValue = TIME_BLOCKS[timeBlock]?.main;
  
  if (!timeslotValue) {
    console.error(`Invalid time block: ${timeBlock}. Available blocks:`, Object.keys(TIME_BLOCKS));
    return [];
  }
  
  console.log(`Fetching teams for date: ${formattedDate}, timeslot: ${timeslotValue}`);
  
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
    .eq('timeslot', timeslotValue);

  if (error) {
    console.error('Error fetching teams by time block:', error);
    throw error;
  }

  // Log the data we received or lack thereof
  if (!timeslotData || timeslotData.length === 0) {
    console.log(`No teams found for date ${formattedDate} at timeslot ${timeslotValue}`);
  } else {
    console.log(`Found ${timeslotData.length} teams for date ${formattedDate} at timeslot ${timeslotValue}`);
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

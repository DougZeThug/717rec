
import { Team } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { TIME_BLOCKS, findTimeBlockByValue } from "./constants";
import { normalizeDate } from "@/utils/dateNormalization";

/**
 * Fetches teams assigned to a specific time block for a given date
 * Improved to handle various time block format variations and date issues
 */
export async function getTeamsByTimeBlock(date: Date, timeBlock: string): Promise<Team[]> {
  try {
    // Format date as YYYY-MM-DD for database query using our normalization function
    // IMPORTANT: This is a critical fix to ensure consistent date handling
    const simpleDateString = normalizeDate(date, 'getTeamsByTimeBlock');
    
    // Get the exact timeslot value - use the block key directly if it matches TIME_BLOCKS
    // Otherwise use the main value from the block
    let timeslotValue: string | null = null;
    
    // First check if timeBlock is directly a key in TIME_BLOCKS
    if (TIME_BLOCKS[timeBlock]) {
      timeslotValue = TIME_BLOCKS[timeBlock].main;
    } else {
      // Try to find the corresponding block 
      const normalizedBlock = findTimeBlockByValue(timeBlock);
      timeslotValue = normalizedBlock ? TIME_BLOCKS[normalizedBlock].main : null;
    }
    
    if (!timeslotValue) {
      console.error(`Invalid time block: ${timeBlock}. Available blocks:`, Object.keys(TIME_BLOCKS));
      return [];
    }
    
    console.log(`Fetching teams for date: ${simpleDateString}, timeslot: ${timeslotValue}`, {
      originalDate: date,
      originalDateString: date.toString(),
      originalIsoString: date.toISOString(),
      formattedDate: simpleDateString,
      requestedTimeBlock: timeBlock,
      normalizedTimeslotValue: timeslotValue,
      availableTimeBlocks: Object.keys(TIME_BLOCKS)
    });
    
    // First, log what's in the database for debugging
    const { data: allTimeslots, error: checkError } = await supabase
      .from('team_timeslots')
      .select('timeslot, match_date')
      .eq('match_date', simpleDateString)
      .limit(20);
    
    if (checkError) {
      console.error('Error checking timeslots:', checkError);
    } else {
      console.log(`Timeslots in database for ${simpleDateString}:`, allTimeslots);
      
      if (allTimeslots.length === 0) {
        // If no exact match was found, try alternative date formats
        console.warn(`No timeslots found for date ${simpleDateString}. Checking if date format is the issue...`);
        
        // Try with different date formats - get all timeslots to see what dates are available
        const { data: sampleTimeslots } = await supabase
          .from('team_timeslots')
          .select('match_date')
          .order('match_date', { ascending: false })
          .limit(10);
          
        if (sampleTimeslots && sampleTimeslots.length > 0) {
          console.log("Available dates in database:", sampleTimeslots.map(ts => ts.match_date));
        }
      }
    }
    
    // Now fetch teams for this specific date and timeslot
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
      .eq('match_date', simpleDateString)
      .eq('timeslot', timeslotValue);

    if (error) {
      console.error('Error fetching teams by time block:', error);
      throw error;
    }

    // Log the query and results for debugging
    console.log(`Team query results for ${simpleDateString} at ${timeslotValue}:`, {
      query: { match_date: simpleDateString, timeslot: timeslotValue },
      resultsCount: timeslotData?.length || 0,
      timeslotData
    });

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

    if (teams.length === 0) {
      console.warn(`No teams found for time block ${timeBlock} (${timeslotValue}) on ${simpleDateString}`);
    } else {
      console.log(`Found ${teams.length} teams for time block ${timeBlock} (${timeslotValue}) on ${simpleDateString}`);
    }

    return teams;
  } catch (error) {
    console.error(`Error in getTeamsByTimeBlock for ${timeBlock}:`, error);
    return [];
  }
};

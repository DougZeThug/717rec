
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";
import { normalizeScheduleDate, validateScheduleDate, createSafeScheduleDate } from "./dateUtils";
import { PairedTimeBlockTeamsMap } from "@/types/autoSchedule";
import { BACK_TO_BACK_PAIRS, getBackToBackPairName, getPairConfig } from "./constants";

/**
 * Get teams by back-to-back pair name (e.g., 'Early', 'Mid', 'Late')
 * Always loads teams for BOTH timeslots in the pair
 */
export const getTeamsByBackToBackPair = async (date: Date, pairName: string): Promise<Team[]> => {
  if (!validateScheduleDate(date, `getTeamsByBackToBackPair-${pairName}`)) {
    console.error(`Invalid date provided to getTeamsByBackToBackPair for ${pairName}`);
    return [];
  }
  
  const pairConfig = getPairConfig(pairName);
  if (!pairConfig) {
    console.error(`Invalid pair name: ${pairName}`);
    return [];
  }
  
  const safeDate = createSafeScheduleDate(date);
  const formattedDate = normalizeScheduleDate(safeDate, `getTeamsByBackToBackPair-${pairName}`);
  
  console.log(`Loading teams for ${pairName} pair (${pairConfig.primary}-${pairConfig.secondary}) on date: ${formattedDate}`);
  
  try {
    // Query for teams in both timeslots of the pair
  const { data: timeslots, error } = await supabase
    .from('team_timeslots')
    .select(`
      id,
      team_id,
      timeslot,
      match_date,
      is_back_to_back,
      pair_slot,
      match_sequence,
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
        divisions:division_id (
          name,
          display_division
        )
      )
    `)
    .eq('match_date', formattedDate)
    .in('timeslot', [pairConfig.primary, pairConfig.secondary])
    .eq('is_back_to_back', true)
    .eq('pair_slot', pairName);
    
    if (error) {
      console.error(`❌ Error fetching teams for ${pairName} pair on ${formattedDate}:`, error);
      return [];
    }

    if (!timeslots || timeslots.length === 0) {
      console.warn(`⚠️ No back-to-back teams found for ${pairName} pair on ${formattedDate}`);
      return [];
    }
    
    // Group timeslots by team_id to ensure each team has both timeslots
    const teamSlotMap = new Map<string, { primary?: any, secondary?: any }>();
    
    timeslots.forEach(slot => {
      if (!slot.team_id || !slot.teams) return;
      
      const teamData = teamSlotMap.get(slot.team_id) || {};
      
      if (slot.match_sequence === 1) {
        teamData.primary = slot;
      } else if (slot.match_sequence === 2) {
        teamData.secondary = slot;
      }
      
      teamSlotMap.set(slot.team_id, teamData);
    });
    
    // Only include teams that have BOTH timeslots assigned
    const validTeams: Team[] = [];
    
    teamSlotMap.forEach((slots, teamId) => {
      if (!slots.primary || !slots.secondary) {
        console.warn(`⚠️ Team ${teamId} missing complete back-to-back assignment for ${pairName} pair`);
        return;
      }
      
      const teamData = slots.primary.teams;
      
      validTeams.push({
        id: teamData.id,
        name: teamData.name || 'Unknown Team',
        logoUrl: teamData.logo_url || null,
        imageUrl: teamData.image_url || null,
        players: Array.isArray(teamData.players) ? teamData.players : [],
        wins: teamData.wins || 0,
        losses: teamData.losses || 0,
        game_wins: teamData.game_wins || 0,
        game_losses: teamData.game_losses || 0,
        power_score: 0, // Will be calculated separately
        sos: 0.5, // Default SOS value
        division: teamData.division_id,
        divisionName: teamData.divisions?.display_division || teamData.divisions?.name || null,
      });
    });
    
    console.log(`✅ Loaded ${validTeams.length} teams for ${pairName} pair (all with complete back-to-back assignments)`);
    return validTeams;
    
  } catch (error) {
    console.error(`❌ Unexpected error fetching teams for ${pairName} pair:`, error);
    return [];
  }
};

/**
 * Legacy function - now redirects to back-to-back pair loading
 * @deprecated Use getTeamsByBackToBackPair instead
 */
export const getTeamsByTimeBlock = async (date: Date, timeBlock: string): Promise<Team[]> => {
  console.warn(`⚠️ getTeamsByTimeBlock is deprecated. Converting ${timeBlock} to back-to-back pair.`);
  
  // Map legacy time blocks to pair names
  const pairName = timeBlock === 'Early' ? 'Early' : 
                   timeBlock === 'Mid' ? 'Mid' : 
                   timeBlock === 'Late' ? 'Late' : null;
  
  if (!pairName) {
    console.error(`Cannot map legacy time block ${timeBlock} to back-to-back pair`);
    return [];
  }
  
  return getTeamsByBackToBackPair(date, pairName);
};

/**
 * Load teams for all back-to-back pairs
 */
export const getAllBackToBackTeams = async (date: Date): Promise<Record<string, Team[]>> => {
  const results: Record<string, Team[]> = {};
  
  const pairNames = Object.keys(BACK_TO_BACK_PAIRS);
  
  // Load all pairs in parallel
  const promises = pairNames.map(async (pairName) => {
    const teams = await getTeamsByBackToBackPair(date, pairName);
    return { pairName, teams };
  });
  
  const pairResults = await Promise.all(promises);
  
  pairResults.forEach(({ pairName, teams }) => {
    results[pairName] = teams;
  });
  
  return results;
};

/**
 * Validate that a team has complete back-to-back assignments
 */
export const validateTeamBackToBackAssignment = async (
  date: Date, 
  teamId: string, 
  pairName: string
): Promise<boolean> => {
  const pairConfig = getPairConfig(pairName);
  if (!pairConfig) return false;
  
  const formattedDate = normalizeScheduleDate(date, 'validateTeamBackToBackAssignment');
  
  try {
    const { data, error } = await supabase
      .from('team_timeslots')
      .select('timeslot, match_sequence')
      .eq('match_date', formattedDate)
      .eq('team_id', teamId)
      .eq('is_back_to_back', true)
      .in('timeslot', [pairConfig.primary, pairConfig.secondary]);
    
    if (error || !data) return false;
    
    // Check that team has both sequence 1 and sequence 2
    const sequences = data.map(slot => slot.match_sequence);
    return sequences.includes(1) && sequences.includes(2);
    
  } catch (error) {
    console.error('Error validating team back-to-back assignment:', error);
    return false;
  }
};

/**
 * Create a map of team availability across back-to-back pairs
 */
export const createBackToBackAvailabilityMap = (
  pairTeams: Record<string, Team[]>
): Map<string, string[]> => {
  const teamAvailabilityMap = new Map<string, string[]>();
  
  Object.entries(pairTeams).forEach(([pairName, teams]) => {
    teams.forEach(team => {
      const currentAvailability = teamAvailabilityMap.get(team.id) || [];
      teamAvailabilityMap.set(team.id, [...currentAvailability, pairName]);
    });
  });
  
  return teamAvailabilityMap;
};

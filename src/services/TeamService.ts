import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

/**
 * Fetch all teams from the database
 */
export const fetchTeamsFromApi = async () => {
  let { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');

  console.log("Teams fetched from API:", data);

  if (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.log("No teams found, attempting to rebuild from match data");
    await rebuildTeamsFromMatches();
    
    // Fetch again after rebuild
    const result = await supabase
      .from('teams')
      .select('*')
      .order('name');
    
    if (result.error) {
      console.error("Error re-fetching teams after rebuild:", result.error);
      throw result.error;
    }
    
    data = result.data || [];
    console.log("Teams after rebuild:", data);
  }

  // Process the data to match our Team type, safely handling missing fields
  return data.map((team: any): Team => ({
    id: team.id,
    name: team.name || 'Unnamed Team',
    logoUrl: team.logo_url || null,
    imageUrl: team.image_url || null,
    // Safely handle players array which might be null/undefined
    players: Array.isArray(team.players) 
      ? team.players.map((playerName: string) => ({ name: playerName })) 
      : [],
    // Default values for optional fields
    wins: team.wins || 0,
    losses: team.losses || 0,
    created_at: team.created_at || new Date().toISOString(),
    division: team.division_id || null
  }));
};

/**
 * Rebuild teams table from match data
 */
const rebuildTeamsFromMatches = async () => {
  console.log("Attempting to rebuild teams from matches data");
  
  try {
    // Step 1: Get unique team IDs from matches
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('team1_id, team2_id');
    
    if (matchesError) {
      console.error("Error fetching matches for team rebuild:", matchesError);
      throw matchesError;
    }

    if (!matchesData || matchesData.length === 0) {
      console.log("No match data available for team rebuild");
      return;
    }

    // Collect all team IDs from match data (both team1 and team2)
    const teamIds = new Set<string>();
    matchesData.forEach(match => {
      if (match.team1_id) teamIds.add(match.team1_id);
      if (match.team2_id) teamIds.add(match.team2_id);
    });

    console.log(`Found ${teamIds.size} unique team IDs from matches`);

    // Step 2: Check which teams already exist
    const { data: existingTeams, error: existingError } = await supabase
      .from('teams')
      .select('id, name');
    
    if (existingError) {
      console.error("Error checking existing teams:", existingError);
      throw existingError;
    }
    
    const existingTeamIds = new Set(existingTeams?.map(t => t.id) || []);
    
    // Step 3: Create teams for IDs that don't exist in the teams table
    for (const teamId of teamIds) {
      if (!existingTeamIds.has(teamId)) {
        // Try to find name from match references
        let teamName = `Team ${teamId.substring(0, 4)}`;
        
        // Insert the missing team
        const { error: insertError } = await supabase
          .from('teams')
          .insert({
            id: teamId,
            name: teamName,
            players: [], 
            logo_url: null,
            image_url: null
          });
        
        if (insertError) {
          console.error(`Error inserting team ${teamId}:`, insertError);
          // Continue with other teams even if one fails
        } else {
          console.log(`Successfully created team with ID ${teamId}`);
        }
      }
    }
    
    console.log("Team rebuild completed");
    return true;
  } catch (error) {
    console.error("Error in rebuildTeamsFromMatches:", error);
    return false;
  }
};

/**
 * Create a new team
 */
export const createTeamApi = async (teamData: Omit<Team, "id" | "created_at">) => {
  const { data, error } = await supabase
    .from('teams')
    .insert({
      name: teamData.name,
      logo_url: teamData.logoUrl,
      image_url: teamData.imageUrl || null, // Use null if no image
      players: teamData.players.map(p => p.name),
      seed: null, // Default
      division_id: teamData.division
    })
    .select()
    .single();
    
  if (error) {
    console.error("Error creating team:", error);
    throw error;
  }
  
  console.log("Team created successfully:", data);
  
  // Transform the new team to our application Team type
  return {
    id: data.id,
    name: data.name,
    logoUrl: data.logo_url,
    imageUrl: data.image_url,
    players: data.players ? data.players.map((playerName: string) => ({
      name: playerName
    })) : [],
    wins: 0,
    losses: 0,
    created_at: data.created_at,
    division: data.division_id
  };
};

/**
 * Update an existing team
 */
export const updateTeamApi = async (teamId: string, teamData: Omit<Team, "id" | "created_at">) => {
  const { data, error } = await supabase
    .from('teams')
    .update({
      name: teamData.name,
      logo_url: teamData.logoUrl,
      image_url: teamData.imageUrl || null,
      players: teamData.players.map(p => p.name),
      division_id: teamData.division
    })
    .eq('id', teamId)
    .select()
    .single();
    
  if (error) {
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    logoUrl: data.logo_url,
    imageUrl: data.image_url,
    players: data.players ? data.players.map((playerName: string) => ({
      name: playerName
    })) : [],
    wins: 0,
    losses: 0,
    created_at: data.created_at,
    division: data.division_id
  };
};

/**
 * Delete a team
 */
export const deleteTeamApi = async (teamId: string) => {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);
    
  if (error) {
    throw error;
  }
};


import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

/**
 * Fetch all teams from the database
 */
export const fetchTeamsFromApi = async () => {
  const { data, error } = await supabase
    .from('v_team_details') // Using v_team_details view for consistency
    .select('*')
    .order('name');

  console.log("Teams fetched from API:", data?.map(t => ({
    id: t.team_id, 
    name: t.name,
    logoUrl: t.logo_url,
    imageUrl: t.image_url
  })));

  if (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }

  // Process the data to match our Team type, safely handling missing fields
  return (data || []).map((team: any): Team => ({
    id: team.team_id,
    name: team.name || 'Unnamed Team',
    logoUrl: team.logo_url || null,
    imageUrl: team.image_url || null, // Explicitly include image_url
    // Safely handle players array which might be null/undefined
    players: Array.isArray(team.players) ? team.players : [],
    // Default values for optional fields
    wins: team.wins || 0,
    losses: team.losses || 0,
    created_at: team.created_at || new Date().toISOString(),
    division: team.division_id || null,
    divisionName: team.divisionname || null,
    game_wins: team.game_wins || 0,
    game_losses: team.game_losses || 0,
    sos: typeof team.sos === 'number' ? team.sos : 0,
    power_score: typeof team.power_score === 'number' ? team.power_score : 0
  }));
};

/**
 * Create a new team
 */
export const createTeamApi = async (teamData: Omit<Team, "id" | "created_at">) => {
  console.log("Creating team with data:", teamData);
  
  const { data, error } = await supabase
    .from('teams')
    .insert({
      name: teamData.name,
      logo_url: teamData.logoUrl,
      image_url: teamData.imageUrl || null, // Use null if no image
      players: teamData.players, // Players is now a string[]
      seed: null, // Default
      division_id: teamData.division || null // Ensure null if no division
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
    players: data.players || [],
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
  console.log("Updating team with ID:", teamId);
  console.log("Update data:", teamData);
  console.log("Division value:", teamData.division, typeof teamData.division);
  
  // Validate the team exists before attempting an update
  const { data: teamExists, error: checkError } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .single();
  
  if (checkError || !teamExists) {
    console.error("Team not found or error checking team:", checkError);
    throw new Error(`Team with ID ${teamId} not found.`);
  }
  
  // If division is provided, validate it exists in the divisions table
  // (Skip validation if division is null - meaning no division assigned)
  if (teamData.division !== null) {
    const { data: divisionExists, error: divCheckError } = await supabase
      .from('divisions')
      .select('id')
      .eq('id', teamData.division)
      .single();
    
    if (divCheckError || !divisionExists) {
      console.error("Division not found or error checking division:", divCheckError);
      throw new Error(`Division with ID ${teamData.division} not found.`);
    }
  }
  
  const { data, error } = await supabase
    .from('teams')
    .update({
      name: teamData.name,
      logo_url: teamData.logoUrl,
      image_url: teamData.imageUrl || null,
      players: teamData.players, // Players is now a string[]
      division_id: teamData.division // This will be null when no division is selected
    })
    .eq('id', teamId)
    .select()
    .single();
    
  if (error) {
    console.error("Error updating team:", error);
    throw error;
  }

  console.log("Team updated successfully:", data);

  // The database response doesn't include wins/losses fields, so we need to use
  // the values passed in teamData or default to 0
  return {
    id: data.id,
    name: data.name,
    logoUrl: data.logo_url,
    imageUrl: data.image_url,
    players: data.players || [],
    // Use the values from teamData since they're not in the database schema
    wins: teamData.wins || 0,
    losses: teamData.losses || 0,
    created_at: data.created_at,
    division: data.division_id
  };
};

/**
 * Delete a team and clean up associated storage files
 */
export const deleteTeamApi = async (teamId: string) => {
  try {
    // First, try to clean up any associated team images
    const teamPath = `teams/${teamId}`;
    
    // List all files for this team in the storage bucket
    const { data: storageFiles, error: listError } = await supabase.storage
      .from('teams')
      .list(teamPath);
    
    // If files exist for this team, delete them
    if (storageFiles && storageFiles.length > 0) {
      console.log(`Found ${storageFiles.length} files to delete for team ${teamId}`);
      
      const filesToDelete = storageFiles.map(file => `${teamPath}/${file.name}`);
      
      const { error: deleteFilesError } = await supabase.storage
        .from('teams')
        .remove(filesToDelete);
        
      if (deleteFilesError) {
        console.warn('Error deleting team files:', deleteFilesError);
        // Continue with team deletion even if file cleanup fails
      } else {
        console.log('Successfully deleted team files');
      }
    }
    
    // Now delete the team from the database
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);
      
    if (error) {
      console.error('Error deleting team from database:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Team deletion failed:', error);
    throw error;
  }
};

import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

/**
 * Fetch all teams from the database
 */
export const fetchTeamsFromApi = async () => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');

  console.log("Teams fetched from API:", data);

  if (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }

  // Process the data to match our Team type, safely handling missing fields
  return (data || []).map((team: any): Team => ({
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

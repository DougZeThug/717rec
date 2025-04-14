
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

  if (error) {
    throw error;
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
    wins: 0,
    losses: 0,
    created_at: team.created_at,
    division: team.division_id
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
    throw error;
  }
  
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

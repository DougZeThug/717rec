
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

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

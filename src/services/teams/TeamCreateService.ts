
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";
import { teamLog, errorLog } from "@/utils/logger";

/**
 * Create a new team
 */
export const createTeamApi = async (teamData: Omit<Team, "id" | "created_at">) => {
  teamLog("Creating team:", teamData.name);
  
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
    errorLog("Error creating team:", error);
    throw error;
  }
  
  teamLog("Team created successfully:", data.id);
  
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

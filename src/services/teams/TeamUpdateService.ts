
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

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

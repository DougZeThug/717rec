
import { supabase } from "@/integrations/supabase/client";

export const fetchTeamData = async (teamId: string) => {
  console.log("Fetching team data for ID:", teamId);
  
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, name, wins, losses, game_wins, game_losses')
    .eq('id', teamId)
    .maybeSingle();
  
  if (error || !team) {
    console.error("ERROR FETCHING TEAM:", error || "No team found with ID: " + teamId);
    return null;
  }
  
  return team;
};

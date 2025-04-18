
import { supabase } from "@/integrations/supabase/client";

export const fetchTeamData = async (teamId: string) => {
  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .maybeSingle();
  
  if (error || !team) {
    console.error("ERROR FETCHING TEAM:", error || "No team found with ID: " + teamId);
    return null;
  }
  
  return team;
};

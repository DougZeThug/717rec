
import { supabase } from "@/integrations/supabase/client";

export const toggleTeamHiddenStatus = async (teamId: string, hidden: boolean) => {
  const { data, error } = await supabase
    .from('teams')
    .update({ hidden })
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    console.error("Error updating team hidden status:", error);
    throw error;
  }

  return data;
};

export const hideTeam = async (teamId: string) => {
  return toggleTeamHiddenStatus(teamId, true);
};

export const showTeam = async (teamId: string) => {
  return toggleTeamHiddenStatus(teamId, false);
};

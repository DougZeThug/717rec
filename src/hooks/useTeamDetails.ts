
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";

export const useTeamDetails = (teamId: string | undefined) => {
  const teamQuery = useQuery({
    queryKey: ["team-details", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      
      const { data, error } = await supabase
        .from("v_team_details")
        .select('*')
        .eq("team_id", teamId)
        .maybeSingle();
        
      if (error) throw error;
      if (!data) throw new Error("Team not found");
      
      return {
        id: data.team_id,
        name: data.name,
        logoUrl: data.logo_url,
        wins: data.wins || 0,
        losses: data.losses || 0,
        game_wins: data.game_wins || 0,
        game_losses: data.game_losses || 0,
        division: data.division_id,
        divisionName: data.division_name || null,
        sos: data.sos,
        close_match_losses: data.close_match_losses,
        power_score: data.power_score
      } as Team;
    },
    enabled: !!teamId
  });

  return {
    team: teamQuery.data,
    isLoading: teamQuery.isLoading
  };
};


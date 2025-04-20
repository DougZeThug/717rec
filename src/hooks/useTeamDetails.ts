
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
        .select(`
          team_id,
          name,
          logo_url,
          image_url,
          wins,
          losses,
          game_wins,
          game_losses,
          division_id,
          divisionname,
          sos,
          power_score,
          win_percentage,
          game_win_percentage,
          players,
          created_at,
          close_match_losses
        `)
        .eq("team_id", teamId)
        .maybeSingle();
        
      if (error) throw error;
      if (!data) throw new Error("Team not found");
      
      // Enhanced logging to verify values from v_team_details with the new weighted power score
      console.log("Team details from v_team_details with weighted Power Score:", {
        id: data.team_id,
        name: data.name,
        sos: data.sos,
        power_score: data.power_score,
        win_percentage: data.win_percentage,
        game_win_percentage: data.game_win_percentage
      });
      
      return {
        id: data.team_id,
        name: data.name,
        logoUrl: data.logo_url,
        imageUrl: data.image_url,
        wins: data.wins || 0,
        losses: data.losses || 0,
        game_wins: data.game_wins || 0,
        game_losses: data.game_losses || 0,
        division: data.division_id,
        divisionName: data.divisionname || null,
        // Use the database-calculated values with the weighted algorithm
        sos: typeof data.sos === 'number' ? data.sos : 0.5,
        power_score: typeof data.power_score === 'number' ? data.power_score : 0,
        win_percentage: data.win_percentage || 0,
        game_win_percentage: data.game_win_percentage || 0,
        players: Array.isArray(data.players) ? data.players : [],
        created_at: data.created_at || new Date().toISOString(),
        close_match_losses: data.close_match_losses
      } as Team;
    },
    enabled: !!teamId
  });

  return {
    team: teamQuery.data,
    isLoading: teamQuery.isLoading
  };
};

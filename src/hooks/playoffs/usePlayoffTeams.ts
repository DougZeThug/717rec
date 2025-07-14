
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Team } from "@/types/playoffs";

export const usePlayoffTeams = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase
        .from('v_team_details')
        .select(`
          team_id,
          name,
          logo_url,
          image_url,
          division_id,
          divisionname,
          wins,
          losses,
          game_wins,
          game_losses,
          players,
          power_score,
          sos,
          win_percentage,
          game_win_percentage,
          close_match_losses
        `);

      if (error) throw error;

      return (data ?? []).map(row => ({
        id: row.team_id,
        name: row.name ?? 'Unnamed Team',

        // camel-case fields used by TeamDivisionTable
        logoUrl: row.logo_url ?? null,
        imageUrl: row.image_url ?? null,
        division_id: row.division_id ?? null,
        division: row.division_id ?? null,          // legacy fallback
        divisionName: row.divisionname ?? null,

        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        game_wins: row.game_wins ?? 0,
        game_losses: row.game_losses ?? 0,

        players: Array.isArray(row.players) ? row.players : [],
        
        // Additional fields to satisfy Team type
        created_at: new Date().toISOString(),
        seed: null,
        power_score: row.power_score ?? 0,
        sos: row.sos ?? 0.5,
        win_percentage: row.win_percentage ?? 0,
        game_win_percentage: row.game_win_percentage ?? 0,
        close_match_losses: row.close_match_losses ?? 0
      })) as Team[];
    }
  });
};

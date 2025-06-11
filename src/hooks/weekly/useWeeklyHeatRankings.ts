
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WeeklyHeatRanking {
  id: string;
  week_of: string;
  team_id: string;
  heat_score: number;
  wins: number;
  losses: number;
  upsets: number;
  streak_bonus: number;
  current_streak: number;
  streak_type: 'win' | 'loss' | 'none';
  created_at: string;
  team?: {
    name: string;
    logo_url: string | null;
    image_url: string | null;
    divisionName: string | null;
  };
}

export const useWeeklyHeatRankings = (weekOf?: string) => {
  return useQuery({
    queryKey: ['weekly-heat-rankings', weekOf],
    queryFn: async () => {
      let query = supabase
        .from('weekly_heat_rankings')
        .select(`
          *,
          teams!inner(
            name,
            logo_url,
            image_url,
            divisions(name)
          )
        `)
        .order('heat_score', { ascending: false });

      if (weekOf) {
        query = query.eq('week_of', weekOf);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return data?.map(ranking => ({
        ...ranking,
        team: {
          name: ranking.teams.name,
          logo_url: ranking.teams.logo_url,
          image_url: ranking.teams.image_url,
          divisionName: ranking.teams.divisions?.name || null,
        }
      })) as WeeklyHeatRanking[];
    },
  });
};

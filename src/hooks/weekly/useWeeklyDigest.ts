
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WeeklyDigest {
  id: string;
  week_of: string;
  total_matches: number;
  total_upsets: number;
  hottest_team_id: string | null;
  coolest_team_id: string | null;
  digest_data: {
    week_of: string;
    week_end: string;
    total_matches: number;
    total_upsets: number;
    hottest_team: {
      id: string;
      name: string;
      heat_score: number;
    } | null;
    coolest_team: {
      id: string;
      name: string;
      heat_score: number;
    } | null;
    top_performers: Array<{
      team_id: string;
      team_name: string;
      heat_score: number;
      wins: number;
      losses: number;
      upsets: number;
      streak_bonus: number;
    }>;
    highlights: Array<{
      type: string;
      team_id: string;
      team_name: string;
      description: string;
      metadata: any;
    }>;
  };
  generated_at: string;
  created_at: string;
}

export const useWeeklyDigest = (weekOf?: string) => {
  return useQuery({
    queryKey: ['weekly-digest', weekOf],
    queryFn: async () => {
      let query = supabase
        .from('weekly_digests')
        .select('*')
        .order('week_of', { ascending: false });

      if (weekOf) {
        query = query.eq('week_of', weekOf);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WeeklyDigest[];
    },
  });
};

export const useLatestWeeklyDigest = () => {
  return useQuery({
    queryKey: ['latest-weekly-digest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_digests')
        .select('*')
        .order('week_of', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data as WeeklyDigest;
    },
  });
};

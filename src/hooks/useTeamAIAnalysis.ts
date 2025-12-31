import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamAnalysis {
  overall: string;
  strengths: string[];
  weaknesses: string[];
  trends: string;
  rivalryInsights: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export const useTeamAIAnalysis = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-ai-analysis', teamId],
    queryFn: async (): Promise<TeamAnalysis> => {
      if (!teamId) {
        throw new Error('Team ID is required');
      }

      const { data, error } = await supabase.functions.invoke('analyze-team', {
        body: { teamId }
      });

      if (error) {
        console.error('Error fetching AI analysis:', error);
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as TeamAnalysis;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (previously cacheTime)
    retry: 1,
  });
};

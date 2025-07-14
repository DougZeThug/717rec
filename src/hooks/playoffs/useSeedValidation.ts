import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SeedValidationResult {
  team_id: string;
  team_name: string;
  seed: number;
  conflict_count: number;
}

export const useSeedValidation = (divisionId?: string) => {
  return useQuery({
    queryKey: ['seed-validation', divisionId],
    queryFn: async (): Promise<SeedValidationResult[]> => {
      if (!divisionId) return [];
      
      const { data, error } = await supabase.rpc('validate_division_seeds', {
        p_division_id: divisionId
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!divisionId,
    staleTime: 30000, // Cache for 30 seconds
  });
};
import { useQuery } from '@tanstack/react-query';

import { validateSeeds } from '@/services/brackets/BracketReadService';

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
      return validateSeeds(divisionId) as Promise<SeedValidationResult[]>;
    },
    enabled: !!divisionId,
    staleTime: 30000, // Cache for 30 seconds
  });
};

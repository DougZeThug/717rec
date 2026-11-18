import { useQuery } from '@tanstack/react-query';

import { fetchBracketParticipants } from '@/services/brackets/BracketReadService';

/**
 * The teams currently seeded in a bracket. The key
 * `['bracket-participants', bracketId]` is shared with `SeedingUpdateDialog`,
 * which invalidates it after a seeding change. Waits for a bracket id.
 */
export const useBracketParticipants = (bracketId: string) =>
  useQuery({
    queryKey: ['bracket-participants', bracketId],
    queryFn: () => fetchBracketParticipants(bracketId),
    enabled: Boolean(bracketId),
  });

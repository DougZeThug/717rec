import { useMemo } from 'react';

import type { Team } from '@/types';

export const useTeamSeeding = (teams: Team[]) =>
  useMemo(
    () =>
      teams.map((team, index) => ({
        ...team,
        seed: index + 1, // Preserve existing seeding based on rankings order
      })),
    [teams]
  );

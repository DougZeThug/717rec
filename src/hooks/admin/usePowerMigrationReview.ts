import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PowerMigrationService, PowerMigrationState } from '@/services/admin/PowerMigrationService';
import { fetchAllTeamsCareerData } from '@/services/career/CareerService';

import { useTeamsQuery } from '../teams/useTeamsQuery';
import { buildPowerMigrationComparison } from './buildPowerMigrationComparison';

const STATUS_KEY = ['admin', 'power-migration', 'status'] as const;
const COMPARISON_KEY = ['admin', 'power-migration', 'comparison'] as const;

/** States in which the backup exists, so the comparison can be built. */
const COMPARABLE_STATES: PowerMigrationState[] = ['applied', 'reverted', 'partial'];

export const usePowerMigrationStatus = () =>
  useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => PowerMigrationService.fetchStatus(),
    staleTime: 60_000,
  });

/**
 * Before/after Career Standings comparison. Runs the same pipeline /stats
 * uses (all teams incl. hidden → bulk career data → career calculators),
 * once with live inputs and once with the pre-migration backup.
 */
export const usePowerMigrationComparison = (status: PowerMigrationState | undefined) => {
  const enabled = status !== undefined && COMPARABLE_STATES.includes(status);
  const { data: teams } = useTeamsQuery({ includeHidden: true, enabled });

  return useQuery({
    queryKey: [...COMPARISON_KEY, teams?.map((t) => t.id)],
    queryFn: async () => {
      const [bulkData, backupSeasonStats, backupTeamPower] = await Promise.all([
        fetchAllTeamsCareerData(teams?.map((t) => t.id) ?? []),
        PowerMigrationService.fetchBackupSeasonStats(),
        PowerMigrationService.fetchBackupTeamPower(),
      ]);
      return buildPowerMigrationComparison({
        teams: teams ?? [],
        bulkData,
        backupSeasonStats,
        backupTeamPower,
      });
    },
    enabled: enabled && !!teams,
    staleTime: 5 * 60_000,
  });
};

/**
 * Revert/reapply flip the formula behind every stored power score, which
 * feeds teams, careerRankings, history, trends, recap and more. A blanket
 * invalidation is the smallest change that is guaranteed to leave no stale
 * number on screen.
 */
const useFlipMutation = (mutationFn: () => Promise<string>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
};

export const useRevertPowerMigration = () => useFlipMutation(() => PowerMigrationService.revert());

export const useReapplyPowerMigration = () =>
  useFlipMutation(() => PowerMigrationService.reapply());

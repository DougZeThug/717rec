import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buildPowerMigrationComparison } from '@/hooks/admin/buildPowerMigrationComparison';
import { useTeamsQuery } from '@/hooks/teams';
import { PowerMigrationService } from '@/services/admin/PowerMigrationService';
import { fetchAllTeamsCareerData } from '@/services/career/CareerBulkFetchService';

const STATUS_KEY = ['admin', 'power-migration', 'status'] as const;

export const usePowerMigrationStatus = () =>
  useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => PowerMigrationService.fetchStatus(),
    staleTime: 60_000,
  });

/**
 * The before/after Career Standings comparison. Includes hidden teams so the
 * ranks line up 1:1 with the /stats Career Statistics table.
 */
export const usePowerMigrationComparison = (enabled: boolean) => {
  const {
    data: teams,
    isLoading: isLoadingTeams,
    error: teamsError,
  } = useTeamsQuery({ includeHidden: true });

  return useQuery({
    queryKey: ['admin', 'power-migration', 'comparison', teams?.map((t) => t.id)],
    queryFn: async () => {
      if (!teams) return [];
      const [bulkData, backupSeasonRows, backupPowerRows] = await Promise.all([
        fetchAllTeamsCareerData(teams.map((t) => t.id)),
        PowerMigrationService.fetchBackupSeasonStats(),
        PowerMigrationService.fetchBackupTeamPower(),
      ]);
      return buildPowerMigrationComparison(teams, bulkData, backupSeasonRows, backupPowerRows);
    },
    enabled: enabled && !!teams && !isLoadingTeams && !teamsError,
    staleTime: 1000 * 60 * 10,
  });
};

/**
 * Revert/re-apply flip the stored formula behind v_team_details,
 * team_season_stats and get_season_team_power_scores, which feed teams,
 * career rankings, history, trends and the weekly recap. A blanket
 * invalidation is the smallest change that is actually correct here.
 */
const useFormulaFlipMutation = (mutationFn: () => Promise<string>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
};

export const useRevertPowerMigration = () =>
  useFormulaFlipMutation(() => PowerMigrationService.revert());

export const useReapplyPowerMigration = () =>
  useFormulaFlipMutation(() => PowerMigrationService.reapply());

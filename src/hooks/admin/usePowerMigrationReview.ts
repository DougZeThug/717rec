import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  PowerMigrationService,
  PowerMigrationStatus,
} from '@/services/admin/PowerMigrationService';
import { fetchAllTeamsCareerData } from '@/services/career/CareerService';

import { useTeamsQuery } from '../teams/useTeamsQuery';
import { buildPowerMigrationComparison } from './buildPowerMigrationComparison';

const STATUS_KEY = ['admin', 'power-migration', 'status'] as const;
const COMPARISON_KEY = ['admin', 'power-migration', 'comparison'] as const;

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
 *
 * Only fetched while the unified formula is live ('applied'/'partial') AND
 * the backup still exists: in the 'reverted' state the live numbers ARE the
 * old formula, so a "before vs. after" table would compare old with old, and
 * once the backup tables are dropped there is no "before" side at all.
 */
export const usePowerMigrationComparison = (status: PowerMigrationStatus | undefined) => {
  const enabled =
    status !== undefined &&
    (status.status === 'applied' || status.status === 'partial') &&
    status.backedUpAt !== null;
  const { data: teams } = useTeamsQuery({ includeHidden: true, enabled });

  return useQuery({
    // The key carries each team's formula-derived inputs, not just its id:
    // after a revert/re-apply invalidation the ids are unchanged while the
    // scores flip, and the comparison must re-run when the refreshed teams
    // query lands rather than keep a mix of pre- and post-flip data.
    queryKey: [
      ...COMPARISON_KEY,
      teams?.map((t) => [t.id, t.power_score ?? null, t.wins ?? null, t.losses ?? null]),
    ],
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

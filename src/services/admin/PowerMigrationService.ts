import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import { PowerMigrationNotAppliedError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';

// TEMPORARY(types.ts): the admin_power_* RPCs were added by migration
// 20260810120000 and are not yet in the auto-generated
// src/integrations/supabase/types.ts (it only refreshes on the next Lovable
// schema change). Delete this cast and call supabase.rpc() directly once
// types.ts lists them.
type UntypedRpc = (
  fn: string,
  args?: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: PostgrestError | null }>;
const untypedRpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;

/**
 * Error codes that mean "the migration's database objects don't exist yet"
 * rather than a real failure. Mirrors NOT_ENABLED_CODES in LiveMatchService:
 * PGRST202/PGRST205 are PostgREST schema-cache misses for a function/table,
 * 42883/42P01 are Postgres undefined-function/undefined-table.
 */
const NOT_APPLIED_CODES = ['PGRST202', 'PGRST205', '42883', '42P01'];

const isNotAppliedError = (error: PostgrestError): boolean =>
  NOT_APPLIED_CODES.includes(error.code ?? '');

export type PowerMigrationState =
  'applied' | 'reverted' | 'not_applied' | 'partial' | 'controls_missing';

export interface PowerMigrationStatus {
  state: PowerMigrationState;
  /** When the pre-migration backup was captured (null until the backup exists) */
  backedUpAt: string | null;
  backupSeasonRows: number;
  backupPowerRows: number;
  liveSeasonRows: number;
}

/** A team_season_stats row as it stood before the migration, plus season name */
export interface BackupSeasonStatsRow {
  team_id: string;
  season_id: string | null;
  season_name: string | null;
  match_wins: number | null;
  match_losses: number | null;
  game_wins: number | null;
  game_losses: number | null;
  sos: number | null;
  power_score: number | null;
  division_name: string | null;
  champion: boolean | null;
  runner_up: boolean | null;
  playoff_rank: number | null;
  backed_up_at: string | null;
}

/** A v_team_details power/record row as it stood before the migration */
export interface BackupTeamPowerRow {
  team_id: string;
  power_score: number | null;
  wins: number | null;
  losses: number | null;
  game_wins: number | null;
  game_losses: number | null;
  win_percentage: number | null;
  game_win_percentage: number | null;
  backed_up_at: string | null;
}

interface RawStatusRow {
  status: string;
  backed_up_at: string | null;
  backup_season_rows: number | null;
  backup_power_rows: number | null;
  live_season_rows: number | null;
}

export const PowerMigrationService = {
  /**
   * Where the power-score unification stands. Returns state 'controls_missing'
   * (instead of throwing) when the admin-control functions themselves are not
   * in the database yet — that is a first-class UI state, not an error.
   */
  fetchStatus: async (): Promise<PowerMigrationStatus> => {
    const { data, error } = await untypedRpc('admin_power_unification_status');
    if (error) {
      if (isNotAppliedError(error)) {
        return {
          state: 'controls_missing',
          backedUpAt: null,
          backupSeasonRows: 0,
          backupPowerRows: 0,
          liveSeasonRows: 0,
        };
      }
      handleDatabaseError(error, 'Failed to fetch power migration status');
    }

    const row = (Array.isArray(data) ? data[0] : data) as RawStatusRow | undefined;
    return {
      state: (row?.status ?? 'not_applied') as PowerMigrationState,
      backedUpAt: row?.backed_up_at ?? null,
      backupSeasonRows: row?.backup_season_rows ?? 0,
      backupPowerRows: row?.backup_power_rows ?? 0,
      liveSeasonRows: row?.live_season_rows ?? 0,
    };
  },

  /**
   * The backed-up (pre-migration) team_season_stats rows.
   * @throws {PowerMigrationNotAppliedError} when the backup doesn't exist yet
   */
  fetchBackupSeasonStats: async (): Promise<BackupSeasonStatsRow[]> => {
    const { data, error } = await untypedRpc('admin_get_pre_unification_season_stats');
    if (error) {
      if (isNotAppliedError(error)) throw new PowerMigrationNotAppliedError();
      handleDatabaseError(error, 'Failed to fetch backed-up season stats');
    }
    return (data ?? []) as BackupSeasonStatsRow[];
  },

  /**
   * The backed-up (pre-migration) standings power/record rows.
   * @throws {PowerMigrationNotAppliedError} when the backup doesn't exist yet
   */
  fetchBackupTeamPower: async (): Promise<BackupTeamPowerRow[]> => {
    const { data, error } = await untypedRpc('admin_get_pre_unification_team_power');
    if (error) {
      if (isNotAppliedError(error)) throw new PowerMigrationNotAppliedError();
      handleDatabaseError(error, 'Failed to fetch backed-up team power');
    }
    return (data ?? []) as BackupTeamPowerRow[];
  },

  /**
   * Admin-only. Restores the pre-migration formula everywhere and recalculates
   * all historical stats under it (games played since the migration are kept).
   * Returns 'reverted' or 'already_reverted'.
   */
  revert: async (): Promise<string> => {
    const { data, error } = await untypedRpc('admin_revert_power_score_unification');
    if (error) handleDatabaseError(error, 'Failed to revert the power-score migration');
    return typeof data === 'string' ? data : 'reverted';
  },

  /**
   * Admin-only. Restores the unified formula and recalculates all historical
   * stats under it. Returns 'applied' or 'already_applied'.
   */
  reapply: async (): Promise<string> => {
    const { data, error } = await untypedRpc('admin_reapply_power_score_unification');
    if (error) handleDatabaseError(error, 'Failed to re-apply the power-score migration');
    return typeof data === 'string' ? data : 'applied';
  },
};

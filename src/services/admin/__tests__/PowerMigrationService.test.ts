import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, PowerMigrationNotAppliedError } from '@/types/errors';

const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (fn: string) => mockRpc(fn),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

import { PowerMigrationService } from '../PowerMigrationService';

const pgError = (code: string) => ({
  message: 'boom',
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const statusRow = {
  status: 'applied',
  backed_up_at: '2026-08-09T12:10:00Z',
  backup_season_rows: 120,
  backup_team_rows: 30,
  live_season_rows: 124,
};

describe('PowerMigrationService.fetchStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps the status row to camelCase', async () => {
    mockRpc.mockResolvedValueOnce({ data: [statusRow], error: null });
    expect(await PowerMigrationService.fetchStatus()).toEqual({
      status: 'applied',
      backedUpAt: '2026-08-09T12:10:00Z',
      backupSeasonRows: 120,
      backupTeamRows: 30,
      liveSeasonRows: 124,
    });
    expect(mockRpc).toHaveBeenCalledWith('admin_power_unification_status');
  });

  it('returns controls_missing instead of throwing when the function does not exist', async () => {
    for (const code of ['PGRST202', '42883']) {
      mockRpc.mockResolvedValueOnce({ data: null, error: pgError(code) });
      const result = await PowerMigrationService.fetchStatus();
      expect(result.status).toBe('controls_missing');
    }
  });

  it('returns controls_missing on an empty payload', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    expect((await PowerMigrationService.fetchStatus()).status).toBe('controls_missing');
  });

  it('throws DatabaseError on other failures', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('P0001') });
    await expect(PowerMigrationService.fetchStatus()).rejects.toThrow(DatabaseError);
  });
});

describe('PowerMigrationService backup readers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns season backup rows as-is', async () => {
    const row = { season_id: 's-1', team_id: 't-1', power_score: 0.9 };
    mockRpc.mockResolvedValueOnce({ data: [row], error: null });
    expect(await PowerMigrationService.fetchBackupSeasonStats()).toEqual([row]);
    expect(mockRpc).toHaveBeenCalledWith('admin_get_pre_unification_season_stats');
  });

  it('throws PowerMigrationNotAppliedError when the backup tables are missing', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('42P01') });
    await expect(PowerMigrationService.fetchBackupSeasonStats()).rejects.toThrow(
      PowerMigrationNotAppliedError
    );
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('PGRST202') });
    await expect(PowerMigrationService.fetchBackupTeamPower()).rejects.toThrow(
      PowerMigrationNotAppliedError
    );
  });

  it('throws DatabaseError on other failures', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('P0001') });
    await expect(PowerMigrationService.fetchBackupTeamPower()).rejects.toThrow(DatabaseError);
  });

  it('returns team power backup rows as-is', async () => {
    const row = { team_id: 't-1', power_score: 88.2, wins: 10, losses: 2 };
    mockRpc.mockResolvedValueOnce({ data: [row], error: null });
    expect(await PowerMigrationService.fetchBackupTeamPower()).toEqual([row]);
    expect(mockRpc).toHaveBeenCalledWith('admin_get_pre_unification_team_power');
  });
});

describe('PowerMigrationService.revert / reapply', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the transition result string', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'reverted', error: null });
    expect(await PowerMigrationService.revert()).toBe('reverted');
    expect(mockRpc).toHaveBeenCalledWith('admin_revert_power_score_unification');

    mockRpc.mockResolvedValueOnce({ data: 'applied', error: null });
    expect(await PowerMigrationService.reapply()).toBe('applied');
    expect(mockRpc).toHaveBeenCalledWith('admin_reapply_power_score_unification');
  });

  it('throws DatabaseError when the RPC fails (incl. the admin guard)', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('P0001') });
    await expect(PowerMigrationService.revert()).rejects.toThrow(DatabaseError);
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('P0001') });
    await expect(PowerMigrationService.reapply()).rejects.toThrow(DatabaseError);
  });
});

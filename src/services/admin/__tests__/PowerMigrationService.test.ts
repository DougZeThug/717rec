import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, PowerMigrationNotAppliedError } from '@/types/errors';

const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (fn: string, args?: Record<string, unknown>) => mockRpc(fn, args),
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

describe('PowerMigrationService.fetchStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parses the single status row', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          status: 'applied',
          backed_up_at: '2026-08-10T12:00:00Z',
          backup_season_rows: 42,
          backup_power_rows: 20,
          live_season_rows: 44,
        },
      ],
      error: null,
    });
    expect(await PowerMigrationService.fetchStatus()).toEqual({
      state: 'applied',
      backedUpAt: '2026-08-10T12:00:00Z',
      backupSeasonRows: 42,
      backupPowerRows: 20,
      liveSeasonRows: 44,
    });
    expect(mockRpc).toHaveBeenCalledWith('admin_power_unification_status', undefined);
  });

  it('returns controls_missing instead of throwing when the RPC does not exist yet', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('PGRST202') });
    expect((await PowerMigrationService.fetchStatus()).state).toBe('controls_missing');
  });

  it('returns controls_missing on undefined-function (42883)', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('42883') });
    expect((await PowerMigrationService.fetchStatus()).state).toBe('controls_missing');
  });

  it('throws DatabaseError on any other failure', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('P0001') });
    await expect(PowerMigrationService.fetchStatus()).rejects.toThrow(DatabaseError);
  });
});

describe('PowerMigrationService backup readers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns backup season rows as-is', async () => {
    const row = { team_id: 't-1', season_id: 's-1', power_score: 0.5 };
    mockRpc.mockResolvedValueOnce({ data: [row], error: null });
    expect(await PowerMigrationService.fetchBackupSeasonStats()).toEqual([row]);
  });

  it('throws PowerMigrationNotAppliedError when the backup table is missing (42P01)', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('42P01') });
    await expect(PowerMigrationService.fetchBackupSeasonStats()).rejects.toThrow(
      PowerMigrationNotAppliedError
    );
  });

  it('throws DatabaseError on other failures for team power rows', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('P0001') });
    await expect(PowerMigrationService.fetchBackupTeamPower()).rejects.toThrow(DatabaseError);
  });
});

describe('PowerMigrationService.revert / reapply', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the status string from revert', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'reverted', error: null });
    expect(await PowerMigrationService.revert()).toBe('reverted');
    expect(mockRpc).toHaveBeenCalledWith('admin_revert_power_score_unification', undefined);
  });

  it('returns the status string from reapply', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'already_applied', error: null });
    expect(await PowerMigrationService.reapply()).toBe('already_applied');
  });

  it('throws DatabaseError when revert fails (e.g. not admin)', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('P0001') });
    await expect(PowerMigrationService.revert()).rejects.toThrow(DatabaseError);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, PowerWeightsNotAppliedError } from '@/types/errors';

const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn((_table: string) => ({ select: mockSelect }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (fn: string, args?: Record<string, unknown>) => mockRpc(fn, args),
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

import { PowerWeightSandboxService, toPowerScoreWeights } from '../PowerWeightSandboxService';

const pgError = (code: string) => ({
  message: 'boom',
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const NOT_APPLIED_CODES = ['PGRST202', '42883', 'PGRST205', '42P01'];

const weightRow = (id: number, win: number, sos: number, game: number) => ({
  id,
  win_weight: win,
  sos_weight: sos,
  game_weight: game,
  applied_at: '2026-08-20T12:00:00Z',
  note: null,
});

describe('PowerWeightSandboxService.fetchWeightState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps the latest two rows to current + previous', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [weightRow(2, 50, 35, 15), weightRow(1, 40, 45, 15)],
      error: null,
    });
    const state = await PowerWeightSandboxService.fetchWeightState();
    expect(state.controlsApplied).toBe(true);
    expect(state.current?.win_weight).toBe(50);
    expect(state.previous?.win_weight).toBe(40);
    expect(mockRpc).toHaveBeenCalledWith('get_power_score_weights', undefined);
  });

  it('reports no previous row with a single-row history', async () => {
    mockRpc.mockResolvedValueOnce({ data: [weightRow(1, 40, 45, 15)], error: null });
    const state = await PowerWeightSandboxService.fetchWeightState();
    expect(state.current?.win_weight).toBe(40);
    expect(state.previous).toBeNull();
  });

  it('returns controlsApplied:false instead of throwing while the migration is missing', async () => {
    for (const code of NOT_APPLIED_CODES) {
      mockRpc.mockResolvedValueOnce({ data: null, error: pgError(code) });
      expect(await PowerWeightSandboxService.fetchWeightState()).toEqual({
        controlsApplied: false,
        current: null,
        previous: null,
      });
    }
  });

  it('returns controlsApplied:false on an empty payload', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    expect((await PowerWeightSandboxService.fetchWeightState()).controlsApplied).toBe(false);
  });

  it('throws DatabaseError on other failures', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('P0001') });
    await expect(PowerWeightSandboxService.fetchWeightState()).rejects.toThrow(DatabaseError);
  });
});

describe('PowerWeightSandboxService component readers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads current-season components, dropping teamless rows and defaulting counters', async () => {
    mockSelect.mockResolvedValueOnce({
      data: [
        {
          team_id: 't-1',
          matches_played: 3,
          wins: 2,
          losses: 1,
          game_wins: 5,
          game_losses: 3,
          weighted_win_pct: 0.66,
          sos: 0.9,
          weighted_game_win_pct: 0.62,
        },
        { team_id: null, matches_played: null },
        { team_id: 't-2', matches_played: null, wins: null, losses: null },
      ],
      error: null,
    });
    const rows = await PowerWeightSandboxService.fetchCurrentSeasonComponents();
    expect(mockFrom).toHaveBeenCalledWith('v_power_score_components_current');
    expect(rows).toHaveLength(2);
    expect(rows[0].team_id).toBe('t-1');
    expect(rows[1]).toMatchObject({ team_id: 't-2', matches_played: 0, wins: 0, losses: 0 });
  });

  it('reads all-season components keyed by team AND season', async () => {
    mockSelect.mockResolvedValueOnce({
      data: [
        { team_id: 't-1', season_id: 's-1', matches_played: 10, weighted_win_pct: 0.8 },
        { team_id: 't-1', season_id: null, matches_played: 2 },
      ],
      error: null,
    });
    const rows = await PowerWeightSandboxService.fetchAllSeasonsComponents();
    expect(mockFrom).toHaveBeenCalledWith('v_power_score_components');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ team_id: 't-1', season_id: 's-1', matches_played: 10 });
  });

  it('throws DatabaseError when a component view read fails', async () => {
    mockSelect.mockResolvedValueOnce({ data: null, error: pgError('P0001') });
    await expect(PowerWeightSandboxService.fetchCurrentSeasonComponents()).rejects.toThrow(
      DatabaseError
    );
  });
});

describe('PowerWeightSandboxService.applyWeights / revertWeights', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the triple and note through and parses the result', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        status: 'applied',
        win_weight: 50,
        sos_weight: 35,
        game_weight: 15,
        season_rows: 120,
      },
      error: null,
    });
    const result = await PowerWeightSandboxService.applyWeights(
      { win: 50, sos: 35, game: 15 },
      'trying more win weight'
    );
    expect(result).toEqual({ status: 'applied', seasonRows: 120 });
    expect(mockRpc).toHaveBeenCalledWith('admin_set_power_score_weights', {
      p_win: 50,
      p_sos: 35,
      p_game: 15,
      p_note: 'trying more win weight',
    });
  });

  it('sends a null note when none is given', async () => {
    mockRpc.mockResolvedValueOnce({ data: { status: 'reasserted', season_rows: 0 }, error: null });
    await PowerWeightSandboxService.applyWeights({ win: 40, sos: 45, game: 15 });
    expect(mockRpc).toHaveBeenCalledWith('admin_set_power_score_weights', {
      p_win: 40,
      p_sos: 45,
      p_game: 15,
      p_note: null,
    });
  });

  it('passes revert results through, including nothing_to_revert', async () => {
    mockRpc.mockResolvedValueOnce({ data: { status: 'nothing_to_revert' }, error: null });
    expect(await PowerWeightSandboxService.revertWeights()).toEqual({
      status: 'nothing_to_revert',
      seasonRows: 0,
    });
    expect(mockRpc).toHaveBeenCalledWith('admin_revert_power_score_weights', undefined);
  });

  it('throws PowerWeightsNotAppliedError while the migration is missing', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('PGRST202') });
    await expect(
      PowerWeightSandboxService.applyWeights({ win: 50, sos: 35, game: 15 })
    ).rejects.toThrow(PowerWeightsNotAppliedError);
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('42883') });
    await expect(PowerWeightSandboxService.revertWeights()).rejects.toThrow(
      PowerWeightsNotAppliedError
    );
  });

  it('throws DatabaseError on other failures (incl. the admin guard and validation)', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('P0001') });
    await expect(
      PowerWeightSandboxService.applyWeights({ win: 50, sos: 35, game: 15 })
    ).rejects.toThrow(DatabaseError);
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError('P0001') });
    await expect(PowerWeightSandboxService.revertWeights()).rejects.toThrow(DatabaseError);
  });
});

describe('toPowerScoreWeights', () => {
  it('maps a history row to the formula triple', () => {
    expect(toPowerScoreWeights(weightRow(1, 40, 45, 15))).toEqual({ win: 40, sos: 45, game: 15 });
  });
});

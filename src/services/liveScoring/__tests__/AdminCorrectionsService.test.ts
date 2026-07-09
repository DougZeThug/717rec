import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '@/types/errors';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table), rpc: vi.fn() },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  matchLog: vi.fn(),
}));

import { AdminCorrectionsService } from '../AdminCorrectionsService';

beforeEach(() => {
  mockFrom.mockReset();
});

describe('AdminCorrectionsService.updateRound', () => {
  it('rejects invalid team1 score', async () => {
    await expect(
      AdminCorrectionsService.updateRound('r1', { team1Score: 11 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a bag breakdown that does not match the score', async () => {
    await expect(
      AdminCorrectionsService.updateRound('r1', {
        team1Score: 8,
        team1Bags: { bagsIn: 1, bagsOn: 1, bagsOff: 2 },
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects when no changes are provided', async () => {
    await expect(AdminCorrectionsService.updateRound('r1', {})).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it('updates the round when the patch is valid', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'r1', team1_score: 8, team2_score: 5 },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });

    const result = await AdminCorrectionsService.updateRound('r1', {
      team1Score: 8,
      team2Score: 5,
      team1ThrowerId: 'p1',
      team2ThrowerId: null,
      team1Bags: { bagsIn: 2, bagsOn: 2, bagsOff: 0 },
    });

    expect(mockFrom).toHaveBeenCalledWith('match_rounds');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        team1_score: 8,
        team2_score: 5,
        team1_thrower_id: 'p1',
        team2_thrower_id: null,
        team1_bags_in: 2,
        team1_bags_on: 2,
        team1_bags_off: 0,
      })
    );
    expect(eq).toHaveBeenCalledWith('id', 'r1');
    expect(result.id).toBe('r1');
  });
});

describe('AdminCorrectionsService.deleteRound', () => {
  it('deletes the round by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ delete: del });

    await AdminCorrectionsService.deleteRound('r1');

    expect(mockFrom).toHaveBeenCalledWith('match_rounds');
    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', 'r1');
  });
});

describe('AdminCorrectionsService.setGameWinner', () => {
  it('updates games with winner and totals', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'g1', winner_team_id: 'team-2' },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });

    const result = await AdminCorrectionsService.setGameWinner('g1', 'team-2', {
      team1: 15,
      team2: 21,
    });

    expect(mockFrom).toHaveBeenCalledWith('games');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        winner_team_id: 'team-2',
        team1_score: 15,
        team2_score: 21,
        status: 'completed',
      })
    );
    expect(eq).toHaveBeenCalledWith('id', 'g1');
    expect(result.id).toBe('g1');
  });
});

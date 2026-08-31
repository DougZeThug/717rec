import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, ValidationError } from '@/types/errors';

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

// ─── Supabase wiring ──────────────────────────────────────────────────────────
//
// Every write now reads twice first: the round or game, to find its match's
// season, and that season, to see whether it is archived (B-20). The helpers
// below give each table a chain for both shapes, so one mockFrom serves the
// guard's reads and the write itself.

const readChain = (result: { data: unknown; error: unknown }) => {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, maybeSingle };
};

const writeChain = (result: { data: unknown; error: unknown }) => {
  const single = vi.fn().mockResolvedValue(result);
  const selectBack = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ select: selectBack }));
  const update = vi.fn(() => ({ eq }));
  return { update, eq, single };
};

const deleteChain = () => {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn(() => ({ eq }));
  return { del, eq };
};

const SEASON_ID = 'season-1';

interface Wiring {
  /** `seasons` row the guard reads. Omit for a live season. */
  season?: { id: string; name: string; is_archived: boolean } | null;
  /** What the round/game read returns. Omit for a row in SEASON_ID. */
  parent?: { match: { season_id: string | null } | null } | null;
  /** Row the write returns. */
  written?: unknown;
}

const wire = ({ season, parent, written }: Wiring = {}) => {
  const seasonRead = readChain({
    data: season === undefined ? { id: SEASON_ID, name: 'Summer 1', is_archived: false } : season,
    error: null,
  });
  const parentRead = readChain({
    data: parent === undefined ? { id: 'x', match: { season_id: SEASON_ID } } : parent,
    error: null,
  });
  const write = writeChain({ data: written ?? null, error: null });
  const remove = deleteChain();

  mockFrom.mockImplementation((table: string) => {
    if (table === 'seasons') return { select: seasonRead.select };
    return { select: parentRead.select, update: write.update, delete: remove.del };
  });

  return { seasonRead, parentRead, write, remove };
};

const ARCHIVED = { id: SEASON_ID, name: 'Summer 1', is_archived: true };

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
    const { write } = wire({ written: { id: 'r1', team1_score: 8, team2_score: 5 } });

    const result = await AdminCorrectionsService.updateRound('r1', {
      team1Score: 8,
      team2Score: 5,
      team1ThrowerId: 'p1',
      team2ThrowerId: null,
      team1Bags: { bagsIn: 2, bagsOn: 2, bagsOff: 0 },
    });

    expect(mockFrom).toHaveBeenCalledWith('match_rounds');
    expect(write.update).toHaveBeenCalledWith(
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
    expect(write.eq).toHaveBeenCalledWith('id', 'r1');
    expect(result.id).toBe('r1');
  });

  it('refuses to edit a round in an archived season and writes nothing', async () => {
    const { write } = wire({ season: ARCHIVED });

    await expect(
      AdminCorrectionsService.updateRound('r1', { team1Score: 8 })
    ).rejects.toBeInstanceOf(BusinessLogicError);
    expect(write.update).not.toHaveBeenCalled();
  });

  it('names the archived season in the refusal so the admin can see which', async () => {
    wire({ season: ARCHIVED });

    await expect(AdminCorrectionsService.updateRound('r1', { team1Score: 8 })).rejects.toThrow(
      /Summer 1 is archived/
    );
  });
});

describe('AdminCorrectionsService.deleteRound', () => {
  it('deletes the round by id', async () => {
    const { remove } = wire();

    await AdminCorrectionsService.deleteRound('r1');

    expect(mockFrom).toHaveBeenCalledWith('match_rounds');
    expect(remove.del).toHaveBeenCalled();
    expect(remove.eq).toHaveBeenCalledWith('id', 'r1');
  });

  it('refuses to delete a round in an archived season', async () => {
    const { remove } = wire({ season: ARCHIVED });

    await expect(AdminCorrectionsService.deleteRound('r1')).rejects.toBeInstanceOf(
      BusinessLogicError
    );
    expect(remove.del).not.toHaveBeenCalled();
  });

  it('allows the write when the round belongs to no season', async () => {
    const { remove } = wire({ parent: { match: { season_id: null } } });

    await AdminCorrectionsService.deleteRound('r1');

    expect(remove.del).toHaveBeenCalled();
  });

  it('allows the write when the round is already gone, so the delete no-ops', async () => {
    const { remove } = wire({ parent: null });

    await AdminCorrectionsService.deleteRound('r1');

    expect(remove.del).toHaveBeenCalled();
  });
});

describe('AdminCorrectionsService.setGameWinner', () => {
  it('updates games with winner and totals', async () => {
    const { write } = wire({ written: { id: 'g1', winner_team_id: 'team-2' } });

    const result = await AdminCorrectionsService.setGameWinner('g1', 'team-2', {
      team1: 15,
      team2: 21,
    });

    expect(mockFrom).toHaveBeenCalledWith('games');
    expect(write.update).toHaveBeenCalledWith(
      expect.objectContaining({
        winner_team_id: 'team-2',
        team1_score: 15,
        team2_score: 21,
        status: 'completed',
      })
    );
    expect(write.eq).toHaveBeenCalledWith('id', 'g1');
    expect(result.id).toBe('g1');
  });

  it('refuses to change a game winner in an archived season', async () => {
    const { write } = wire({ season: ARCHIVED });

    await expect(
      AdminCorrectionsService.setGameWinner('g1', 'team-2', { team1: 15, team2: 21 })
    ).rejects.toBeInstanceOf(BusinessLogicError);
    expect(write.update).not.toHaveBeenCalled();
  });
});

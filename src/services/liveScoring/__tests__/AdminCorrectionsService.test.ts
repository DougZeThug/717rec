import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, DatabaseError, ValidationError } from '@/types/errors';

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

  it('writes NULL to every bag column when the patch clears a breakdown', async () => {
    const { write } = wire({ written: { id: 'r1', team1_score: 8 } });

    // null is "clear them"; an absent key is "leave them alone". The edit
    // dialog sends null now, so this is the path a cleared breakdown takes.
    await AdminCorrectionsService.updateRound('r1', { team1Score: 8, team1Bags: null });

    expect(write.update).toHaveBeenCalledWith(
      expect.objectContaining({
        team1_score: 8,
        team1_bags_in: null,
        team1_bags_on: null,
        team1_bags_off: null,
      })
    );
  });

  it('leaves the bag columns out entirely when the patch omits them', async () => {
    const { write } = wire({ written: { id: 'r1', team1_score: 8 } });

    await AdminCorrectionsService.updateRound('r1', { team1Score: 8 });

    expect(write.update).toHaveBeenCalledWith(expect.not.objectContaining({ team1_bags_in: null }));
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

describe('AdminCorrectionsService.updateRound validation and payload', () => {
  const TEAM1_SCORE_MSG = 'Team 1 score must be 0-12 (11 is not possible in cornhole)';
  const TEAM2_SCORE_MSG = 'Team 2 score must be 0-12 (11 is not possible in cornhole)';
  const TEAM1_BAGS_MSG = 'Team 1 bag breakdown does not match the round score';
  const TEAM2_BAGS_MSG = 'Team 2 bag breakdown does not match the round score';

  // 8 = 2 in-the-hole (6) + 2 on-the-board (2). 5 = 1 in (3) + 2 on (2) + 1 off.
  const BAGS_FOR_8 = { bagsIn: 2, bagsOn: 2, bagsOff: 0 };
  const BAGS_FOR_5 = { bagsIn: 1, bagsOn: 2, bagsOff: 1 };
  const BAD_BAGS = { bagsIn: 1, bagsOn: 1, bagsOff: 2 };

  const sentKeys = (write: { update: { mock: { calls: unknown[][] } } }) =>
    Object.keys(write.update.mock.calls[0][0] as object).sort();

  describe('score checks', () => {
    it.each([11, -1, 13, 1.5])(
      'rejects a team 1 score of %s with the exact message',
      async (score) => {
        await expect(
          AdminCorrectionsService.updateRound('r1', { team1Score: score })
        ).rejects.toThrow(TEAM1_SCORE_MSG);
      }
    );

    it.each([11, -1, 13, 1.5])(
      'rejects a team 2 score of %s with the exact message',
      async (score) => {
        await expect(
          AdminCorrectionsService.updateRound('r1', { team2Score: score })
        ).rejects.toThrow(TEAM2_SCORE_MSG);
      }
    );

    it('accepts scores of 0 and 12', async () => {
      const { write } = wire({ written: { id: 'r1' } });

      await AdminCorrectionsService.updateRound('r1', { team1Score: 0, team2Score: 12 });

      expect(write.update).toHaveBeenCalledWith({ team1_score: 0, team2_score: 12 });
    });
  });

  describe('bag breakdown checks', () => {
    it('rejects a team 1 breakdown that does not match its score', async () => {
      await expect(
        AdminCorrectionsService.updateRound('r1', { team1Score: 8, team1Bags: BAD_BAGS })
      ).rejects.toThrow(TEAM1_BAGS_MSG);
    });

    it('rejects a team 2 breakdown that does not match its score', async () => {
      await expect(
        AdminCorrectionsService.updateRound('r1', { team2Score: 8, team2Bags: BAD_BAGS })
      ).rejects.toThrow(TEAM2_BAGS_MSG);
    });

    it('accepts a team 2 breakdown that matches its score', async () => {
      const { write } = wire({ written: { id: 'r1' } });

      await AdminCorrectionsService.updateRound('r1', { team2Score: 5, team2Bags: BAGS_FOR_5 });

      expect(write.update).toHaveBeenCalledWith({
        team2_score: 5,
        team2_bags_in: 1,
        team2_bags_on: 2,
        team2_bags_off: 1,
      });
    });

    it('does not check a breakdown when the patch has no score for that team', async () => {
      const { write } = wire({ written: { id: 'r1' } });

      await AdminCorrectionsService.updateRound('r1', { team1Bags: BAD_BAGS });

      expect(write.update).toHaveBeenCalledWith({
        team1_bags_in: 1,
        team1_bags_on: 1,
        team1_bags_off: 2,
      });
    });

    it('does not check a cleared (null) breakdown against the score', async () => {
      const { write } = wire({ written: { id: 'r1' } });

      await AdminCorrectionsService.updateRound('r1', { team2Score: 5, team2Bags: null });

      expect(write.update).toHaveBeenCalledWith({
        team2_score: 5,
        team2_bags_in: null,
        team2_bags_on: null,
        team2_bags_off: null,
      });
    });
  });

  describe('which error wins when several things are wrong', () => {
    it('reports team 1 score before team 2 score', async () => {
      await expect(
        AdminCorrectionsService.updateRound('r1', { team1Score: 11, team2Score: 11 })
      ).rejects.toThrow(TEAM1_SCORE_MSG);
    });

    it('reports a team 2 score error before a team 1 bag error', async () => {
      await expect(
        AdminCorrectionsService.updateRound('r1', {
          team1Score: 8,
          team1Bags: BAD_BAGS,
          team2Score: 11,
        })
      ).rejects.toThrow(TEAM2_SCORE_MSG);
    });

    it('reports team 1 bags before team 2 bags', async () => {
      await expect(
        AdminCorrectionsService.updateRound('r1', {
          team1Score: 8,
          team1Bags: BAD_BAGS,
          team2Score: 8,
          team2Bags: BAD_BAGS,
        })
      ).rejects.toThrow(TEAM1_BAGS_MSG);
    });

    it('reports a bag error before the empty-patch error', async () => {
      await expect(
        AdminCorrectionsService.updateRound('r1', { team1Score: 8, team1Bags: BAD_BAGS })
      ).rejects.toThrow(TEAM1_BAGS_MSG);
    });
  });

  describe('no database call before the patch is accepted', () => {
    it.each([
      ['an invalid score', { team1Score: 11 }],
      ['a mismatched breakdown', { team1Score: 8, team1Bags: BAD_BAGS }],
      ['an empty patch', {}],
      ['a patch of only undefined values', { team1ThrowerId: undefined, team2Score: undefined }],
    ])('makes no Supabase call for %s', async (_label, patch) => {
      wire();

      await expect(AdminCorrectionsService.updateRound('r1', patch)).rejects.toBeInstanceOf(
        ValidationError
      );

      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('says there is nothing to save for an empty patch', async () => {
      await expect(AdminCorrectionsService.updateRound('r1', {})).rejects.toThrow(
        'No changes to save'
      );
    });
  });

  describe('update payload', () => {
    it('sends only the thrower column for a thrower-only patch', async () => {
      const { write } = wire({ written: { id: 'r1' } });

      await AdminCorrectionsService.updateRound('r1', { team1ThrowerId: 'p1' });

      expect(sentKeys(write)).toEqual(['team1_thrower_id']);
      expect(write.update).toHaveBeenCalledWith({ team1_thrower_id: 'p1' });
    });

    it('treats a null thrower as a change that clears the column', async () => {
      const { write } = wire({ written: { id: 'r1' } });

      await AdminCorrectionsService.updateRound('r1', { team2ThrowerId: null });

      expect(sentKeys(write)).toEqual(['team2_thrower_id']);
      expect(write.update).toHaveBeenCalledWith({ team2_thrower_id: null });
    });

    it('sends exactly the keys the patch sets, for a mixed patch', async () => {
      const { write } = wire({ written: { id: 'r1' } });

      await AdminCorrectionsService.updateRound('r1', {
        team1Score: 8,
        team2Score: 5,
        team1ThrowerId: 'p1',
        team2ThrowerId: null,
        team1Bags: BAGS_FOR_8,
        team2Bags: null,
      });

      expect(sentKeys(write)).toEqual([
        'team1_bags_in',
        'team1_bags_off',
        'team1_bags_on',
        'team1_score',
        'team1_thrower_id',
        'team2_bags_in',
        'team2_bags_off',
        'team2_bags_on',
        'team2_score',
        'team2_thrower_id',
      ]);
      expect(write.update).toHaveBeenCalledWith({
        team1_score: 8,
        team2_score: 5,
        team1_thrower_id: 'p1',
        team2_thrower_id: null,
        team1_bags_in: 2,
        team1_bags_on: 2,
        team1_bags_off: 0,
        team2_bags_in: null,
        team2_bags_on: null,
        team2_bags_off: null,
      });
    });

    it('leaves out keys the patch sets to undefined', async () => {
      const { write } = wire({ written: { id: 'r1' } });

      await AdminCorrectionsService.updateRound('r1', {
        team1Score: 8,
        team2Score: undefined,
        team1ThrowerId: undefined,
        team2Bags: undefined,
      });

      expect(sentKeys(write)).toEqual(['team1_score']);
    });
  });

  describe('write result', () => {
    it('throws when the write returns no row', async () => {
      wire({ written: null });

      await expect(AdminCorrectionsService.updateRound('r1', { team1Score: 8 })).rejects.toThrow(
        'Round update returned no data'
      );
    });

    it('throws the database error when the write fails', async () => {
      const single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'XX000', message: 'boom', details: '', hint: '' },
      });
      const parentRead = readChain({ data: { id: 'r1', match: { season_id: null } }, error: null });
      mockFrom.mockImplementation(() => ({
        select: parentRead.select,
        update: () => ({ eq: () => ({ select: () => ({ single }) }) }),
      }));

      await expect(
        AdminCorrectionsService.updateRound('r1', { team1Score: 8 })
      ).rejects.toBeInstanceOf(DatabaseError);
      expect(mockFrom).toHaveBeenCalledWith('match_rounds');
    });
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

describe('AdminCorrectionsService.listLiveScoredMatches', () => {
  const team = (id: string, name: string) => ({ id, name });
  const matchRow = {
    id: 'm1',
    date: '2026-06-01',
    location: 'Lancaster',
    iscompleted: true,
    winner_id: 't1',
    season_id: SEASON_ID,
    team1: team('t1', 'Corn Stars'),
    team2: team('t2', 'Bag Raiders'),
  };

  /** games -> match ids, matches -> joined rows, match_rounds -> round counts. */
  const wireList = (gameRows: unknown[], matchRows: unknown[], roundRows: unknown[] = []) => {
    const matchEq = vi.fn().mockResolvedValue({ data: matchRows, error: null });
    const matchOrder = vi.fn(() =>
      Object.assign(Promise.resolve({ data: matchRows, error: null }), { eq: matchEq })
    );
    const matchIn = vi.fn(() => ({ order: matchOrder }));
    const roundIn = vi.fn().mockResolvedValue({ data: roundRows, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'games') {
        return { select: () => Promise.resolve({ data: gameRows, error: null }) };
      }
      if (table === 'matches') return { select: () => ({ in: matchIn }) };
      return { select: () => ({ in: roundIn }) };
    });
    return { matchIn, matchEq };
  };

  it('returns an empty list when no match has live-scored games', async () => {
    wireList([{ match_id: null }], []);

    await expect(AdminCorrectionsService.listLiveScoredMatches()).resolves.toEqual([]);
    expect(mockFrom).not.toHaveBeenCalledWith('matches');
  });

  it('lists each match once with its game and round counts', async () => {
    const { matchIn } = wireList(
      [{ match_id: 'm1' }, { match_id: 'm1' }, { match_id: null }],
      [matchRow],
      [{ match_id: 'm1' }, { match_id: 'm1' }, { match_id: 'm1' }]
    );

    const result = await AdminCorrectionsService.listLiveScoredMatches();

    expect(matchIn).toHaveBeenCalledWith('id', ['m1']);
    expect(result).toEqual([
      expect.objectContaining({
        id: 'm1',
        team1: { id: 't1', name: 'Corn Stars' },
        gameCount: 2,
        roundCount: 3,
      }),
    ]);
  });

  it('limits the list to one season when asked', async () => {
    const { matchEq } = wireList([{ match_id: 'm1' }], [matchRow]);

    await AdminCorrectionsService.listLiveScoredMatches(SEASON_ID);

    expect(matchEq).toHaveBeenCalledWith('season_id', SEASON_ID);
  });
});

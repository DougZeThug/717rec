import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError } from '@/types/errors';

import type { BracketAdminDeps } from '../../types';
import { applyLoserBracketRearrange } from '../apply';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  load: vi.fn(),
  simulate: vi.fn(),
}));

vi.mock('../../writes', () => ({ updateMatchRowOrThrow: mocks.update }));
vi.mock('../board', () => ({ loadRearrangeBoard: mocks.load }));
vi.mock('../simulate', () => ({ simulateRearrange: mocks.simulate }));
vi.mock('../../../BracketUpdate/completion', () => ({
  markBracketCompleteIfDone: vi.fn().mockResolvedValue(undefined),
}));

const deps = { storage: {} } as unknown as BracketAdminDeps;

beforeEach(() => {
  mocks.load.mockResolvedValue({
    snapshot: {
      matches: [
        { id: 1, status: 2 },
        { id: 2, status: 1 },
      ],
    },
  });
  mocks.simulate.mockReturnValue({
    ok: true,
    writes: [
      { matchId: 1, fields: {} },
      { matchId: 2, fields: {} },
    ],
    moves: ['Moved.'],
    consequences: [],
  });
});

describe('applyLoserBracketRearrange', () => {
  it('returns the changed matches when every write lands', async () => {
    mocks.update.mockResolvedValue(undefined);
    const result = await applyLoserBracketRearrange(deps, 'b1', []);
    expect(result.changedMatchIds).toEqual([1, 2]);
  });

  it('sends each match the status it had on the board the plan was made from', async () => {
    mocks.update.mockResolvedValue(undefined);
    await applyLoserBracketRearrange(deps, 'b1', []);
    expect(mocks.update).toHaveBeenNthCalledWith(
      1,
      1,
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ expectedStatus: 2, staleMessage: expect.any(String) })
    );
    expect(mocks.update).toHaveBeenNthCalledWith(
      2,
      2,
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ expectedStatus: 1 })
    );
  });

  it('refuses when the first match was played after the board was read', async () => {
    mocks.update.mockRejectedValueOnce(new BusinessLogicError('The bracket changed since'));
    await expect(applyLoserBracketRearrange(deps, 'b1', [])).rejects.toThrow(
      'The bracket changed since'
    );
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it('fails with the not-saved message when the first write changes nothing', async () => {
    mocks.update.mockRejectedValueOnce(new BusinessLogicError('Not saved — only admins'));
    await expect(applyLoserBracketRearrange(deps, 'b1', [])).rejects.toThrow('Not saved');
  });

  it('reports a half-done change when a later write changes nothing', async () => {
    mocks.update
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new BusinessLogicError('Not saved'));
    await expect(applyLoserBracketRearrange(deps, 'b1', [])).rejects.toThrow('Repair Bracket');
  });
});

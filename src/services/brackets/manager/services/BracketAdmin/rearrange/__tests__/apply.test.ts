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
  mocks.load.mockResolvedValue({ snapshot: { matches: [] } });
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

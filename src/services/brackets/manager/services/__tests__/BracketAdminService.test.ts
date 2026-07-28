import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

const { mockFrom, mockHandleDatabaseError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockHandleDatabaseError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/errorHandler', () => ({
  handleDatabaseError: (...args: unknown[]) => mockHandleDatabaseError(...args),
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  failureLog: vi.fn(),
  successLog: vi.fn(),
}));

import { BusinessLogicError } from '@/types/errors';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import { BracketAdminService } from '../BracketAdminService';

const updateEqChain = (result: { error: unknown }) => ({
  update: vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve(result)),
  })),
});

describe('BracketAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: toggles eligible losers BYE match to Ready', async () => {
    const storage = {
      select: vi
        .fn()
        .mockResolvedValueOnce({
          id: 99,
          round_id: 10,
          status: 1,
          opponent1: { id: 501 },
          opponent2: null,
        })
        .mockResolvedValueOnce({ id: 10, group_id: 20 })
        .mockResolvedValueOnce({ id: 20, number: 2 })
        .mockResolvedValueOnce({ id: 501, name: 'Team One' }),
    };

    const matchTable = updateEqChain({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'match') return matchTable;
      return updateEqChain({ error: null });
    });

    const service = new BracketAdminService(storage as unknown as SupabaseSqlStorage);
    const result = await service.adminToggleByeReady(99, true);

    expect(result).toEqual(
      expect.objectContaining({
        matchId: 99,
        status: 2,
        statusName: 'Ready',
      })
    );
    expect(mockFrom).toHaveBeenCalledWith('match');
    expect(matchTable.update).toHaveBeenCalledWith({ status: 2 });
  });

  it('malformed bracket input: throws validation-style business error when required rows are missing', async () => {
    const storage = {
      select: vi
        .fn()
        .mockResolvedValueOnce({
          id: 42,
          round_id: 200,
          status: 1,
          opponent1: { id: 9 },
          opponent2: null,
        })
        .mockResolvedValueOnce(null),
    };

    const service = new BracketAdminService(storage as unknown as SupabaseSqlStorage);
    const action = service.adminToggleByeReady(42, true);
    await expect(action).rejects.toThrow(BusinessLogicError);
    await expect(action).rejects.toThrow(/Cannot set to Ready/i);
  });

  it('partial write failure: bubbles Supabase/database failure as BusinessLogicError with original details', async () => {
    const storage = {
      select: vi
        .fn()
        .mockResolvedValueOnce({
          id: 7,
          stage_id: 2,
          status: 1,
          opponent1: { result: null },
          opponent2: { result: null },
        })
        .mockResolvedValueOnce({ id: 2, tournament_id: 'tour-1' })
        .mockResolvedValueOnce([{ id: 12, team_id: 'team-a', tournament_id: 'tour-1', name: 'A' }]),
      clearParticipantCache: vi.fn(),
      loadParticipantsForTournament: vi.fn(),
    };

    const pgErr = { message: 'write failed', code: '23505' };
    const dbError = new DatabaseError('Failed to update match participants', pgErr);
    mockHandleDatabaseError.mockImplementation(() => {
      throw dbError;
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'match') return updateEqChain({ error: pgErr });
      return updateEqChain({ error: null });
    });

    const service = new BracketAdminService(storage as unknown as SupabaseSqlStorage);

    await expect(service.editMatchParticipants(7, 'team-a', null)).rejects.toMatchObject({
      name: 'BusinessLogicError',
      details: dbError,
    });
  });

  it('reopening with a downstream clear never blanks a stored BYE marker', async () => {
    // A structural BYE is recorded as the word 'bye' in that side's result
    // column, and storage hands such a side back as exactly `null`. Both the
    // downstream clear and the reopen must leave that column out of their
    // update payloads, or the slot silently degrades to "to be decided".
    const byeMatch = {
      id: 500,
      stage_id: 1,
      round_id: 10,
      number: 1,
      status: 4,
      opponent1: null, // structural BYE
      opponent2: { id: 77, result: 'win' },
    };
    const downstreamMatch = {
      id: 501,
      stage_id: 1,
      round_id: 11,
      number: 1,
      status: 2,
      opponent1: null, // this one is bye-sided too
      opponent2: { id: 77 },
    };

    const storage = {
      select: vi.fn((table: string, filter: unknown) => {
        if (table === 'match') {
          if (filter === 500) return Promise.resolve(byeMatch);
          if (typeof filter === 'object') return Promise.resolve([byeMatch, downstreamMatch]);
        }
        if (table === 'round') {
          if (filter === 10) return Promise.resolve({ id: 10, group_id: 20, number: 1 });
          if (typeof filter === 'object') {
            return Promise.resolve([
              { id: 10, number: 1 },
              { id: 11, number: 2 },
            ]);
          }
        }
        if (table === 'group' && filter === 20) return Promise.resolve({ id: 20, number: 2 });
        if (table === 'participant' && filter === 77) {
          return Promise.resolve({ id: 77, name: 'Team Seven' });
        }
        return Promise.resolve(null);
      }),
    };

    const matchTable = updateEqChain({ error: null });
    mockFrom.mockImplementation(() => matchTable);

    const service = new BracketAdminService(storage as unknown as SupabaseSqlStorage);
    await service.adminToggleByeReady(500, false, true);

    const [downstreamPayload, reopenPayload] = matchTable.update.mock.calls.map(
      (call) => (call as unknown as [Record<string, unknown>])[0]
    );

    // The BYE side is simply not mentioned, so the stored 'bye' stays put.
    expect(downstreamPayload).not.toHaveProperty('opponent1_result');
    expect(downstreamPayload).toMatchObject({ status: 1, opponent2_result: null });
    expect(reopenPayload).not.toHaveProperty('opponent1_result');
    expect(reopenPayload).toMatchObject({ status: 2, opponent2_result: null });
  });
});

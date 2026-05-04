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
});

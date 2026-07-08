import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, DuplicateRoundError, LiveScoringNotEnabledError, ValidationError } from '@/types/errors';

// ─── Supabase mock (liveDb wraps the same client module) ─────────────────────

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

// Import after mocks
import { RoundService } from '../RoundService';
import type { InsertRoundInput } from '../RoundService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (code: string, msg = 'query failed') => ({
  message: msg,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const roundRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'round-1',
  match_id: 'match-1',
  game_id: 'game-1',
  round_number: 1,
  team1_score: 8,
  team2_score: 5,
  net_points: 3,
  winner_team: 1,
  team1_thrower_id: 'p1',
  team2_thrower_id: 'p2',
  team1_bags_in: 2,
  team1_bags_on: 2,
  team1_bags_off: 0,
  team2_bags_in: 1,
  team2_bags_on: 2,
  team2_bags_off: 1,
  entered_by_user_id: 'user-1',
  created_at: '2026-07-08T18:00:00Z',
  ...overrides,
});

const validInput = (overrides: Partial<InsertRoundInput> = {}): InsertRoundInput => ({
  matchId: 'match-1',
  gameId: 'game-1',
  roundNumber: 1,
  team1Score: 8,
  team2Score: 5,
  team1ThrowerId: 'p1',
  team2ThrowerId: 'p2',
  team1Bags: { bagsIn: 2, bagsOn: 2, bagsOff: 0 },
  team2Bags: { bagsIn: 1, bagsOn: 2, bagsOff: 1 },
  enteredByUserId: 'user-1',
  ...overrides,
});

// insert(payload).select(cols).single() → result
const insertChain = (result: { data: unknown; error: unknown }) => {
  const insert = vi.fn(() => ({ select: () => ({ single: () => Promise.resolve(result) }) }));
  mockFrom.mockReturnValue({ insert });
  return insert;
};

// delete().eq().eq().select() → result
const deleteChain = (result: { data: unknown; error: unknown }) => {
  const eq2 = vi.fn(() => ({ select: () => Promise.resolve(result) }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const del = vi.fn(() => ({ eq: eq1 }));
  mockFrom.mockReturnValue({ delete: del });
  return { del, eq1, eq2 };
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── insertRound ──────────────────────────────────────────────────────────────

describe('insertRound', () => {
  it('inserts the round with mapped columns and returns the row', async () => {
    const insert = insertChain({ data: roundRow(), error: null });

    const result = await RoundService.insertRound(validInput());

    expect(mockFrom).toHaveBeenCalledWith('match_rounds');
    expect(insert).toHaveBeenCalledWith({
      match_id: 'match-1',
      game_id: 'game-1',
      round_number: 1,
      team1_score: 8,
      team2_score: 5,
      team1_thrower_id: 'p1',
      team2_thrower_id: 'p2',
      team1_bags_in: 2,
      team1_bags_on: 2,
      team1_bags_off: 0,
      team2_bags_in: 1,
      team2_bags_on: 2,
      team2_bags_off: 1,
      entered_by_user_id: 'user-1',
    });
    expect(result.id).toBe('round-1');
  });

  it('stores null bag columns when no breakdown was captured', async () => {
    const insert = insertChain({ data: roundRow(), error: null });

    await RoundService.insertRound(validInput({ team1Bags: null, team2Bags: null }));

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ team1_bags_in: null, team2_bags_off: null })
    );
  });

  it('rejects the impossible score 11 before hitting the database', async () => {
    await expect(
      RoundService.insertRound(validInput({ team1Score: 11, team1Bags: null }))
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects out-of-range scores', async () => {
    await expect(
      RoundService.insertRound(validInput({ team2Score: 13, team2Bags: null }))
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects a bag breakdown that contradicts the score', async () => {
    await expect(
      RoundService.insertRound(validInput({ team1Bags: { bagsIn: 0, bagsOn: 3, bagsOff: 1 } }))
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('maps a unique violation (23505) to DuplicateRoundError', async () => {
    insertChain({ data: null, error: pgError('23505', 'duplicate key value') });

    await expect(RoundService.insertRound(validInput())).rejects.toBeInstanceOf(
      DuplicateRoundError
    );
  });

  it('maps a missing table (42P01) to LiveScoringNotEnabledError', async () => {
    insertChain({ data: null, error: pgError('42P01', 'relation does not exist') });

    await expect(RoundService.insertRound(validInput())).rejects.toBeInstanceOf(
      LiveScoringNotEnabledError
    );
  });

  it('throws DatabaseError for other failures', async () => {
    insertChain({ data: null, error: pgError('500', 'boom') });

    await expect(RoundService.insertRound(validInput())).rejects.toBeInstanceOf(DatabaseError);
  });
});

// ─── deleteLastRound ──────────────────────────────────────────────────────────

describe('deleteLastRound', () => {
  it('deletes exactly the given game/round pair and reports success', async () => {
    const { eq1, eq2 } = deleteChain({ data: [{ id: 'round-9' }], error: null });

    const deleted = await RoundService.deleteLastRound('game-1', 9);

    expect(mockFrom).toHaveBeenCalledWith('match_rounds');
    expect(eq1).toHaveBeenCalledWith('game_id', 'game-1');
    expect(eq2).toHaveBeenCalledWith('round_number', 9);
    expect(deleted).toBe(true);
  });

  it('returns false when the round was already gone (concurrent double-undo)', async () => {
    deleteChain({ data: [], error: null });

    await expect(RoundService.deleteLastRound('game-1', 9)).resolves.toBe(false);
  });

  it('throws DatabaseError on failure', async () => {
    deleteChain({ data: null, error: pgError('500') });

    await expect(RoundService.deleteLastRound('game-1', 9)).rejects.toBeInstanceOf(DatabaseError);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MatchResultData } from '../types/matchSubmissionTypes';
import { updateMatchInDatabase } from '../utils/matchUpdateUtils';

const { mockUpdateMatchArray, mockErrorLog, mockMatchLog, mockWarnLog } = vi.hoisted(() => ({
  mockUpdateMatchArray: vi.fn(),
  mockErrorLog: vi.fn(),
  mockMatchLog: vi.fn(),
  mockWarnLog: vi.fn(),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  updateMatchArray: mockUpdateMatchArray,
}));

vi.mock('@/utils/logger', () => ({
  errorLog: mockErrorLog,
  matchLog: mockMatchLog,
  warnLog: mockWarnLog,
}));

const makeResult = (overrides: Partial<MatchResultData> = {}): MatchResultData => ({
  winnerId: 'team-1',
  loserId: 'team-2',
  team1GameWins: 2,
  team2GameWins: 1,
  team1Id: 'team-1',
  team2Id: 'team-2',
  ...overrides,
});

describe('updateMatchInDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMatchArray.mockResolvedValue([{ id: 'match-1' }]);
  });

  it('writes binary match scores with team1 as winner and marks the match completed', async () => {
    await updateMatchInDatabase('match-1', 2, 1, makeResult());

    expect(mockUpdateMatchArray).toHaveBeenCalledWith('match-1', {
      team1_score: 1,
      team2_score: 0,
      iscompleted: true,
      winner_id: 'team-1',
      loser_id: 'team-2',
      team1_game_wins: 2,
      team2_game_wins: 1,
    });
  });

  it('writes binary match scores with team2 as winner', async () => {
    await updateMatchInDatabase(
      'match-1',
      0,
      2,
      makeResult({ winnerId: 'team-2', loserId: 'team-1' })
    );

    expect(mockUpdateMatchArray).toHaveBeenCalledWith(
      'match-1',
      expect.objectContaining({
        team1_score: 0,
        team2_score: 1,
        winner_id: 'team-2',
        loser_id: 'team-1',
        iscompleted: true,
      })
    );
  });

  it('coerces non-integer game wins to integers before writing', async () => {
    await updateMatchInDatabase(
      'match-1',
      '2' as unknown as number,
      '1' as unknown as number,
      makeResult()
    );

    const payload = mockUpdateMatchArray.mock.calls[0][1];
    expect(payload.team1_game_wins).toBe(2);
    expect(payload.team2_game_wins).toBe(1);
  });

  it('falls back to 0 when game wins are not parseable and warns about the 0-0 result', async () => {
    await updateMatchInDatabase(
      'match-1',
      'abc' as unknown as number,
      'xyz' as unknown as number,
      makeResult()
    );

    const payload = mockUpdateMatchArray.mock.calls[0][1];
    expect(payload.team1_game_wins).toBe(0);
    expect(payload.team2_game_wins).toBe(0);
    expect(mockWarnLog).toHaveBeenCalledWith('Completed match has zero game wins:', 'match-1');
  });

  it('throws when the winner id matches neither team (scores would not be binary)', async () => {
    await expect(
      updateMatchInDatabase(
        'match-1',
        2,
        1,
        makeResult({ winnerId: 'someone-else', loserId: 'team-2' })
      )
    ).rejects.toThrow('Match scores must be 1/0 based on winner/loser');

    expect(mockUpdateMatchArray).not.toHaveBeenCalled();
    expect(mockErrorLog).toHaveBeenCalled();
  });

  it('warns when the update affects zero rows but still returns the (empty) result', async () => {
    mockUpdateMatchArray.mockResolvedValue([]);

    const result = await updateMatchInDatabase('match-1', 2, 1, makeResult());

    expect(result).toEqual([]);
    expect(mockWarnLog).toHaveBeenCalledWith(
      'Supabase update returned 0 rows affected — possible match ID mismatch:',
      'match-1'
    );
  });

  it('returns the updated match rows from the service', async () => {
    const rows = [{ id: 'match-1', winner_id: 'team-1' }];
    mockUpdateMatchArray.mockResolvedValue(rows);

    await expect(updateMatchInDatabase('match-1', 2, 0, makeResult())).resolves.toBe(rows);
  });

  it('propagates service errors (services throw, callers handle)', async () => {
    mockUpdateMatchArray.mockRejectedValue(new Error('db down'));

    await expect(updateMatchInDatabase('match-1', 2, 1, makeResult())).rejects.toThrow('db down');
  });
});

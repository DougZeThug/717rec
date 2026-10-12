import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchPlayoffMatchTeams = vi.fn();
const updatePlayoffMatchScores = vi.fn();
const replacePlayoffGames = vi.fn();

vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchBmMatchData: vi.fn(),
  fetchParticipantsByIds: vi.fn(),
  fetchPlayoffMatchTeams: (...args: unknown[]) => fetchPlayoffMatchTeams(...args),
}));
vi.mock('@/services/brackets/BracketWriteService', () => ({
  replacePlayoffGames: (...args: unknown[]) => replacePlayoffGames(...args),
  updatePlayoffMatchScores: (...args: unknown[]) => updatePlayoffMatchScores(...args),
}));
vi.mock('@/services/brackets/manager', () => ({ bracketManagerService: { updateMatch: vi.fn() } }));
vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({}) }));

import { usePlayoffMatchUpdate } from '../usePlayoffMatchUpdate';

describe('usePlayoffMatchUpdate (legacy bracket) — game winners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPlayoffMatchTeams.mockResolvedValue({ team1_id: 't1', team2_id: 't2' });
    updatePlayoffMatchScores.mockResolvedValue(undefined);
    replacePlayoffGames.mockResolvedValue(undefined);
  });

  it('saves no winner for a tied or 0-0 placeholder game', async () => {
    const { result } = renderHook(() => usePlayoffMatchUpdate(null));

    await result.current.updateMatch(
      'm1',
      2,
      0,
      [
        { team1Score: 21, team2Score: 15 },
        { team1Score: 0, team2Score: 0 },
        { team1Score: 21, team2Score: 15 },
      ],
      2,
      0
    );

    expect(replacePlayoffGames).toHaveBeenCalledWith('m1', [
      { game_number: 1, team1_score: 21, team2_score: 15, winner_id: 't1' },
      { game_number: 2, team1_score: 0, team2_score: 0, winner_id: null },
      { game_number: 3, team1_score: 21, team2_score: 15, winner_id: 't1' },
    ]);
  });

  it('still gives team 2 the win when team 2 scored more', async () => {
    const { result } = renderHook(() => usePlayoffMatchUpdate(null));

    await result.current.updateMatch('m1', 0, 1, [{ team1Score: 10, team2Score: 21 }], 0, 1);

    expect(replacePlayoffGames).toHaveBeenCalledWith('m1', [
      { game_number: 1, team1_score: 10, team2_score: 21, winner_id: 't2' },
    ]);
  });
});

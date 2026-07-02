import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MatchWithTeams } from '../../../types';

vi.mock('@/utils/logger', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/utils/logger');
  return Object.fromEntries(Object.keys(actual).map((name) => [name, vi.fn()]));
});

import { warnLog } from '@/utils/logger';

import { useGameWinsHandler } from '../useGameWinsHandler';

const makeMatch = (overrides: Partial<MatchWithTeams> = {}): MatchWithTeams =>
  ({
    id: 'm1',
    team1Id: 't1',
    team2Id: 't2',
    date: '2026-06-20T18:00:00.000Z',
    ...overrides,
  }) as MatchWithTeams;

describe('useGameWinsHandler', () => {
  describe('calculateMatchScore', () => {
    it('awards the binary win to team 1 when it has more game wins', () => {
      const { result } = renderHook(() => useGameWinsHandler());
      expect(result.current.calculateMatchScore(2, 1)).toEqual({ team1Score: 1, team2Score: 0 });
    });

    it('awards the binary win to team 2 when it has more game wins', () => {
      const { result } = renderHook(() => useGameWinsHandler());
      expect(result.current.calculateMatchScore(0, 3)).toEqual({ team1Score: 0, team2Score: 1 });
    });

    it('returns null for tied game wins (including 0-0)', () => {
      const { result } = renderHook(() => useGameWinsHandler());
      expect(result.current.calculateMatchScore(1, 1)).toBeNull();
      expect(result.current.calculateMatchScore(0, 0)).toBeNull();
    });
  });

  describe('handleGameWinsChange', () => {
    it('returns a full update (game wins + derived binary scores + flags) when team 1 wins', () => {
      const { result } = renderHook(() => useGameWinsHandler());

      const update = result.current.handleGameWinsChange(makeMatch(), 2, 1);

      expect(update).toEqual({
        team1_game_wins: 2,
        team2_game_wins: 1,
        team1Score: 1,
        team2Score: 0,
        isEdited: true,
        isValid: true,
      });
    });

    it('derives the inverse binary score when team 2 wins', () => {
      const { result } = renderHook(() => useGameWinsHandler());

      const update = result.current.handleGameWinsChange(makeMatch(), 1, 2);

      expect(update.team1Score).toBe(0);
      expect(update.team2Score).toBe(1);
      expect(update.team1_game_wins).toBe(1);
      expect(update.team2_game_wins).toBe(2);
    });

    it('coerces string game-win inputs to numbers', () => {
      const { result } = renderHook(() => useGameWinsHandler());

      const update = result.current.handleGameWinsChange(
        makeMatch(),
        '3' as unknown as number,
        '1' as unknown as number
      );

      expect(update.team1_game_wins).toBe(3);
      expect(update.team2_game_wins).toBe(1);
      expect(update.team1Score).toBe(1);
      expect(update.team2Score).toBe(0);
    });

    it('returns an empty update and warns for tied game wins', () => {
      const { result } = renderHook(() => useGameWinsHandler());

      const update = result.current.handleGameWinsChange(makeMatch(), 2, 2);

      expect(update).toEqual({});
      expect(warnLog).toHaveBeenCalledWith(expect.stringContaining('2-2'));
    });
  });
});

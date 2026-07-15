import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlayoffActions } from '../usePlayoffActions';

const mockToast = vi.fn();

vi.mock('@/services/brackets/BracketWriteService', () => ({
  deleteBracket: vi.fn(),
  updatePlayoffMatchResult: vi.fn(),
  upsertPlayoffGame: vi.fn(),
}));

vi.mock('@/hooks/matches/utils/queryCacheUtils', () => ({
  invalidateMatchRelatedQueries: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/errorHandler', () => ({
  getUIErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
  logError: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import {
  deleteBracket,
  updatePlayoffMatchResult,
  upsertPlayoffGame,
} from '@/services/brackets/BracketWriteService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePlayoffActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteBracket', () => {
    it('calls service, shows success toast, and invalidates queries', async () => {
      (deleteBracket as ReturnType<typeof vi.fn>).mockImplementation(() => Promise.resolve());
      const { result } = renderHook(() => usePlayoffActions(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.deleteBracket('bracket-1', 'Spring Playoffs');
      });

      expect(deleteBracket).toHaveBeenCalledWith('bracket-1');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bracket Deleted' }));
      expect(invalidateMatchRelatedQueries).toHaveBeenCalled();
    });

    it('resets isDeleting after success', async () => {
      (deleteBracket as ReturnType<typeof vi.fn>).mockImplementation(() => Promise.resolve());
      const { result } = renderHook(() => usePlayoffActions(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.deleteBracket('bracket-1', 'Spring Playoffs');
      });

      expect(result.current.isDeleting).toBe(false);
    });

    it('shows error toast and resets isDeleting on service failure', async () => {
      (deleteBracket as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));
      const { result } = renderHook(() => usePlayoffActions(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.deleteBracket('bracket-1', 'Spring Playoffs');
        } catch {
          // expected re-throw
        }
      });

      expect(result.current.isDeleting).toBe(false);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });

    it('does nothing when isDeleting is already true', async () => {
      let resolveDelete!: () => void;
      (deleteBracket as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise<void>((res) => {
          resolveDelete = res;
        })
      );
      const { result } = renderHook(() => usePlayoffActions(), { wrapper: createWrapper() });

      // Start delete without awaiting
      act(() => {
        result.current.deleteBracket('bracket-1', 'Spring').catch(vi.fn());
      });
      await waitFor(() => expect(result.current.isDeleting).toBe(true));

      // Second call while in progress should be no-op
      await act(async () => {
        await result.current.deleteBracket('bracket-1', 'Spring');
      });

      expect(deleteBracket).toHaveBeenCalledTimes(1);
      resolveDelete();
    });
  });

  describe('updateMatchResult', () => {
    it('calls updatePlayoffMatchResult with correct payload and shows success toast', async () => {
      (updatePlayoffMatchResult as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Promise.resolve()
      );
      const { result } = renderHook(() => usePlayoffActions(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.updateMatchResult('match-1', 'team-a', 'team-b', 2, 1);
      });

      expect(updatePlayoffMatchResult).toHaveBeenCalledWith('match-1', {
        winner_id: 'team-a',
        loser_id: 'team-b',
        team1_score: 2,
        team2_score: 1,
        status: 'completed',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Match Updated' }));
    });

    it('calls upsertPlayoffGame for each game when games provided', async () => {
      (updatePlayoffMatchResult as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Promise.resolve()
      );
      (upsertPlayoffGame as ReturnType<typeof vi.fn>).mockImplementation(() => Promise.resolve());
      const { result } = renderHook(() => usePlayoffActions(), { wrapper: createWrapper() });

      const games = [
        { id: 'game-1', gameNumber: 1, team1Score: 11, team2Score: 5, winnerId: 'team-a' },
        { id: 'game-2', gameNumber: 2, team1Score: 11, team2Score: 8, winnerId: 'team-a' },
      ];

      await act(async () => {
        await result.current.updateMatchResult('match-1', 'team-a', 'team-b', 2, 0, 2, 0, games);
      });

      expect(upsertPlayoffGame).toHaveBeenCalledTimes(2);
    });

    it('shows error toast and re-throws on service failure', async () => {
      (updatePlayoffMatchResult as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Update failed')
      );
      const { result } = renderHook(() => usePlayoffActions(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.updateMatchResult('match-1', 'team-a', 'team-b', 2, 1);
        } catch {
          // expected
        }
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });
});

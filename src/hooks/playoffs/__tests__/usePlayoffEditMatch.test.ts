import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlayoffEditMatch } from '../usePlayoffEditMatch';

const mockToast = vi.fn();
const mockApplyOptimisticUpdate = vi.fn();
const mockOnSuccess = vi.fn();
const mockOnError = vi.fn();
const mockRollback = vi.fn();
const mockUpdateMatch = vi.fn();

vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchBmMatchWithStage: vi.fn(),
  fetchPlayoffMatchWithBracket: vi.fn(),
}));

vi.mock('@/hooks/playoffs/useOptimisticScoreMutation', () => ({
  useOptimisticScoreMutation: vi.fn(() => ({
    applyOptimisticUpdate: mockApplyOptimisticUpdate,
    onSuccess: mockOnSuccess,
    onError: mockOnError,
    rollback: mockRollback,
  })),
}));

vi.mock('@/hooks/playoffs/usePlayoffMatchUpdate', () => ({
  usePlayoffMatchUpdate: vi.fn(() => ({
    updateMatch: mockUpdateMatch,
  })),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  playoffLog: vi.fn(),
  errorLog: vi.fn(),
}));

import {
  fetchBmMatchWithStage,
  fetchPlayoffMatchWithBracket,
} from '@/services/brackets/BracketReadService';
import { useOptimisticScoreMutation } from '@/hooks/playoffs/useOptimisticScoreMutation';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockBmMatch = {
  id: 42,
  opponent1_id: 10,
  opponent2_id: 20,
  opponent1_score: 0,
  opponent2_score: 0,
  round_id: 1,
  number: 1,
  child_count: 3,
  status: 2,
  stage: { id: 1, tournament_id: 'bracket-123', name: 'Main', type: 'single_elimination', number: 1 },
};

const mockLegacyMatch = {
  id: 'match-uuid-1',
  bracket_id: 'bracket-456',
  round: 1,
  position: 1,
  team1_id: 'team-a',
  team2_id: 'team-b',
  winner_id: null,
  loser_id: null,
  team1_score: null,
  team2_score: null,
  match_type: 'winners',
  best_of: 3,
  team1_seed: 1,
  team2_seed: 2,
  next_win_match_id: null,
  next_lose_match_id: null,
  status: 'pending',
  bracket: { id: 'bracket-456', uses_brackets_manager: false },
  playoff_games: [],
};

describe('usePlayoffEditMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleEditMatch - brackets-manager format (integer ID)', () => {
    it('fetches BM match and sets editingMatch', async () => {
      (fetchBmMatchWithStage as ReturnType<typeof vi.fn>).mockResolvedValue(mockBmMatch);
      const { result } = renderHook(() => usePlayoffEditMatch(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.handleEditMatch('42');
      });

      expect(fetchBmMatchWithStage).toHaveBeenCalledWith(42);
      expect(result.current.editingMatch).not.toBeNull();
      expect(result.current.editingMatch?.id).toBe('42');
    });

    it('shows Match Locked toast when opponents are missing', async () => {
      (fetchBmMatchWithStage as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockBmMatch,
        opponent1_id: null,
        opponent2_id: null,
      });
      const { result } = renderHook(() => usePlayoffEditMatch(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.handleEditMatch('42');
      });

      expect(result.current.editingMatch).toBeNull();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Match Locked' })
      );
    });

    it('shows error toast when BM match fetch returns null', async () => {
      (fetchBmMatchWithStage as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const { result } = renderHook(() => usePlayoffEditMatch(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.handleEditMatch('42');
      });

      expect(result.current.editingMatch).toBeNull();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      );
    });

    it('updates optimistic mutation with bracket-specific query context after loading match', async () => {
      (fetchBmMatchWithStage as ReturnType<typeof vi.fn>).mockResolvedValue(mockBmMatch);
      const { result } = renderHook(() => usePlayoffEditMatch(), { wrapper: createWrapper() });

      expect(useOptimisticScoreMutation).toHaveBeenCalledWith(null);

      await act(async () => {
        await result.current.handleEditMatch('42');
      });

      expect(useOptimisticScoreMutation).toHaveBeenLastCalledWith('bracket-123');
    });
  });

  describe('handleEditMatch - legacy format (UUID)', () => {
    it('fetches legacy match and sets editingMatch', async () => {
      (fetchPlayoffMatchWithBracket as ReturnType<typeof vi.fn>).mockResolvedValue(mockLegacyMatch);
      const { result } = renderHook(() => usePlayoffEditMatch(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.handleEditMatch('match-uuid-1');
      });

      expect(fetchPlayoffMatchWithBracket).toHaveBeenCalledWith('match-uuid-1');
      expect(result.current.editingMatch).not.toBeNull();
      expect(result.current.editingMatch?.id).toBe('match-uuid-1');
    });

    it('shows error toast when legacy match not found', async () => {
      (fetchPlayoffMatchWithBracket as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const { result } = renderHook(() => usePlayoffEditMatch(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.handleEditMatch('match-uuid-1');
      });

      expect(result.current.editingMatch).toBeNull();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error' })
      );
    });

    it('shows Match Locked when teams not yet determined', async () => {
      (fetchPlayoffMatchWithBracket as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockLegacyMatch,
        team1_id: null,
        team2_id: null,
      });
      const { result } = renderHook(() => usePlayoffEditMatch(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.handleEditMatch('match-uuid-1');
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Match Locked' })
      );
    });
  });

  describe('handleCloseMatchEditor', () => {
    it('clears editingMatch', async () => {
      (fetchBmMatchWithStage as ReturnType<typeof vi.fn>).mockResolvedValue(mockBmMatch);
      const { result } = renderHook(() => usePlayoffEditMatch(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.handleEditMatch('42');
      });
      expect(result.current.editingMatch).not.toBeNull();

      act(() => { result.current.handleCloseMatchEditor(); });
      expect(result.current.editingMatch).toBeNull();
    });
  });

  describe('handleSaveMatchScore', () => {
    it('calls applyOptimisticUpdate, updateMatch, and onSuccess on success', async () => {
      (fetchBmMatchWithStage as ReturnType<typeof vi.fn>).mockResolvedValue(mockBmMatch);
      mockUpdateMatch.mockResolvedValue(undefined);
      const mockRefetch = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => usePlayoffEditMatch(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.handleEditMatch('42');
      });

      await act(async () => {
        await result.current.handleSaveMatchScore('42', 2, 1, [], 2, 1, mockRefetch);
      });

      expect(mockApplyOptimisticUpdate).toHaveBeenCalled();
      expect(mockUpdateMatch).toHaveBeenCalledWith('42', 2, 1, [], 2, 1);
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('calls onError and re-throws when updateMatch fails', async () => {
      (fetchBmMatchWithStage as ReturnType<typeof vi.fn>).mockResolvedValue(mockBmMatch);
      mockUpdateMatch.mockRejectedValue(new Error('Save failed'));
      const { result } = renderHook(() => usePlayoffEditMatch(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.handleEditMatch('42');
      });

      await act(async () => {
        try {
          await result.current.handleSaveMatchScore('42', 2, 1, [], 2, 1, vi.fn());
        } catch {
          // expected re-throw
        }
      });

      expect(mockOnError).toHaveBeenCalled();
    });

    it('shows optimistic success toast before mutation resolves', async () => {
      (fetchBmMatchWithStage as ReturnType<typeof vi.fn>).mockResolvedValue(mockBmMatch);
      let resolveUpdate!: () => void;
      mockUpdateMatch.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        })
      );

      const { result } = renderHook(() => usePlayoffEditMatch(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.handleEditMatch('42');
      });
      const savePromise = result.current.handleSaveMatchScore('42', 2, 1, [], 2, 1, vi.fn());

      expect(mockApplyOptimisticUpdate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Score saved!', description: 'Updating bracket...' })
      );

      act(() => {
        resolveUpdate();
      });
      await savePromise;
    });
  });
});

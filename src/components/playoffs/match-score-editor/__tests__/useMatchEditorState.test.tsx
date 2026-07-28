import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMatchEditorState } from '../useMatchEditorState';

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const matchData = {
  id: 1,
  opponent1: { id: 10, score: 0 },
  opponent2: { id: 20, score: 0 },
};

vi.mock('@/hooks/playoffs/useBracketsManagerMatch', () => ({
  useBracketsManagerMatch: () => ({ data: matchData, isLoading: false, error: null }),
}));

vi.mock('@/services/brackets/manager', () => ({
  bracketManagerService: {
    checkByeEligibility: vi
      .fn()
      .mockResolvedValue({ ok: false, meta: { status: 0, currentStatusName: 'Locked' } }),
    updateMatch: vi.fn().mockResolvedValue(undefined),
    adminToggleByeReady: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useMatchEditorState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets opponent1 score independently', () => {
    const { result } = renderHook(() => useMatchEditorState({ matchId: 1, onClose: vi.fn() }), {
      wrapper,
    });
    act(() => result.current.setOpponent1Score(3));
    expect(result.current.opponent1Score).toBe(3);
    expect(result.current.opponent2Score).toBe(0);
  });

  it('sets opponent2 score independently', () => {
    const { result } = renderHook(() => useMatchEditorState({ matchId: 1, onClose: vi.fn() }), {
      wrapper,
    });
    act(() => result.current.setOpponent2Score(5));
    expect(result.current.opponent1Score).toBe(0);
    expect(result.current.opponent2Score).toBe(5);
  });

  it('preserves opponent1 score when opponent2 setter runs after (double-setter)', () => {
    const { result } = renderHook(() => useMatchEditorState({ matchId: 1, onClose: vi.fn() }), {
      wrapper,
    });
    act(() => {
      result.current.setOpponent1Score(4);
      result.current.setOpponent2Score(2);
    });
    expect(result.current.opponent1Score).toBe(4);
    expect(result.current.opponent2Score).toBe(2);
  });

  it('preserves opponent2 score when opponent1 setter runs after (double-setter)', () => {
    const { result } = renderHook(() => useMatchEditorState({ matchId: 1, onClose: vi.fn() }), {
      wrapper,
    });
    act(() => {
      result.current.setOpponent2Score(7);
      result.current.setOpponent1Score(1);
    });
    expect(result.current.opponent1Score).toBe(1);
    expect(result.current.opponent2Score).toBe(7);
  });

  it('rejects tied scores before writing (PR-06)', async () => {
    const { bracketManagerService } = await import('@/services/brackets/manager');
    const { result } = renderHook(() => useMatchEditorState({ matchId: 1, onClose: vi.fn() }), {
      wrapper,
    });
    act(() => {
      result.current.setOpponent1Score(2);
      result.current.setOpponent2Score(2);
    });
    await act(async () => {
      await result.current.handleSave();
    });
    expect(bracketManagerService.updateMatch).not.toHaveBeenCalled();
  });

  it('allows decisive (non-tied) scores', async () => {
    const { bracketManagerService } = await import('@/services/brackets/manager');
    const { result } = renderHook(() => useMatchEditorState({ matchId: 1, onClose: vi.fn() }), {
      wrapper,
    });
    act(() => {
      result.current.setOpponent1Score(3);
      result.current.setOpponent2Score(1);
    });
    await act(async () => {
      await result.current.handleSave();
    });
    expect(bracketManagerService.updateMatch).toHaveBeenCalledTimes(1);
  });

  describe('BYE status toggle direction', () => {
    // The hook picks unlock vs revert from the current status, and must stay in
    // step with the buttons ByeStatusControl renders for that same status.
    it.each([
      [0, 'Locked', true],
      [1, 'Waiting', true],
      [2, 'Ready', false],
      [3, 'Running', false],
      [4, 'Completed', false],
    ])('sends makeReady=%s for status %i (%s)', async (status, statusName, makeReady) => {
      const { bracketManagerService } = await import('@/services/brackets/manager');
      vi.mocked(bracketManagerService.checkByeEligibility).mockResolvedValue({
        ok: true,
        meta: { status, currentStatusName: statusName },
      } as never);
      vi.mocked(bracketManagerService.adminToggleByeReady).mockResolvedValue({
        matchId: 1,
        status: 1,
        statusName: 'Waiting',
        message: 'done',
      } as never);

      const { result } = renderHook(() => useMatchEditorState({ matchId: 1, onClose: vi.fn() }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.byeEligible?.currentStatus).toBe(status));

      await act(async () => {
        await result.current.handleToggleByeStatus();
      });

      expect(bracketManagerService.adminToggleByeReady).toHaveBeenCalledWith(1, makeReady, false);
    });
  });
});

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

// Lets a test hand the hook a new `matchData` reference, as a refetch would.
const matchOverride = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('@/hooks/playoffs/useBracketsManagerMatch', () => ({
  useBracketsManagerMatch: () => ({
    data: matchOverride.current ?? matchData,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/services/brackets/manager', () => ({
  bracketManagerService: {
    checkByeEligibility: vi
      .fn()
      .mockResolvedValue({ ok: false, meta: { status: 0, currentStatusName: 'Locked' } }),
    // vi.fn() alone returns undefined, not a promise; this sets the resolved value.
    updateMatch: vi.fn().mockResolvedValue(undefined), // skipcq: JS-W1042
    adminToggleByeReady: vi.fn(),
  },
}));

let client: QueryClient;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

const invalidatedKeys = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map((call) => (call[0] as { queryKey: unknown[] }).queryKey);

describe('useMatchEditorState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('sets opponent1 score independently', () => {
    const { result } = renderHook(
      () => useMatchEditorState({ matchId: 1, bracketId: 'bracket-1', onClose: vi.fn() }),
      {
        wrapper,
      }
    );
    act(() => result.current.setOpponent1Score(3));
    expect(result.current.opponent1Score).toBe(3);
    expect(result.current.opponent2Score).toBe(0);
  });

  it('sets opponent2 score independently', () => {
    const { result } = renderHook(
      () => useMatchEditorState({ matchId: 1, bracketId: 'bracket-1', onClose: vi.fn() }),
      {
        wrapper,
      }
    );
    act(() => result.current.setOpponent2Score(5));
    expect(result.current.opponent1Score).toBe(0);
    expect(result.current.opponent2Score).toBe(5);
  });

  it('drops a typed score when the teams in the match change', () => {
    const { result, rerender } = renderHook(
      () => useMatchEditorState({ matchId: 1, bracketId: 'bracket-1', onClose: vi.fn() }),
      { wrapper }
    );
    act(() => result.current.setOpponent1Score(3));
    expect(result.current.opponent1Score).toBe(3);

    // Edit teams replaced opponent1: the draft belonged to the old pairing.
    const original = matchData.opponent1;
    matchData.opponent1 = { id: 11, score: 0 };
    try {
      rerender();
      expect(result.current.opponent1Score).toBe(0);
    } finally {
      matchData.opponent1 = original;
    }
  });

  it('keeps the newest BYE eligibility result when an older check resolves last', async () => {
    const { bracketManagerService } = await import('@/services/brackets/manager');
    const check = vi.mocked(bracketManagerService.checkByeEligibility);
    const deferred = () => {
      let resolve!: (value: Awaited<ReturnType<typeof check>>) => void;
      const promise = new Promise<Awaited<ReturnType<typeof check>>>((r) => {
        resolve = r;
      });
      return { promise, resolve };
    };
    const older = deferred();
    const newer = deferred();
    check.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);

    const { result, rerender } = renderHook(
      () => useMatchEditorState({ matchId: 1, bracketId: 'bracket-1', onClose: vi.fn() }),
      { wrapper }
    );

    // A refetch hands the hook a new matchData reference, firing a second check.
    matchOverride.current = { ...matchData };
    try {
      rerender();
      expect(check).toHaveBeenCalledTimes(2);

      await act(async () => {
        newer.resolve({ ok: true, meta: { status: 2, currentStatusName: 'Ready' } } as never);
        await newer.promise;
      });
      await waitFor(() => expect(result.current.byeEligible?.currentStatus).toBe(2));

      // The older check resolves last. It must not overwrite the newer result.
      await act(async () => {
        older.resolve({ ok: true, meta: { status: 1, currentStatusName: 'Waiting' } } as never);
        await older.promise;
      });
      expect(result.current.byeEligible?.currentStatus).toBe(2);
      expect(result.current.byeEligible?.statusName).toBe('Ready');
    } finally {
      matchOverride.current = null;
    }
  });

  it('preserves opponent1 score when opponent2 setter runs after (double-setter)', () => {
    const { result } = renderHook(
      () => useMatchEditorState({ matchId: 1, bracketId: 'bracket-1', onClose: vi.fn() }),
      {
        wrapper,
      }
    );
    act(() => {
      result.current.setOpponent1Score(4);
      result.current.setOpponent2Score(2);
    });
    expect(result.current.opponent1Score).toBe(4);
    expect(result.current.opponent2Score).toBe(2);
  });

  it('preserves opponent2 score when opponent1 setter runs after (double-setter)', () => {
    const { result } = renderHook(
      () => useMatchEditorState({ matchId: 1, bracketId: 'bracket-1', onClose: vi.fn() }),
      {
        wrapper,
      }
    );
    act(() => {
      result.current.setOpponent2Score(7);
      result.current.setOpponent1Score(1);
    });
    expect(result.current.opponent1Score).toBe(1);
    expect(result.current.opponent2Score).toBe(7);
  });

  it('rejects tied scores before writing (PR-06)', async () => {
    const { bracketManagerService } = await import('@/services/brackets/manager');
    const { result } = renderHook(
      () => useMatchEditorState({ matchId: 1, bracketId: 'bracket-1', onClose: vi.fn() }),
      {
        wrapper,
      }
    );
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
    const { result } = renderHook(
      () => useMatchEditorState({ matchId: 1, bracketId: 'bracket-1', onClose: vi.fn() }),
      {
        wrapper,
      }
    );
    act(() => {
      result.current.setOpponent1Score(3);
      result.current.setOpponent2Score(1);
    });
    await act(async () => {
      await result.current.handleSave();
    });
    expect(bracketManagerService.updateMatch).toHaveBeenCalledTimes(1);
  });

  it('refreshes the bracket grid after a score save', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(
      () => useMatchEditorState({ matchId: 1, bracketId: 'bracket-1', onClose: vi.fn() }),
      { wrapper }
    );
    act(() => {
      result.current.setOpponent1Score(3);
      result.current.setOpponent2Score(1);
    });
    await act(async () => {
      await result.current.handleSave();
    });

    expect(invalidatedKeys(spy)).toEqual(
      expect.arrayContaining([
        ['bracket-data', 'bracket-1'],
        ['bracket-info', 'bracket-1'],
      ])
    );
  });

  it('refreshes the bracket grid after a BYE status change', async () => {
    const { bracketManagerService } = await import('@/services/brackets/manager');
    vi.mocked(bracketManagerService.checkByeEligibility).mockResolvedValue({
      ok: true,
      meta: { status: 4, currentStatusName: 'Completed' },
    } as never);
    vi.mocked(bracketManagerService.adminToggleByeReady).mockResolvedValue({
      matchId: 1,
      status: 2,
      statusName: 'Ready',
      message: 'done',
    } as never);
    const spy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(
      () => useMatchEditorState({ matchId: 1, bracketId: 'bracket-1', onClose: vi.fn() }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.byeEligible?.currentStatus).toBe(4));
    await act(async () => {
      // Reopen + Clear Downstream: every later match changes in one write.
      await result.current.handleToggleByeStatus(true);
    });

    expect(invalidatedKeys(spy)).toEqual(
      expect.arrayContaining([
        ['bracket-data', 'bracket-1'],
        ['bracket-info', 'bracket-1'],
        ['playoff-matches'],
      ])
    );
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

      const { result } = renderHook(
        () => useMatchEditorState({ matchId: 1, bracketId: 'bracket-1', onClose: vi.fn() }),
        {
          wrapper,
        }
      );
      await waitFor(() => expect(result.current.byeEligible?.currentStatus).toBe(status));

      await act(async () => {
        await result.current.handleToggleByeStatus();
      });

      expect(bracketManagerService.adminToggleByeReady).toHaveBeenCalledWith(1, makeReady, false);
    });
  });
});

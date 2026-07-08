import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
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
    checkByeEligibility: vi.fn().mockResolvedValue({ ok: false, meta: { status: 0, currentStatusName: 'Locked' } }),
    updateMatch: vi.fn(),
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
    const { result } = renderHook(
      () => useMatchEditorState({ matchId: 1, onClose: vi.fn() }),
      { wrapper }
    );
    act(() => result.current.setOpponent1Score(3));
    expect(result.current.opponent1Score).toBe(3);
    expect(result.current.opponent2Score).toBe(0);
  });

  it('sets opponent2 score independently', () => {
    const { result } = renderHook(
      () => useMatchEditorState({ matchId: 1, onClose: vi.fn() }),
      { wrapper }
    );
    act(() => result.current.setOpponent2Score(5));
    expect(result.current.opponent1Score).toBe(0);
    expect(result.current.opponent2Score).toBe(5);
  });

  it('preserves opponent1 score when opponent2 setter runs after (double-setter)', () => {
    const { result } = renderHook(
      () => useMatchEditorState({ matchId: 1, onClose: vi.fn() }),
      { wrapper }
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
      () => useMatchEditorState({ matchId: 1, onClose: vi.fn() }),
      { wrapper }
    );
    act(() => {
      result.current.setOpponent2Score(7);
      result.current.setOpponent1Score(1);
    });
    expect(result.current.opponent1Score).toBe(1);
    expect(result.current.opponent2Score).toBe(7);
  });
});

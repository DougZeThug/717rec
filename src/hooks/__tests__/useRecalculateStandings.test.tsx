import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRecalculateStandings } from '../useRecalculateStandings';

const mockToast = vi.fn();
const mockCalculate = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/services/brackets/manager', () => ({
  bracketManagerService: {
    calculateFinalStandings: (...args: unknown[]) => mockCalculate(...args),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

const wrapper = (client: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('useRecalculateStandings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows success toast and invalidates standings on written=true', async () => {
    mockCalculate.mockResolvedValueOnce({ written: true });
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useRecalculateStandings('b1'), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      await result.current.recalculate();
    });

    expect(mockCalculate).toHaveBeenCalledWith('b1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['final-standings', 'b1'] });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Final standings calculated' })
    );
  });

  it('shows pending toast when matches are incomplete', async () => {
    mockCalculate.mockResolvedValueOnce({ written: false, reason: 'incomplete-matches' });
    const { result } = renderHook(() => useRecalculateStandings('b1'), {
      wrapper: wrapper(new QueryClient()),
    });
    await act(async () => {
      await result.current.recalculate();
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Bracket still has unfinished matches' })
    );
  });

  it('shows destructive toast when calculate throws', async () => {
    mockCalculate.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useRecalculateStandings('b1'), {
      wrapper: wrapper(new QueryClient()),
    });
    await act(async () => {
      await result.current.recalculate();
    });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not calculate standings yet',
          variant: 'destructive',
        })
      );
    });
  });
});

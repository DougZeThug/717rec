import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockBatchUpdate, mockToast } = vi.hoisted(() => ({
  mockBatchUpdate: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock('@/services/TeamStatsService', () => ({ batchUpdateSeasonStats: mockBatchUpdate }));
vi.mock('@/hooks/useToast', () => ({ toast: mockToast }));
vi.mock('@/utils/logger', () => ({ dbLog: vi.fn(), errorLog: vi.fn() }));

import { useUpdateSeasonStats } from '../useUpdateSeasonStats';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children
  );

const update = { team_id: 't1', season_id: 's1', wins: 3, losses: 1 } as never;

describe('useUpdateSeasonStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves and returns true', async () => {
    mockBatchUpdate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useUpdateSeasonStats(), { wrapper });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.updateStats([update]);
    });

    expect(ok).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does nothing for an empty list', async () => {
    const { result } = renderHook(() => useUpdateSeasonStats(), { wrapper });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.updateStats([]);
    });

    expect(ok).toBe(true);
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  it('keeps the error, shows a toast and returns false when the save fails', async () => {
    mockBatchUpdate.mockRejectedValue(new Error('db down'));
    const { result } = renderHook(() => useUpdateSeasonStats(), { wrapper });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.updateStats([update]);
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.isUpdating).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Couldn't update season stats", variant: 'destructive' })
    );
  });
});

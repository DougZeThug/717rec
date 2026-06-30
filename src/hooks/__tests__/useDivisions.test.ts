import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDivisions } from '../useDivisions';

vi.mock('@/services/DivisionService', () => ({
  DivisionService: { fetchDivisions: vi.fn() },
}));
vi.mock('@/utils/logger', () => ({ teamLog: vi.fn() }));

import { DivisionService } from '@/services/DivisionService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useDivisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state and empty divisions while fetching', () => {
    (DivisionService.fetchDivisions as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(vi.fn())
    );
    const { result } = renderHook(() => useDivisions(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.divisions).toEqual([]);
  });

  it('returns mapped divisions on success', async () => {
    (DivisionService.fetchDivisions as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'd1',
        name: 'Competitive',
        division_weight: 3,
        display_division: 'Competitive',
        created_at: '2026-01-01',
      },
    ]);
    const { result } = renderHook(() => useDivisions(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.divisions).toEqual([
      {
        id: 'd1',
        name: 'Competitive',
        division_weight: 3,
        display_division: 'Competitive',
        created_at: '2026-01-01',
      },
    ]);
    expect(DivisionService.fetchDivisions).toHaveBeenCalled();
  });

  it('applies default values for null fields', async () => {
    (DivisionService.fetchDivisions as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'd2',
        name: null,
        division_weight: null,
        display_division: null,
        created_at: null,
      } as unknown,
    ]);
    const { result } = renderHook(() => useDivisions(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.divisions).toEqual([
      {
        id: 'd2',
        name: '',
        division_weight: 0,
        display_division: '',
        created_at: '',
      },
    ]);
  });

  it('returns empty divisions and an error on service failure', async () => {
    (DivisionService.fetchDivisions as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Failed to fetch divisions')
    );
    const { result } = renderHook(() => useDivisions(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.divisions).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});

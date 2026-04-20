import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSeedValidation } from '../useSeedValidation';

vi.mock('@/services/brackets/BracketReadService', () => ({
  validateSeeds: vi.fn(),
}));

import { validateSeeds } from '@/services/brackets/BracketReadService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockResults = [
  { team_id: 'team-1', team_name: 'Alpha', seed: 1, conflict_count: 0 },
  { team_id: 'team-2', team_name: 'Beta', seed: 2, conflict_count: 1 },
];

describe('useSeedValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when divisionId is undefined', () => {
    const { result } = renderHook(() => useSeedValidation(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(validateSeeds).not.toHaveBeenCalled();
  });

  it('shows loading state while fetching', () => {
    (validateSeeds as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(vi.fn()));
    const { result } = renderHook(() => useSeedValidation('div-1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns validation results on success', async () => {
    (validateSeeds as ReturnType<typeof vi.fn>).mockResolvedValue(mockResults);
    const { result } = renderHook(() => useSeedValidation('div-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockResults);
    expect(validateSeeds).toHaveBeenCalledWith('div-1');
  });

  it('returns empty array when no conflicts found', async () => {
    (validateSeeds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useSeedValidation('div-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });

  it('sets error state on service failure', async () => {
    (validateSeeds as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Validation failed'));
    const { result } = renderHook(() => useSeedValidation('div-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

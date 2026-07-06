import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DivisionService } from '@/services/DivisionService';
import { clearDivisionWeightsCache } from '@/utils/rankingUtils/divisionWeightsCache';

import { useDivisionMutations } from '../useDivisionMutations';

const toast = vi.fn();
vi.mock('@/hooks/useToast', () => ({ toast: (...args: unknown[]) => toast(...args) }));
vi.mock('@/services/DivisionService', () => ({
  DivisionService: {
    createDivision: vi.fn(),
    updateDivision: vi.fn(),
    deleteDivision: vi.fn(),
  },
}));
vi.mock('@/utils/rankingUtils/divisionWeightsCache', () => ({
  clearDivisionWeightsCache: vi.fn(),
}));

let queryClient: QueryClient;
const createWrapper = () => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

const input = { name: 'Comp A', display_division: 'Competitive' as const, division_weight: 1 };

describe('useDivisionMutations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a division, clears the weights cache, and invalidates division queries', async () => {
    (DivisionService.createDivision as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const { result } = renderHook(() => useDivisionMutations(), { wrapper: createWrapper() });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.createDivision.mutateAsync(input);
    });

    expect(DivisionService.createDivision).toHaveBeenCalledWith(input);
    expect(clearDivisionWeightsCache).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['divisions'] });
    expect(toast).toHaveBeenCalledWith({ title: 'Division created' });
  });

  it('updates a division with the id and patch', async () => {
    (DivisionService.updateDivision as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const { result } = renderHook(() => useDivisionMutations(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.updateDivision.mutateAsync({ id: 'd1', patch: { name: 'New' } });
    });

    expect(DivisionService.updateDivision).toHaveBeenCalledWith('d1', { name: 'New' });
    expect(toast).toHaveBeenCalledWith({ title: 'Division updated' });
  });

  it('deletes a division by id', async () => {
    (DivisionService.deleteDivision as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const { result } = renderHook(() => useDivisionMutations(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.deleteDivision.mutateAsync('d1');
    });

    expect(DivisionService.deleteDivision).toHaveBeenCalledWith('d1');
    expect(toast).toHaveBeenCalledWith({ title: 'Division deleted' });
  });

  it('surfaces failures with a destructive toast and does not invalidate', async () => {
    (DivisionService.createDivision as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('dup')
    );
    const { result } = renderHook(() => useDivisionMutations(), { wrapper: createWrapper() });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await expect(result.current.createDivision.mutateAsync(input)).rejects.toThrow('dup');
    });

    expect(spy).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failed to create division', variant: 'destructive' })
    );
  });
});

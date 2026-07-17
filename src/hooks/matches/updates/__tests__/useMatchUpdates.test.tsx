import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match } from '@/types';

const {
  mockHandleUpdateMatch,
  mockHandleDeleteMatch,
  mockInvalidateAllDataQueries,
  updateHookProps,
  deleteHookProps,
} = vi.hoisted(() => ({
  mockHandleUpdateMatch: vi.fn(),
  mockHandleDeleteMatch: vi.fn(),
  mockInvalidateAllDataQueries: vi.fn(),
  updateHookProps: { current: null as Record<string, unknown> | null },
  deleteHookProps: { current: null as Record<string, unknown> | null },
}));

vi.mock('../useMatchUpdate', () => ({
  useMatchUpdate: (props: Record<string, unknown>) => {
    updateHookProps.current = props;
    return { handleUpdateMatch: mockHandleUpdateMatch, isUpdating: false };
  },
}));

vi.mock('../useMatchDelete', () => ({
  useMatchDelete: (props: Record<string, unknown>) => {
    deleteHookProps.current = props;
    return { handleDeleteMatch: mockHandleDeleteMatch };
  },
}));

vi.mock('../utils/queryInvalidation', () => ({
  invalidateAllDataQueries: mockInvalidateAllDataQueries,
}));

import { useMatchUpdates } from '../useMatchUpdates';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const match = { id: 'match-1', team1Id: 't1', team2Id: 't2' } as unknown as Match;

describe('useMatchUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateHookProps.current = null;
    deleteHookProps.current = null;
  });

  it('starts with no editing match, no delete selection and not deleting', () => {
    const { result } = renderHook(() => useMatchUpdates([match], vi.fn()), { wrapper });

    expect(result.current.editingMatch).toBeUndefined();
    expect(result.current.deleteMatchId).toBeNull();
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.isUpdating).toBe(false);
  });

  it('exposes the update/delete handlers from the sub-hooks', () => {
    const { result } = renderHook(() => useMatchUpdates([match], vi.fn()), { wrapper });

    expect(result.current.handleUpdateMatch).toBe(mockHandleUpdateMatch);
    expect(result.current.handleDeleteMatch).toBe(mockHandleDeleteMatch);
  });

  it('wires matches, setMatches and editing state into the update sub-hook', () => {
    const setMatches = vi.fn();
    const { result } = renderHook(() => useMatchUpdates([match], setMatches), { wrapper });

    expect(updateHookProps.current).toMatchObject({
      matches: [match],
      setMatches,
      editingMatch: undefined,
    });

    act(() => {
      result.current.setEditingMatch(match);
    });

    expect(result.current.editingMatch).toBe(match);
    expect(updateHookProps.current).toMatchObject({ editingMatch: match });
  });

  it('tracks the delete selection and lets the delete sub-hook toggle isDeleting', () => {
    const { result } = renderHook(() => useMatchUpdates([match], vi.fn()), { wrapper });

    act(() => {
      result.current.setDeleteMatchId('match-1');
    });
    expect(result.current.deleteMatchId).toBe('match-1');
    expect(deleteHookProps.current).toMatchObject({ deleteMatchId: 'match-1' });

    const setIsDeleting = deleteHookProps.current?.setIsDeleting as (v: boolean) => void;
    act(() => {
      setIsDeleting(true);
    });
    expect(result.current.isDeleting).toBe(true);
  });

  it('invalidateAllDataQueries forwards the query client to the shared util', () => {
    const { result } = renderHook(() => useMatchUpdates([match], vi.fn()), { wrapper });

    result.current.invalidateAllDataQueries();

    expect(mockInvalidateAllDataQueries).toHaveBeenCalledTimes(1);
    expect(mockInvalidateAllDataQueries).toHaveBeenCalledWith(expect.any(QueryClient));
  });
});

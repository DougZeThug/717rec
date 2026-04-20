import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useResolveTeamSlug } from '../useResolveTeamSlug';

vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: vi.fn(),
}));

import { useTeamsQuery } from '@/hooks/teams';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockTeams = [
  { id: 'team-uuid-1', name: 'Alpha Bowling' },
  { id: 'team-uuid-2', name: 'Beta Strikes' },
];

describe('useResolveTeamSlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useTeamsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockTeams,
      isLoading: false,
    });
  });

  it('returns undefined teamId and no loading for undefined param', () => {
    const { result } = renderHook(() => useResolveTeamSlug(undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.teamId).toBeUndefined();
    expect(result.current.isResolving).toBe(false);
  });

  it('passes UUID through directly without querying teams', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const { result } = renderHook(() => useResolveTeamSlug(uuid), {
      wrapper: createWrapper(),
    });
    expect(result.current.teamId).toBe(uuid);
    expect(result.current.isResolving).toBe(false);
    // useTeamsQuery called but with enabled:false for UUIDs
    expect(useTeamsQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('resolves slug to matching team UUID', () => {
    const { result } = renderHook(() => useResolveTeamSlug('alpha-bowling'), {
      wrapper: createWrapper(),
    });
    expect(result.current.teamId).toBe('team-uuid-1');
    expect(result.current.isResolving).toBe(false);
  });

  it('returns undefined teamId when slug does not match any team', () => {
    const { result } = renderHook(() => useResolveTeamSlug('no-such-team'), {
      wrapper: createWrapper(),
    });
    expect(result.current.teamId).toBeUndefined();
  });

  it('shows isResolving=true while teams are loading for a slug', () => {
    (useTeamsQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    const { result } = renderHook(() => useResolveTeamSlug('alpha-bowling'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isResolving).toBe(true);
    expect(result.current.teamId).toBeUndefined();
  });

  it('enables team query when param is a slug, not a UUID', () => {
    const { result } = renderHook(() => useResolveTeamSlug('alpha-bowling'), {
      wrapper: createWrapper(),
    });
    expect(useTeamsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true, includeHidden: true })
    );
    expect(result.current.teamId).toBeDefined();
  });
});

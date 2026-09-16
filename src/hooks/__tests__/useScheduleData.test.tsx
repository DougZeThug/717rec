import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFetchScheduleMatches } = vi.hoisted(() => ({
  mockFetchScheduleMatches: vi.fn(),
}));

vi.mock('@/services/matches/MatchReadService', () => ({
  fetchScheduleMatches: mockFetchScheduleMatches,
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
}));

import { useScheduleData } from '../useScheduleData';

const match = (overrides: Record<string, unknown>) => ({
  team1_id: 't1',
  team2_id: 't2',
  season_id: 's1',
  round_number: 1,
  team1: { id: 't1', name: 'Alpha' },
  team2: { id: 't2', name: 'Bravo' },
  ...overrides,
});

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const renderScheduleData = () => renderHook(() => useScheduleData(), { wrapper: createWrapper() });

describe('useScheduleData ordering with unscheduled matches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // A match with no date is not scheduled yet, so it belongs at the end of the
  // upcoming list - not wherever its row happened to be created.
  it('puts an undated upcoming match last, not at its creation time', async () => {
    mockFetchScheduleMatches.mockResolvedValue([
      match({
        id: 'undated',
        date: null,
        created_at: '2026-01-01T00:00:00.000Z',
        iscompleted: false,
      }),
      match({
        id: 'dated',
        date: '2026-12-01T00:00:00.000Z',
        created_at: '2026-01-02T00:00:00.000Z',
        iscompleted: false,
      }),
    ]);

    const { result } = renderScheduleData();

    await waitFor(() => expect(result.current.upcomingMatches).toHaveLength(2));

    expect(result.current.upcomingMatches.map((m) => m.id)).toEqual(['dated', 'undated']);
    expect(result.current.upcomingMatches[1].date).toBeUndefined();
  });

  it('puts an undated completed match last too', async () => {
    mockFetchScheduleMatches.mockResolvedValue([
      match({
        id: 'old',
        date: '2026-01-01T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
        iscompleted: true,
      }),
      match({
        id: 'recent',
        date: '2026-12-01T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
        iscompleted: true,
      }),
      match({
        id: 'undated',
        date: null,
        created_at: '2026-06-01T00:00:00.000Z',
        iscompleted: true,
      }),
    ]);

    const { result } = renderScheduleData();

    await waitFor(() => expect(result.current.completedMatches).toHaveLength(3));

    expect(result.current.completedMatches.map((m) => m.id)).toEqual(['recent', 'old', 'undated']);
  });

  it('returns empty lists when the season has no matches at all', async () => {
    mockFetchScheduleMatches.mockResolvedValue([]);

    const { result } = renderScheduleData();

    await waitFor(() => expect(result.current.matchesLoading).toBe(false));

    expect(result.current.matchesData).toEqual([]);
    expect(result.current.upcomingMatches).toEqual([]);
    expect(result.current.completedMatches).toEqual([]);
  });

  // A match can arrive mid-write with one side not joined yet. Showing a row
  // with a blank opponent is worse than leaving it out until it is whole.
  it('drops a match that is missing one side of the fixture', async () => {
    mockFetchScheduleMatches.mockResolvedValue([
      match({ id: 'whole', date: '2026-12-01T00:00:00.000Z', iscompleted: false }),
      match({
        id: 'half',
        date: '2026-12-02T00:00:00.000Z',
        iscompleted: false,
        team2: null,
      }),
    ]);

    const { result } = renderScheduleData();

    await waitFor(() => expect(result.current.matchesLoading).toBe(false));

    expect(result.current.upcomingMatches.map((m) => m.id)).toEqual(['whole']);
  });

  // Two undated matches gave Infinity - Infinity, which is NaN. A comparator
  // must return a number, so keep their order instead.
  it('keeps the order of two undated upcoming matches', async () => {
    mockFetchScheduleMatches.mockResolvedValue([
      match({ id: 'first', date: null, created_at: '2026-01-01T00:00:00.000Z' }),
      match({ id: 'second', date: null, created_at: '2026-02-01T00:00:00.000Z' }),
    ]);

    const { result } = renderScheduleData();

    await waitFor(() => expect(result.current.upcomingMatches).toHaveLength(2));

    expect(result.current.upcomingMatches.map((m) => m.id)).toEqual(['first', 'second']);
  });
});

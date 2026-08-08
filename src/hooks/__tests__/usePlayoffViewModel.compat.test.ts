import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlayoffData } from '../usePlayoffViewModel.compat';

vi.mock('@/hooks/playoffs/usePlayoffViewModel', () => ({
  usePlayoffViewModel: () => ({}),
}));
vi.mock('@/hooks/teams', () => ({
  useTeamsArray: () => ({ teams: [], isLoading: false }),
}));
vi.mock('@/hooks/useDivisions', () => ({
  useDivisions: () => ({
    divisions: [{ name: 'Intermediate', display_division: 'Intermediate' }],
    isLoading: false,
  }),
}));
vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchBracketsOverview: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({ bracketLog: vi.fn() }));

import { fetchBracketsOverview } from '@/services/brackets/BracketReadService';

const makeRow = (id: string, state: string) => ({
  id,
  title: `Bracket ${id}`,
  format: 'Double Elimination',
  state,
  division_id: 'div-1',
  season_id: 'season-1',
  challonge_tournament_id: null,
  uses_brackets_manager: true,
  created_at: '2026-08-01T00:00:00Z',
  divisions: { name: 'Intermediate', display_division: 'Intermediate' },
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePlayoffData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Regression: completed brackets used to be filtered out for the active
  // season, so a bracket vanished from the Playoffs page the moment its last
  // match was scored and the division card fell back to "No brackets yet".
  it('keeps completed brackets alongside in-progress ones', async () => {
    (fetchBracketsOverview as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeRow('done', 'completed'),
      makeRow('live', 'underway'),
    ]);

    const { result } = renderHook(() => usePlayoffData(false, 'season-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.brackets).toHaveLength(2));

    expect(result.current.brackets.map((b) => [b.id, b.state])).toEqual([
      ['done', 'completed'],
      ['live', 'in_progress'],
    ]);
    expect(result.current.bracketsByDivision.Intermediate.map((b) => b.id)).toEqual([
      'done',
      'live',
    ]);
  });
});

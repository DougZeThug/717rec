import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PowerWeightState } from '@/services/admin/PowerWeightSandboxService';

import { usePowerWeightPreview } from '../usePowerWeightSandbox';

const mockTeams = vi.fn();
const mockFetchCurrent = vi.fn();
const mockFetchAllSeasons = vi.fn();
const mockFetchCareerData = vi.fn();
const mockBuildSeason = vi.fn();
const mockBuildCareer = vi.fn();

vi.mock('@/hooks/teams/useTeamsQuery', () => ({
  useTeamsQuery: () => mockTeams(),
}));
vi.mock('@/services/admin/PowerWeightSandboxService', () => ({
  PowerWeightSandboxService: {
    fetchCurrentSeasonComponents: () => mockFetchCurrent(),
    fetchAllSeasonsComponents: () => mockFetchAllSeasons(),
  },
  toPowerScoreWeights: (row: { win_weight: number; sos_weight: number; game_weight: number }) => ({
    win: row.win_weight,
    sos: row.sos_weight,
    game: row.game_weight,
  }),
}));
vi.mock('@/services/career/CareerService', () => ({
  fetchAllTeamsCareerData: (ids: string[]) => mockFetchCareerData(ids),
}));
vi.mock('../buildSeasonWeightPreview', () => ({
  buildSeasonWeightPreview: () => mockBuildSeason(),
}));
vi.mock('../buildCareerWeightPreview', () => ({
  buildCareerWeightPreview: () => mockBuildCareer(),
}));

const state: PowerWeightState = {
  controlsApplied: true,
  current: {
    id: 2,
    win_weight: 40,
    sos_weight: 45,
    game_weight: 15,
    applied_at: '2026-08-20T12:00:00Z',
    note: null,
  },
  previous: null,
};
const candidate = { win: 50, sos: 35, game: 15 };

const renderPreview = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(() => usePowerWeightPreview(candidate, state), { wrapper });
};

describe('usePowerWeightPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeams.mockReturnValue({ data: [{ id: 'a', power_score: 80, wins: 3, losses: 1 }] });
    mockFetchCareerData.mockResolvedValue({});
    mockFetchCurrent.mockResolvedValue([]);
    mockFetchAllSeasons.mockResolvedValue([]);
    mockBuildSeason.mockReturnValue([]);
    mockBuildCareer.mockResolvedValue([]);
  });

  it('reports the data read as loading, then hands back the built preview', async () => {
    const { result } = renderPreview();

    expect(result.current.dataLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual({ season: [], career: [] }));
    expect(result.current.dataLoading).toBe(false);
    expect(result.current.dataError).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('flags a failed data read, leaves the preview idle, and retryData asks the data again', async () => {
    mockFetchAllSeasons.mockRejectedValue(new Error('history read failed'));
    const { result } = renderPreview();

    await waitFor(() => expect(result.current.dataError).toBe(true));
    expect(result.current.dataLoading).toBe(false);
    // The preview never ran, so it is not the one reporting the failure
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockFetchCurrent).toHaveBeenCalledTimes(1);

    // A fixed read clears the message once the retry lands
    mockFetchAllSeasons.mockResolvedValue([]);
    await act(async () => {
      await result.current.retryData();
    });
    expect(mockFetchCurrent).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.dataError).toBe(false));
    await waitFor(() => expect(result.current.data).toEqual({ season: [], career: [] }));
  });
});

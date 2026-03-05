import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/hooks/useToast';
import { PairingResult } from '@/types/autoSchedule';
import { fetchSeasonHistoryForTeams } from '@/utils/autoSchedule/matchHistoryService';
import { mockDate, mockPairings, mockTimeBlockTeams } from '@/utils/test/autoSchedule/mockData';

import { usePairingGenerator } from '../scheduling/usePairingGenerator';

// Mock useTeamsMap (uses react-query internally)
vi.mock('../teams', () => ({
  useTeamsMap: () => ({
    teams: {},
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock match history service
vi.mock('@/utils/autoSchedule/matchHistoryService', () => ({
  fetchSeasonHistoryForTeams: vi.fn().mockResolvedValue([]),
}));

// Mock the pairing schedulers - must use vi.hoisted so the variable is defined when vi.mock factory runs
const mockScheduleStandardPairings = vi.hoisted(() => vi.fn());
vi.mock('../scheduling/utils/standardPairing', () => ({
  scheduleStandardPairings: (...args: any[]) => mockScheduleStandardPairings(...args),
}));

vi.mock('../scheduling/utils/dualBlockScheduler', () => ({
  scheduleDualBlockPairings: vi.fn().mockResolvedValue({
    pairings: {},
    unmatchedTeamIds: [],
    diagnostics: { relaxationApplied: 0, repairAttempted: false, constraintsRelaxed: [] },
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
}));

vi.mock('@/utils/dateNormalization', () => ({
  normalizeDate: vi.fn((d: Date) => d.toISOString()),
}));

const mockUseToast = vi.mocked(useToast);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('usePairingGenerator', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    const mockToast = {
      toast: vi.fn(),
      dismiss: vi.fn(),
      toasts: [],
    } as unknown as ReturnType<typeof useToast>;
    mockUseToast.mockReturnValue(mockToast);

    // Re-setup mocks cleared by vi.resetAllMocks()
    vi.mocked(fetchSeasonHistoryForTeams).mockResolvedValue([]);

    // Default: return mock pairings
    mockScheduleStandardPairings.mockResolvedValue({
      pairings: mockPairings,
      unmatchedTeamIds: [],
    });
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => usePairingGenerator(), { wrapper: createWrapper() });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.generatedPairings).toEqual({});
    expect(Object.keys(result.current)).toContain('generateMatchPairings');
  });

  it('should generate pairings for valid time blocks', async () => {
    const { result } = renderHook(() => usePairingGenerator(), { wrapper: createWrapper() });

    let pairings: PairingResult | null = null;
    await act(async () => {
      pairings = await result.current.generateMatchPairings(mockDate, mockTimeBlockTeams);
    });

    expect(result.current.isGenerating).toBe(false);

    // Should have pairings result
    expect(pairings).not.toBeNull();
    expect(pairings).toHaveProperty('pairings');
    expect(pairings).toHaveProperty('unmatchedTeamIds');

    if (pairings) {
      // Should have pairings for each time block
      expect(pairings.pairings).toHaveProperty('6:30');
      expect(pairings.pairings).toHaveProperty('7:30');
      expect(pairings.pairings).toHaveProperty('8:30');

      // Time blocks with teams should have pairings
      expect(pairings.pairings['6:30']).toHaveLength(1);
      expect(pairings.pairings['7:30']).toHaveLength(1);
      expect(pairings.pairings['8:30']).toHaveLength(0);

      // Pairings should have the expected properties
      const firstPairing = pairings.pairings['6:30'][0];
      expect(firstPairing).toHaveProperty('team1');
      expect(firstPairing).toHaveProperty('team2');
      expect(firstPairing).toHaveProperty('compatibilityScore');
      expect(firstPairing).toHaveProperty('hasPlayedBefore');
    }
  });

  it('should handle odd number of teams in a block', async () => {
    const oddPairings = {
      '6:30': [mockPairings['6:30'][0]], // 1 pair from 3 teams
      '7:30': [mockPairings['7:30'][0]], // 1 pair
      '8:30': [],
    };
    mockScheduleStandardPairings.mockResolvedValueOnce({
      pairings: oddPairings,
      unmatchedTeamIds: ['team3'],
    });

    const oddBlocksData = {
      ...mockTimeBlockTeams,
      '6:30': [...mockTimeBlockTeams['6:30'], mockTimeBlockTeams['7:30'][0]], // 3 teams (odd)
    };

    const { result } = renderHook(() => usePairingGenerator(), { wrapper: createWrapper() });

    let pairings: PairingResult | null = null;
    await act(async () => {
      pairings = await result.current.generateMatchPairings(mockDate, oddBlocksData);
    });

    // Should still generate some pairings
    expect(pairings).not.toBeNull();
    if (pairings) {
      expect(pairings.pairings['6:30'].length).toBe(1); // Can only pair 2 of the 3 teams
      expect(pairings.pairings['7:30'].length).toBe(1); // Still pairs the 2 teams in this block
    }
  });

  it('should handle errors during pairing generation', async () => {
    mockScheduleStandardPairings.mockRejectedValueOnce(new Error('Calculation error'));

    const { result } = renderHook(() => usePairingGenerator(), { wrapper: createWrapper() });
    const mockToast = mockUseToast().toast;

    let pairings: PairingResult | null = null;
    await act(async () => {
      pairings = await result.current.generateMatchPairings(mockDate, mockTimeBlockTeams);
    });

    // Should show error toast
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to generate match pairings. Please try again.',
      variant: 'destructive',
    });

    // Should return null on error
    expect(pairings).toBeNull();
  });
});

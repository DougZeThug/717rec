import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

import { useTeamOperations } from '../useTeamOperations';

const mockLoadAutoScheduleState = vi.fn();
const mockSaveAutoScheduleState = vi.fn();
const mockValidateScheduleDate = vi.fn();
const mockNormalizeScheduleDate = vi.fn();
const mockGetAllBackToBackTeams = vi.fn();
const mockGetTeamsByBackToBackPair = vi.fn();
const mockValidateBackToBackPairAssignments = vi.fn();

vi.mock('../storage', () => ({
  loadAutoScheduleState: () => mockLoadAutoScheduleState(),
  saveAutoScheduleState: (state: unknown) => mockSaveAutoScheduleState(state),
}));

vi.mock('@/utils/autoSchedule/dateUtils', () => ({
  validateScheduleDate: (...args: unknown[]) => mockValidateScheduleDate(...args),
  normalizeScheduleDate: (...args: unknown[]) => mockNormalizeScheduleDate(...args),
}));

vi.mock('@/utils/autoSchedule/teamLoaderUtils', () => ({
  getAllBackToBackTeams: (...args: unknown[]) => mockGetAllBackToBackTeams(...args),
  getTeamsByBackToBackPair: (...args: unknown[]) => mockGetTeamsByBackToBackPair(...args),
}));

vi.mock('@/utils/autoSchedule/edgeCaseUtils', () => ({
  validateBackToBackPairAssignments: (...args: unknown[]) =>
    mockValidateBackToBackPairAssignments(...args),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

const buildTeam = (id: string, power_score?: number): Team => ({
  id,
  name: `Team ${id}`,
  power_score,
});

describe('useTeamOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();

    mockLoadAutoScheduleState.mockReturnValue(null);
    mockValidateScheduleDate.mockReturnValue(true);
    mockNormalizeScheduleDate.mockReturnValue('2026-04-20');
    mockValidateBackToBackPairAssignments.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
  });

  it('initializes with empty fallback when no persisted data exists', () => {
    mockLoadAutoScheduleState.mockReturnValue(null);

    const { result } = renderHook(() => useTeamOperations());

    expect(result.current.timeBlockTeams).toEqual({});
    expect(result.current.originalTimeBlockTeams).toEqual({});
    expect(result.current.teamBlockMap).toEqual({});
  });

  it('hydrates persisted maps on initialization', () => {
    const persistedMap = {
      Early: [buildTeam('1'), buildTeam('2')],
      Late: [buildTeam('2'), buildTeam('3')],
    };

    mockLoadAutoScheduleState.mockReturnValue({
      timeBlockTeams: persistedMap,
      originalTimeBlockTeams: persistedMap,
    });

    const { result } = renderHook(() => useTeamOperations());

    expect(result.current.timeBlockTeams).toEqual(persistedMap);
    expect(result.current.originalTimeBlockTeams).toEqual(persistedMap);
    expect(result.current.teamBlockMap).toEqual({
      '1': ['Early'],
      '2': ['Early', 'Late'],
      '3': ['Late'],
    });
  });

  it('handleLoadTeams returns early for null and invalid dates', async () => {
    const { result } = renderHook(() => useTeamOperations());

    await expect(result.current.handleLoadTeams(null)).resolves.toEqual({});
    expect(mockGetAllBackToBackTeams).not.toHaveBeenCalled();

    mockValidateScheduleDate.mockReturnValue(false);
    await expect(result.current.handleLoadTeams(new Date('2026-04-20T00:00:00.000Z'))).resolves.toEqual({});
    expect(mockGetAllBackToBackTeams).not.toHaveBeenCalled();
  });

  it('handleLoadTeams populates state successfully and manages dualBlockMode toggles', async () => {
    const loadedTeams = {
      Early: [buildTeam('1'), buildTeam('2')],
      Late: [buildTeam('3'), buildTeam('4')],
    };
    mockGetAllBackToBackTeams.mockResolvedValue(loadedTeams);

    const { result } = renderHook(() => useTeamOperations());

    await act(async () => {
      const response = await result.current.handleLoadTeams(new Date('2026-04-20T00:00:00.000Z'), true, {
        primaryBlock: 'Early',
        secondaryBlock: 'Late',
      });
      expect(response).toEqual(loadedTeams);
    });

    expect(result.current.timeBlockTeams).toEqual(loadedTeams);
    expect(result.current.originalTimeBlockTeams).toEqual(loadedTeams);
    expect(result.current.pairedTimeBlockTeams).toEqual({
      'Early-Late': {
        primaryBlock: 'Early',
        secondaryBlock: 'Late',
        primaryTeams: loadedTeams.Early,
        secondaryTeams: loadedTeams.Late,
      },
    });

    await act(async () => {
      await result.current.handleLoadTeams(new Date('2026-04-20T00:00:00.000Z'), false);
    });

    expect(result.current.pairedTimeBlockTeams).toEqual({});
  });

  it('handleLoadTeams continues when validation has warnings/errors and loader failures reset state', async () => {
    const loadedTeams = {
      Early: [buildTeam('1')],
      Late: [buildTeam('2')],
    };
    mockGetAllBackToBackTeams.mockResolvedValueOnce(loadedTeams);
    mockValidateBackToBackPairAssignments.mockReturnValueOnce({
      isValid: false,
      errors: ['duplicate assignment'],
      warnings: ['odd team count'],
    });

    const { result } = renderHook(() => useTeamOperations());

    await act(async () => {
      const response = await result.current.handleLoadTeams(new Date('2026-04-20T00:00:00.000Z'));
      expect(response).toEqual(loadedTeams);
    });

    expect(result.current.timeBlockTeams).toEqual(loadedTeams);

    mockGetAllBackToBackTeams.mockRejectedValueOnce(new Error('load failed'));

    await act(async () => {
      const response = await result.current.handleLoadTeams(new Date('2026-04-21T00:00:00.000Z'));
      expect(response).toEqual({});
    });

    expect(result.current.timeBlockTeams).toEqual({});
    expect(result.current.originalTimeBlockTeams).toEqual({});
    expect(result.current.pairedTimeBlockTeams).toEqual({});
  });

  it('loadTeamsForPair handles invalid dates, success, and fetch failures', async () => {
    const { result } = renderHook(() => useTeamOperations());

    mockValidateScheduleDate.mockReturnValueOnce(false);
    await expect(result.current.loadTeamsForPair(new Date('2026-04-20T00:00:00.000Z'), 'Early')).resolves.toEqual([]);

    const pairTeams = [buildTeam('10'), buildTeam('11')];
    mockGetTeamsByBackToBackPair.mockResolvedValueOnce(pairTeams);

    await expect(result.current.loadTeamsForPair(new Date('2026-04-20T00:00:00.000Z'), 'Early')).resolves.toEqual(pairTeams);

    mockGetTeamsByBackToBackPair.mockRejectedValueOnce(new Error('fetch failed'));
    await expect(result.current.loadTeamsForPair(new Date('2026-04-20T00:00:00.000Z'), 'Early')).resolves.toEqual([]);
  });

  it('balanceBackToBackTeams keeps even counts and removes unmatched IDs per strategy', async () => {
    const evenTeams = [buildTeam('1', 100), buildTeam('2', 90)];
    const oddTeams = [buildTeam('3', 80), buildTeam('4', 70), buildTeam('5', 60)];

    const { result } = renderHook(() => useTeamOperations());

    act(() => {
      result.current.setTimeBlockTeams({
        EvenPair: evenTeams,
        OddPair: oddTeams,
      });
    });

    const lowestRank = result.current.balanceBackToBackTeams({ unmatchedTeamStrategy: 'lowest-rank' });
    expect(lowestRank.balancedTeams.EvenPair).toEqual(evenTeams);
    expect(lowestRank.unmatchedTeamIds).toEqual(['5']);

    const highestRank = result.current.balanceBackToBackTeams({ unmatchedTeamStrategy: 'highest-rank' });
    expect(highestRank.unmatchedTeamIds).toEqual(['3']);

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const randomResult = result.current.balanceBackToBackTeams({ unmatchedTeamStrategy: 'random' });
    expect(randomResult.unmatchedTeamIds).toEqual(['4']);
    randomSpy.mockRestore();
  });

  it('computes teamBlockMap and getTeamCountStatus for single and multi-block teams', () => {
    const { result } = renderHook(() => useTeamOperations());

    act(() => {
      result.current.setTimeBlockTeams({
        Early: [buildTeam('1'), buildTeam('2')],
        Mid: [buildTeam('2'), buildTeam('3'), buildTeam('4')],
        Late: [buildTeam('1')],
      });
    });

    expect(result.current.teamBlockMap).toEqual({
      '1': ['Early', 'Late'],
      '2': ['Early', 'Mid'],
      '3': ['Mid'],
      '4': ['Mid'],
    });

    expect(result.current.getTeamCountStatus()).toEqual({ total: 6, odd: 2 });
  });

  it('persists non-empty state changes and skips fully empty baseline state', async () => {
    const { result } = renderHook(() => useTeamOperations());

    expect(mockSaveAutoScheduleState).not.toHaveBeenCalled();

    act(() => {
      result.current.setTimeBlockTeams({ Early: [buildTeam('99')] });
    });

    await waitFor(() => {
      expect(mockSaveAutoScheduleState).toHaveBeenCalledWith(
        expect.objectContaining({
          timeBlockTeams: { Early: [buildTeam('99')] },
          teamBlockMap: { '99': ['Early'] },
        })
      );
    });
  });
});

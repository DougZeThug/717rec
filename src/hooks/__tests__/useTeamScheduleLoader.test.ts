import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TimeBlockTeamsMap } from '@/types/autoSchedule';
import * as teamLoaderUtils from '@/utils/autoSchedule/teamLoaderUtils';
import { mockDate, mockTeams } from '@/utils/test/autoSchedule/mockData';

import { useTeamScheduleLoader } from '../useTeamScheduleLoader';

// Mock dependencies
vi.mock('@/utils/autoSchedule/teamLoaderUtils');

// Mock logger (used by hook)
vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
}));

vi.mock('@/utils/dateNormalization', () => ({
  normalizeDate: vi.fn((d: Date) => d.toISOString()),
}));

// Create properly typed mocks
const mockTeamLoaderUtils = vi.mocked(teamLoaderUtils);

describe('useTeamScheduleLoader', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default: mock getAllBackToBackTeams to return standard time blocks
    mockTeamLoaderUtils.getAllBackToBackTeams.mockResolvedValue({
      '6:30': [mockTeams[0], mockTeams[1]],
      '7:30': [mockTeams[2], mockTeams[3]],
      '8:30': [],
    });
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useTeamScheduleLoader());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.timeBlockTeams).toEqual({});
    expect(Object.keys(result.current)).toContain('loadTeamsForDate');
    expect(Object.keys(result.current)).toContain('getTeamCountStatus');
  });

  it('should load teams for each time block', async () => {
    const { result } = renderHook(() => useTeamScheduleLoader());

    let teamsData: TimeBlockTeamsMap | null = null;
    await act(async () => {
      teamsData = await result.current.loadTeamsForDate(mockDate);
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockTeamLoaderUtils.getAllBackToBackTeams).toHaveBeenCalledTimes(1);

    // Should have teams loaded for each time block
    expect(teamsData).toHaveProperty('6:30');
    expect(teamsData).toHaveProperty('7:30');
    expect(teamsData).toHaveProperty('8:30');

    expect(teamsData?.['6:30']).toHaveLength(2);
    expect(teamsData?.['7:30']).toHaveLength(2);
    expect(teamsData?.['8:30']).toHaveLength(0);
  });

  it('should handle errors when loading teams', async () => {
    // Mock error response
    mockTeamLoaderUtils.getAllBackToBackTeams.mockRejectedValueOnce(new Error('API error'));

    const { result } = renderHook(() => useTeamScheduleLoader());

    let teamsData: TimeBlockTeamsMap | null = null;
    await act(async () => {
      teamsData = await result.current.loadTeamsForDate(mockDate);
    });

    // Should return empty object on error
    expect(teamsData).toEqual({});
  });

  it('should calculate team count status correctly', async () => {
    const { result } = renderHook(() => useTeamScheduleLoader());

    // Initially should be zero
    expect(result.current.getTeamCountStatus()).toEqual({ total: 0, odd: 0 });

    // Load teams that include blocks with even and odd numbers
    await act(async () => {
      mockTeamLoaderUtils.getAllBackToBackTeams.mockResolvedValueOnce({
        '6:30': [mockTeams[0], mockTeams[1]], // Even (2)
        '7:30': [mockTeams[2], mockTeams[3]], // Even (2)
        '8:30': [mockTeams[0]], // Odd (1)
      });

      await result.current.loadTeamsForDate(mockDate);
    });

    // Should calculate correctly
    const status = result.current.getTeamCountStatus();
    expect(status.total).toBe(5); // 2 + 2 + 1
    expect(status.odd).toBe(1); // One block has odd number
  });
});

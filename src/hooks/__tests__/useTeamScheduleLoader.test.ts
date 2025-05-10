
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { useTeamScheduleLoader } from '../useTeamScheduleLoader';
import { mockTeams, mockDate } from '@/utils/test/autoSchedule/mockData';
import * as teamLoaderUtils from '@/utils/autoSchedule/teamLoaderUtils';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/utils/autoSchedule/teamLoaderUtils');
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn()
}));

describe('useTeamScheduleLoader', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock toast
    vi.mocked(useToast).mockReturnValue({
      toast: vi.fn(),
    } as any);
    
    // Mock getTeamsByTimeBlock
    vi.mocked(teamLoaderUtils.getTeamsByTimeBlock).mockImplementation(
      (date, timeBlock) => {
        if (timeBlock === '6:30') return Promise.resolve([mockTeams[0], mockTeams[1]]);
        if (timeBlock === '7:30') return Promise.resolve([mockTeams[2], mockTeams[3]]);
        return Promise.resolve([]);
      }
    );
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
    
    let teamsData;
    await act(async () => {
      teamsData = await result.current.loadTeamsForDate(mockDate);
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(teamLoaderUtils.getTeamsByTimeBlock).toHaveBeenCalledTimes(3); // For 3 time blocks
    
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
    vi.mocked(teamLoaderUtils.getTeamsByTimeBlock).mockRejectedValueOnce(new Error('API error'));
    
    const { result } = renderHook(() => useTeamScheduleLoader());
    const toast = vi.mocked(useToast()).toast;
    
    let teamsData;
    await act(async () => {
      teamsData = await result.current.loadTeamsForDate(mockDate);
    });
    
    // Should show error toast
    expect(toast).toHaveBeenCalledWith({
      title: "Error",
      description: "Failed to load teams. Please try again.",
      variant: "destructive"
    });
    
    // Should return null on error
    expect(teamsData).toBeNull();
  });

  it('should calculate team count status correctly', async () => {
    const { result } = renderHook(() => useTeamScheduleLoader());
    
    // Initially should be zero
    expect(result.current.getTeamCountStatus()).toEqual({ total: 0, odd: 0 });
    
    // Load teams that include blocks with even and odd numbers
    await act(async () => {
      // Mock implementation for this test
      vi.mocked(teamLoaderUtils.getTeamsByTimeBlock).mockImplementation(
        (date, timeBlock) => {
          if (timeBlock === '6:30') return Promise.resolve([mockTeams[0], mockTeams[1]]); // Even (2)
          if (timeBlock === '7:30') return Promise.resolve([mockTeams[2], mockTeams[3]]); // Even (2)
          if (timeBlock === '8:30') return Promise.resolve([mockTeams[0]]); // Odd (1)
          return Promise.resolve([]);
        }
      );
      
      await result.current.loadTeamsForDate(mockDate);
    });
    
    // Should calculate correctly
    const status = result.current.getTeamCountStatus();
    expect(status.total).toBe(5); // 2 + 2 + 1
    expect(status.odd).toBe(1); // One block has odd number
  });
});

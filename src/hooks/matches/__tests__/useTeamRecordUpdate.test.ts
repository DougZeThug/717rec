import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeamRecordUpdate } from '../useTeamRecordUpdate';

// Mock dependencies
const mockUpdateTeamRecords = vi.fn();
const mockToast = vi.fn();
const mockValidateTeamStats = vi.fn();

vi.mock('@/hooks/useTeamRecords', () => ({
  useTeamRecords: () => ({
    updateTeamRecords: mockUpdateTeamRecords,
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock('../validation/useTeamStatsValidation', () => ({
  useTeamStatsValidation: () => ({
    validateTeamStats: mockValidateTeamStats,
  }),
}));

vi.mock('@/utils/logger', () => ({
  warnLog: vi.fn(),
}));

describe('useTeamRecordUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateTeamStats.mockReturnValue({ isValid: true });
    mockUpdateTeamRecords.mockResolvedValue(true);
  });

  it('returns updateTeamStats function', () => {
    const { result } = renderHook(() => useTeamRecordUpdate());
    expect(result.current.updateTeamStats).toBeDefined();
    expect(typeof result.current.updateTeamStats).toBe('function');
  });

  it('successfully updates team stats with valid data', async () => {
    const { result } = renderHook(() => useTeamRecordUpdate());

    const success = await result.current.updateTeamStats('winner-id', 'loser-id', [], 3, 1);

    expect(success).toBe(true);
    expect(mockUpdateTeamRecords).toHaveBeenCalledWith('winner-id', 'loser-id', [], 3, 1);
  });

  it('returns false when validation fails - missing winner', async () => {
    mockValidateTeamStats.mockReturnValue({
      isValid: false,
      errorMessage: 'Missing winner or loser ID for team stats update',
    });

    const { result } = renderHook(() => useTeamRecordUpdate());

    const success = await result.current.updateTeamStats('', 'loser-id', [], 3, 1);

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Validation Error',
        variant: 'destructive',
      })
    );
    expect(mockUpdateTeamRecords).not.toHaveBeenCalled();
  });

  it('returns false when validation fails - negative game wins', async () => {
    mockValidateTeamStats.mockReturnValue({
      isValid: false,
      errorMessage: 'Game wins cannot be negative',
    });

    const { result } = renderHook(() => useTeamRecordUpdate());

    const success = await result.current.updateTeamStats('winner-id', 'loser-id', [], -1, 1);

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Validation Error',
      })
    );
  });

  it('handles partial update failure gracefully', async () => {
    mockUpdateTeamRecords.mockResolvedValue(false);

    const { result } = renderHook(() => useTeamRecordUpdate());

    const success = await result.current.updateTeamStats('winner-id', 'loser-id', [], 3, 1);

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Partial Update',
        variant: 'default',
      })
    );
  });

  it('calls updateTeamRecords with correct parameters', async () => {
    const mockTeams = [{ id: 'team-1' }, { id: 'team-2' }];

    const { result } = renderHook(() => useTeamRecordUpdate());

    await result.current.updateTeamStats('winner-id', 'loser-id', mockTeams, 5, 2);

    expect(mockUpdateTeamRecords).toHaveBeenCalledWith('winner-id', 'loser-id', mockTeams, 5, 2);
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTeamSelectionState } from '../useTeamSelectionState';

describe('useTeamSelectionState', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct state', () => {
    const { result } = renderHook(() => 
      useTeamSelectionState(16, mockOnChange, 10, 2)
    );

    expect(result.current.count).toBe(0);
    expect(result.current.canSelectMore).toBe(true);
    expect(result.current.isAtMaximum).toBe(false);
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.isValid).toBe(false);
  });

  it('should handle team toggle correctly', () => {
    const { result } = renderHook(() => 
      useTeamSelectionState(16, mockOnChange, 10, 2)
    );

    act(() => {
      result.current.handleTeamToggle('team-1');
    });

    expect(result.current.count).toBe(1);
    expect(mockOnChange).toHaveBeenCalledWith(['team-1']);
  });

  it('should prevent selection beyond maximum', () => {
    const { result } = renderHook(() => 
      useTeamSelectionState(2, mockOnChange, 10, 2)
    );

    // Add first team
    act(() => {
      result.current.handleTeamToggle('team-1');
    });

    // Add second team
    act(() => {
      result.current.handleTeamToggle('team-2');
    });

    expect(result.current.count).toBe(2);
    expect(result.current.isAtMaximum).toBe(true);

    // Try to add third team - should be ignored
    act(() => {
      result.current.handleTeamToggle('team-3');
    });

    expect(result.current.count).toBe(2); // Should still be 2
  });

  it('should clear selection correctly', () => {
    const { result } = renderHook(() => 
      useTeamSelectionState(16, mockOnChange, 10, 2)
    );

    // Add a team first
    act(() => {
      result.current.handleTeamToggle('team-1');
    });

    expect(result.current.count).toBe(1);

    // Clear selection
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.count).toBe(0);
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });
});

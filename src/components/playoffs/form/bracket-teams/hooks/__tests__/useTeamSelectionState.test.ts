
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTeamSelectionState } from '../useTeamSelectionState';

describe('useTeamSelectionState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct state', () => {
    const { result } = renderHook(() => 
      useTeamSelectionState(16, new Set(), 10, 2)
    );

    expect(result.current.count).toBe(0);
    expect(result.current.canSelectMore).toBe(true);
    expect(result.current.isAtMaximum).toBe(false);
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.isValid).toBe(false);
  });

  it('should handle team toggle correctly', () => {
    const { result } = renderHook(() => 
      useTeamSelectionState(16, new Set(), 10, 2)
    );

    act(() => {
      result.current.handleTeamToggle('team-1');
    });

    expect(result.current.count).toBe(1);
    expect(result.current.selected.has('team-1')).toBe(true);
    expect(result.current.selectedArray).toEqual(['team-1']);
  });

  it('should prevent selection beyond maximum', () => {
    const { result } = renderHook(() => 
      useTeamSelectionState(2, new Set(), 10, 2)
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
    expect(result.current.selected.has('team-3')).toBe(false);
  });

  it('should clear selection correctly', () => {
    const { result } = renderHook(() => 
      useTeamSelectionState(16, new Set(['team-1']), 10, 2)
    );

    expect(result.current.count).toBe(1);

    // Clear selection
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.count).toBe(0);
    expect(result.current.selected.size).toBe(0);
    expect(result.current.selectedArray).toEqual([]);
  });

  it('should toggle teams on and off correctly', () => {
    const { result } = renderHook(() => 
      useTeamSelectionState(16, new Set(), 10, 2)
    );

    // Add team
    act(() => {
      result.current.handleTeamToggle('team-1');
    });

    expect(result.current.count).toBe(1);
    expect(result.current.selected.has('team-1')).toBe(true);

    // Remove same team
    act(() => {
      result.current.handleTeamToggle('team-1');
    });

    expect(result.current.count).toBe(0);
    expect(result.current.selected.has('team-1')).toBe(false);
  });

  it('should validate selection correctly', () => {
    const { result } = renderHook(() => 
      useTeamSelectionState(16, new Set(), 10, 2)
    );

    // Not valid with 0 teams (minimum is 2)
    expect(result.current.isValid).toBe(false);

    // Add first team - still not valid
    act(() => {
      result.current.handleTeamToggle('team-1');
    });

    expect(result.current.isValid).toBe(false);

    // Add second team - now valid
    act(() => {
      result.current.handleTeamToggle('team-2');
    });

    expect(result.current.isValid).toBe(true);
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTeamSelectionState } from '../useTeamSelectionState';

// Mock the useTeamSelection hook
vi.mock('@/hooks/playoffs', () => ({
  useTeamSelection: vi.fn()
}));

import { useTeamSelection } from '@/hooks/playoffs';

describe('useTeamSelectionState', () => {
  const mockUseTeamSelection = useTeamSelection as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct state', () => {
    const mockSelected = new Set(['team-1', 'team-2']);
    const mockSelectedArray = ['team-1', 'team-2'];
    
    mockUseTeamSelection.mockReturnValue({
      selected: mockSelected,
      selectedArray: mockSelectedArray,
      count: 2,
      toggle: vi.fn(),
      setSelected: vi.fn()
    });

    const { result } = renderHook(() => 
      useTeamSelectionState(16, ['team-1', 'team-2'])
    );

    expect(result.current.selected).toBe(mockSelected);
    expect(result.current.selectedArray).toBe(mockSelectedArray);
    expect(result.current.count).toBe(2);
    expect(result.current.canSelectMore).toBe(true);
    expect(result.current.isAtMaximum).toBe(false);
    expect(result.current.hasSelection).toBe(true);
  });

  it('should handle team toggle with max teams validation', () => {
    const mockToggle = vi.fn();
    
    mockUseTeamSelection.mockReturnValue({
      selected: new Set(['team-1']),
      selectedArray: ['team-1'],
      count: 1,
      toggle: mockToggle,
      setSelected: vi.fn()
    });

    const { result } = renderHook(() => 
      useTeamSelectionState(16)
    );

    act(() => {
      result.current.toggle('team-2');
    });

    expect(mockToggle).toHaveBeenCalledWith('team-2', 16);
  });

  it('should handle error in toggle gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockToggle = vi.fn().mockImplementation(() => {
      throw new Error('Toggle failed');
    });
    
    mockUseTeamSelection.mockReturnValue({
      selected: new Set(),
      selectedArray: [],
      count: 0,
      toggle: mockToggle,
      setSelected: vi.fn()
    });

    const { result } = renderHook(() => 
      useTeamSelectionState(16)
    );

    act(() => {
      result.current.toggle('team-1');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'useTeamSelectionState: Error toggling team:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should validate selection when setting teams', () => {
    const mockSetSelected = vi.fn();
    
    mockUseTeamSelection.mockReturnValue({
      selected: new Set(),
      selectedArray: [],
      count: 0,
      toggle: vi.fn(),
      setSelected: mockSetSelected
    });

    const { result } = renderHook(() => 
      useTeamSelectionState(3) // Max 3 teams
    );

    act(() => {
      result.current.setSelected(['team-1', 'team-2', 'team-3', 'team-4', 'team-5']);
    });

    // Should only set first 3 teams
    expect(mockSetSelected).toHaveBeenCalledWith(['team-1', 'team-2', 'team-3']);
  });

  it('should clear selection correctly', () => {
    const mockSetSelected = vi.fn();
    
    mockUseTeamSelection.mockReturnValue({
      selected: new Set(['team-1', 'team-2']),
      selectedArray: ['team-1', 'team-2'],
      count: 2,
      toggle: vi.fn(),
      setSelected: mockSetSelected
    });

    const { result } = renderHook(() => 
      useTeamSelectionState(16)
    );

    act(() => {
      result.current.clearSelection();
    });

    expect(mockSetSelected).toHaveBeenCalledWith([]);
  });

  it('should calculate selection constraints correctly', () => {
    // Test at maximum
    mockUseTeamSelection.mockReturnValue({
      selected: new Set(['team-1', 'team-2', 'team-3']),
      selectedArray: ['team-1', 'team-2', 'team-3'],
      count: 3,
      toggle: vi.fn(),
      setSelected: vi.fn()
    });

    const { result } = renderHook(() => 
      useTeamSelectionState(3) // Max 3 teams
    );

    expect(result.current.canSelectMore).toBe(false);
    expect(result.current.isAtMaximum).toBe(true);
    expect(result.current.hasSelection).toBe(true);
  });

  it('should handle empty selection state', () => {
    mockUseTeamSelection.mockReturnValue({
      selected: new Set(),
      selectedArray: [],
      count: 0,
      toggle: vi.fn(),
      setSelected: vi.fn()
    });

    const { result } = renderHook(() => 
      useTeamSelectionState(16)
    );

    expect(result.current.canSelectMore).toBe(true);
    expect(result.current.isAtMaximum).toBe(false);
    expect(result.current.hasSelection).toBe(false);
  });
});

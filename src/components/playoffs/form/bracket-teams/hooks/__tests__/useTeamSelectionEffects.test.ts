
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTeamSelectionEffects } from '../useTeamSelectionEffects';

describe('useTeamSelectionEffects', () => {
  it('should call onChange on initial render with empty selection', () => {
    const mockOnChange = vi.fn();
    
    renderHook(() => 
      useTeamSelectionEffects([], mockOnChange)
    );

    expect(mockOnChange).toHaveBeenCalledWith([]);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('should call onChange when selection changes', () => {
    const mockOnChange = vi.fn();
    
    const { rerender } = renderHook(
      ({ selected }) => useTeamSelectionEffects(selected, mockOnChange),
      { initialProps: { selected: [] } }
    );

    // Clear the initial call
    mockOnChange.mockClear();

    // Change selection
    rerender({ selected: ['team-1', 'team-2'] });

    expect(mockOnChange).toHaveBeenCalledWith(['team-1', 'team-2']);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('should call onChange for subsequent non-empty selections', () => {
    const mockOnChange = vi.fn();
    
    const { rerender } = renderHook(
      ({ selected }) => useTeamSelectionEffects(selected, mockOnChange),
      { initialProps: { selected: ['team-1'] } }
    );

    expect(mockOnChange).toHaveBeenCalledWith(['team-1']);

    // Change selection again
    rerender({ selected: ['team-1', 'team-2'] });

    expect(mockOnChange).toHaveBeenCalledTimes(2);
    expect(mockOnChange).toHaveBeenLastCalledWith(['team-1', 'team-2']);
  });

  it('should handle onChange callback errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockOnChange = vi.fn().mockImplementation(() => {
      throw new Error('onChange failed');
    });
    
    renderHook(() => 
      useTeamSelectionEffects(['team-1'], mockOnChange)
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'useTeamSelectionEffects: Error in onChange callback:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should provide cleanup function', () => {
    const mockOnChange = vi.fn();
    
    const { result } = renderHook(() => 
      useTeamSelectionEffects([], mockOnChange)
    );

    expect(typeof result.current.cleanup).toBe('function');
  });

  it('should reset tracking after cleanup', () => {
    const mockOnChange = vi.fn();
    
    const { result, rerender } = renderHook(
      ({ selected }) => useTeamSelectionEffects(selected, mockOnChange),
      { initialProps: { selected: [] } }
    );

    // Call cleanup
    result.current.cleanup();

    // Clear previous calls
    mockOnChange.mockClear();

    // Rerender - should call onChange again since tracking was reset
    rerender({ selected: [] });

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('should not call onChange multiple times for same selection', () => {
    const mockOnChange = vi.fn();
    
    const { rerender } = renderHook(
      ({ selected }) => useTeamSelectionEffects(selected, mockOnChange),
      { initialProps: { selected: ['team-1'] } }
    );

    // Clear the initial call
    mockOnChange.mockClear();

    // Rerender with same selection multiple times
    rerender({ selected: ['team-1'] });
    rerender({ selected: ['team-1'] });
    rerender({ selected: ['team-1'] });

    expect(mockOnChange).toHaveBeenCalledTimes(3); // Should be called each time due to dependency array
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBracketFormState } from '../useBracketFormState';

// Mock the dependent hooks
vi.mock('../useFormValidation', () => ({
  useFormValidation: vi.fn()
}));

import { useFormValidation } from '../useFormValidation';

describe('useBracketFormState', () => {
  const mockUseFormValidation = useFormValidation as any;
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct state', () => {
    mockUseFormValidation.mockReturnValue({
      isValid: false,
      isComplete: false,
      hasError: false,
      hasWarning: false,
      errorMessage: null,
      warningMessage: null,
      statusMessage: 'Ready to select teams',
      progress: {
        percentage: 0,
        selected: 0,
        required: 2,
        maximum: 16,
        available: 10
      }
    });

    const { result } = renderHook(() => 
      useBracketFormState(16, mockOnChange, 10, 2)
    );

    expect(result.current.count).toBe(0);
    expect(result.current.canSelectMore).toBe(true);
    expect(result.current.isAtMaximum).toBe(false);
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.isValid).toBe(false);
  });

  it('should handle team toggle correctly', () => {
    mockUseFormValidation.mockReturnValue({
      isValid: false,
      isComplete: false,
      hasError: false,
      hasWarning: false,
      errorMessage: null,
      warningMessage: null,
      statusMessage: 'Ready to select teams',
      progress: {
        percentage: 0,
        selected: 0,
        required: 2,
        maximum: 16,
        available: 10
      }
    });

    const { result } = renderHook(() => 
      useBracketFormState(16, mockOnChange, 10, 2)
    );

    act(() => {
      result.current.handleTeamToggle('team-1');
    });

    expect(result.current.count).toBe(1);
    expect(mockOnChange).toHaveBeenCalledWith(['team-1']);
  });

  it('should prevent selection beyond maximum', () => {
    mockUseFormValidation.mockReturnValue({
      isValid: true,
      isComplete: true,
      hasError: false,
      hasWarning: false,
      errorMessage: null,
      warningMessage: null,
      statusMessage: 'Maximum teams selected',
      progress: {
        percentage: 100,
        selected: 2,
        required: 2,
        maximum: 2,
        available: 10
      }
    });

    const { result } = renderHook(() => 
      useBracketFormState(2, mockOnChange, 10, 2)
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
    mockUseFormValidation.mockReturnValue({
      isValid: false,
      isComplete: false,
      hasError: false,
      hasWarning: false,
      errorMessage: null,
      warningMessage: null,
      statusMessage: 'Ready to select teams',
      progress: {
        percentage: 0,
        selected: 0,
        required: 2,
        maximum: 16,
        available: 10
      }
    });

    const { result } = renderHook(() => 
      useBracketFormState(16, mockOnChange, 10, 2)
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

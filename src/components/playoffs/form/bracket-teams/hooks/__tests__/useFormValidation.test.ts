
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormValidation } from '../useFormValidation';

describe('useFormValidation', () => {
  it('should validate selection with minimum teams requirement', () => {
    const { result } = renderHook(() => 
      useFormValidation(4, 16, 2, 10)
    );

    expect(result.current.isValid).toBe(true);
    expect(result.current.isComplete).toBe(true);
    expect(result.current.hasError).toBe(false);
    expect(result.current.hasWarning).toBe(false);
    expect(result.current.statusMessage).toBe('4 teams selected');
  });

  it('should show error when no teams available', () => {
    const { result } = renderHook(() => 
      useFormValidation(0, 16, 2, 0)
    );

    expect(result.current.isValid).toBe(false);
    expect(result.current.hasError).toBe(true);
    expect(result.current.errorMessage).toBe('No teams available for selection');
    expect(result.current.statusMessage).toBe('No teams found');
  });

  it('should show error when no teams selected', () => {
    const { result } = renderHook(() => 
      useFormValidation(0, 16, 2, 10)
    );

    expect(result.current.isValid).toBe(false);
    expect(result.current.hasError).toBe(true);
    expect(result.current.errorMessage).toBe('Please select teams to continue');
    expect(result.current.statusMessage).toBe('Select 2 more teams');
  });

  it('should show warning when below minimum teams', () => {
    const { result } = renderHook(() => 
      useFormValidation(1, 16, 2, 10)
    );

    expect(result.current.isValid).toBe(false);
    expect(result.current.hasWarning).toBe(true);
    expect(result.current.warningMessage).toBe('Need at least 2 teams (currently 1 selected)');
    expect(result.current.statusMessage).toBe('Select 1 more team');
  });

  it('should handle edge case of single team requirement', () => {
    const { result } = renderHook(() => 
      useFormValidation(1, 16, 1, 10)
    );

    expect(result.current.isValid).toBe(true);
    expect(result.current.isComplete).toBe(true);
    expect(result.current.statusMessage).toBe('1 team selected');
  });

  it('should calculate progress percentage correctly', () => {
    const { result: result1 } = renderHook(() => 
      useFormValidation(1, 16, 4, 10)
    );
    expect(result1.current.progress.percentage).toBe(25);

    const { result: result2 } = renderHook(() => 
      useFormValidation(4, 16, 4, 10)
    );
    expect(result2.current.progress.percentage).toBe(100);

    const { result: result3 } = renderHook(() => 
      useFormValidation(6, 16, 4, 10)
    );
    expect(result3.current.progress.percentage).toBe(100); // Capped at 100%
  });

  it('should provide correct progress information', () => {
    const { result } = renderHook(() => 
      useFormValidation(3, 16, 2, 10)
    );

    expect(result.current.progress.selected).toBe(3);
    expect(result.current.progress.required).toBe(2);
    expect(result.current.progress.maximum).toBe(16);
    expect(result.current.progress.available).toBe(10);
  });

  it('should handle too many teams selected scenario', () => {
    const { result } = renderHook(() => 
      useFormValidation(20, 16, 2, 25)
    );

    expect(result.current.isValid).toBe(false);
    expect(result.current.hasError).toBe(true);
    expect(result.current.errorMessage).toBe('Too many teams selected (max 16)');
    expect(result.current.statusMessage).toBe('Remove some teams');
  });

  it('should memoize validation state correctly', () => {
    const { result, rerender } = renderHook(
      ({ selected, max, min, available }) => useFormValidation(selected, max, min, available),
      { initialProps: { selected: 4, max: 16, min: 2, available: 10 } }
    );

    const firstValidation = result.current;
    
    // Rerender with same props
    rerender({ selected: 4, max: 16, min: 2, available: 10 });
    
    expect(result.current).toBe(firstValidation);
  });
});

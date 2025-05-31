
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBracketFormValidation } from '../useBracketFormValidation';

describe('useBracketFormValidation', () => {
  it('returns empty status when no teams available', () => {
    const { result } = renderHook(() => 
      useBracketFormValidation(0, 0, 2, 16)
    );

    expect(result.current).toEqual({
      isValid: false,
      status: 'empty',
      message: 'No teams available in this division.'
    });
  });

  it('returns tooFew status when selected count is below minimum', () => {
    const { result } = renderHook(() => 
      useBracketFormValidation(1, 10, 2, 16)
    );

    expect(result.current).toEqual({
      isValid: false,
      status: 'tooFew',
      message: 'Select at least 2 teams.'
    });
  });

  it('returns tooMany status when selected count exceeds maximum', () => {
    const { result } = renderHook(() => 
      useBracketFormValidation(17, 20, 2, 16)
    );

    expect(result.current).toEqual({
      isValid: false,
      status: 'tooMany',
      message: 'Too many teams selected (max 16).'
    });
  });

  it('returns ok status when selection is valid', () => {
    const { result } = renderHook(() => 
      useBracketFormValidation(8, 10, 2, 16)
    );

    expect(result.current).toEqual({
      isValid: true,
      status: 'ok',
      message: null
    });
  });

  it('handles singular minimum correctly', () => {
    const { result } = renderHook(() => 
      useBracketFormValidation(0, 5, 1, 16)
    );

    expect(result.current.message).toBe('Select at least 1 team.');
  });

  it('handles edge case at minimum boundary', () => {
    const { result } = renderHook(() => 
      useBracketFormValidation(2, 10, 2, 16)
    );

    expect(result.current.isValid).toBe(true);
    expect(result.current.status).toBe('ok');
  });

  it('handles edge case at maximum boundary', () => {
    const { result } = renderHook(() => 
      useBracketFormValidation(16, 20, 2, 16)
    );

    expect(result.current.isValid).toBe(true);
    expect(result.current.status).toBe('ok');
  });
});

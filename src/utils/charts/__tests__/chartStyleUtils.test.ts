import { describe, expect, it } from 'vitest';

import { getThemeTextColor } from '../chartStyleUtils';

describe('getThemeTextColor', () => {
  it('returns dark-mode primary text when isDark=true', () => {
    expect(getThemeTextColor(true, 'primary')).toBe('text-gray-100');
  });

  it('returns light-mode primary text when isDark=false', () => {
    expect(getThemeTextColor(false, 'primary')).toBe('text-gray-900');
  });

  it('handles secondary variant in both themes', () => {
    expect(getThemeTextColor(true, 'secondary')).toBe('text-gray-200');
    expect(getThemeTextColor(false, 'secondary')).toBe('text-gray-800');
  });

  it('handles muted variant in both themes', () => {
    expect(getThemeTextColor(true, 'muted')).toBe('text-gray-400');
    expect(getThemeTextColor(false, 'muted')).toBe('text-gray-500');
  });

  it('defaults to primary when no variant is passed', () => {
    expect(getThemeTextColor(true)).toBe('text-gray-100');
    expect(getThemeTextColor(false)).toBe('text-gray-900');
  });
});
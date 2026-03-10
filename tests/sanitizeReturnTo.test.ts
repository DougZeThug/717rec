import { describe, expect, it } from 'vitest';

import { sanitizeReturnTo } from '../src/utils/auth/sanitizeReturnTo';

describe('sanitizeReturnTo', () => {
  it('potential bypass: backslash after slash', () => {
    // Many browsers treat /\ as // (protocol-relative)
    const bypass = '/\\google.com';
    // Current behavior: returns '/\\google.com'
    // Expected behavior: should return '/' to prevent open redirect
    expect(sanitizeReturnTo(bypass)).toBe('/');
  });

  it('rejects legitimate internal URLs with colons in query parameters', () => {
    const validPath = '/search?q=port:80';
    // Current behavior: returns '/'
    // Expected behavior: should return '/search?q=port:80'
    expect(sanitizeReturnTo(validPath)).toBe(validPath);
  });
});

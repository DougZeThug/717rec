import { describe, expect, it } from 'vitest';

import { classifyUserAgent } from '../firstPartyPageview';

describe('classifyUserAgent', () => {
  it('detects iPhone as mobile-ios', () => {
    expect(
      classifyUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
      )
    ).toBe('mobile-ios');
  });

  it('detects iPad as mobile-ios', () => {
    expect(classifyUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('mobile-ios');
  });

  it('detects Android phone as mobile-android', () => {
    expect(classifyUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile')).toBe(
      'mobile-android'
    );
  });

  it('classifies generic mobile as mobile-other', () => {
    expect(classifyUserAgent('Mozilla/5.0 (Mobile; rv:120.0) Gecko/120.0 Firefox/120.0')).toBe(
      'mobile-other'
    );
  });

  it('classifies typical desktop as desktop', () => {
    expect(
      classifyUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120'
      )
    ).toBe('desktop');
  });

  it('returns unknown for empty UA', () => {
    expect(classifyUserAgent('')).toBe('unknown');
  });
});

import { describe, expect, it } from 'vitest';

import { getRouteName } from '../routeName';

describe('getRouteName', () => {
  it('maps known exact paths to friendly names', () => {
    expect(getRouteName('/')).toBe('Home');
    expect(getRouteName('/schedule')).toBe('Schedule');
    expect(getRouteName('/stats')).toBe('Standings');
    expect(getRouteName('/message-board')).toBe('Message Board');
  });

  it('ignores a trailing slash on non-root paths', () => {
    expect(getRouteName('/teams/')).toBe('Teams');
  });

  it('matches dynamic team detail routes by prefix', () => {
    expect(getRouteName('/teams/123')).toBe('Team Details');
    expect(getRouteName('/teams/abc-def')).toBe('Team Details');
  });

  it('falls back to "Page Not Found" for unknown paths', () => {
    expect(getRouteName('/does-not-exist')).toBe('Page Not Found');
  });
});

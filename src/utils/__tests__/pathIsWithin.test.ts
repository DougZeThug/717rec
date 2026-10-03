import { describe, expect, it } from 'vitest';

import { pathIsWithin } from '@/utils/pathIsWithin';

describe('pathIsWithin', () => {
  it('matches the same path', () => {
    expect(pathIsWithin('/teams', '/teams')).toBe(true);
  });

  it('matches a page inside the path', () => {
    expect(pathIsWithin('/teams/3-amigos', '/teams')).toBe(true);
  });

  it('does not match a path that only shares a prefix', () => {
    expect(pathIsWithin('/teams-archive', '/teams')).toBe(false);
  });

  it('does not match a different path', () => {
    expect(pathIsWithin('/schedule', '/teams')).toBe(false);
  });

  it('matches the root only on the root', () => {
    expect(pathIsWithin('/', '/')).toBe(true);
    expect(pathIsWithin('/teams', '/')).toBe(false);
  });
});

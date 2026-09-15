import { describe, expect, it } from 'vitest';

import { isAdminConsolePath } from '@/utils/adminPath';

describe('isAdminConsolePath', () => {
  it('knows the console, section or not', () => {
    expect(isAdminConsolePath('/admin')).toBe(true);
    expect(isAdminConsolePath('/admin/scores')).toBe(true);
    expect(isAdminConsolePath('/admin/blind-draw')).toBe(true);
  });

  it('tolerates a trailing slash, which the router does too', () => {
    expect(isAdminConsolePath('/admin/')).toBe(true);
    expect(isAdminConsolePath('/admin/scores/')).toBe(true);
  });

  it('knows everything else, including addresses that merely start the same', () => {
    expect(isAdminConsolePath('/')).toBe(false);
    expect(isAdminConsolePath('/teams')).toBe(false);
    // Not a route today, but the prefix test must not claim it.
    expect(isAdminConsolePath('/administrators')).toBe(false);
  });

  /**
   * `/admin/:section` is one segment deep. Anything deeper matches no route and
   * renders the not-found page — where the Admin link is the way back into the
   * console, so it must not be a no-op there.
   */
  it('does not claim a deeper address, which is the not-found page', () => {
    expect(isAdminConsolePath('/admin/scores/typo')).toBe(false);
    expect(isAdminConsolePath('/admin/a/b/c')).toBe(false);
  });
});

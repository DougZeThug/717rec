import { describe, expect, it } from 'vitest';

import { isAdminConsolePath } from '@/utils/adminPath';

describe('isAdminConsolePath', () => {
  it('knows the console, section or not', () => {
    expect(isAdminConsolePath('/admin')).toBe(true);
    expect(isAdminConsolePath('/admin/scores')).toBe(true);
    expect(isAdminConsolePath('/admin/blind-draw')).toBe(true);
  });

  it('knows everything else, including addresses that merely start the same', () => {
    expect(isAdminConsolePath('/')).toBe(false);
    expect(isAdminConsolePath('/teams')).toBe(false);
    // Not a route today, but the prefix test must not claim it.
    expect(isAdminConsolePath('/administrators')).toBe(false);
  });
});

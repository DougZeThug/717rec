import { describe, expect, it } from 'vitest';

import { buttonVariants } from '../button-variants';

describe('buttonVariants sizes', () => {
  // The small sizes were 44px tall but let a square, icon-only button be 32 or 40px wide
  // (callers write `size-8 p-0`); min-width beats width, so now they are 44px wide too.
  it.each(['xs', 'sm', 'icon', 'icon-sm'] as const)(
    'keeps the %s size at least 44px wide',
    (size) => {
      expect(buttonVariants({ size })).toContain('min-w-[44px]');
    }
  );

  it.each(['xs', 'sm', 'default', 'icon', 'icon-sm'] as const)(
    'keeps the %s size at least 44px tall',
    (size) => {
      expect(buttonVariants({ size })).toContain('min-h-[44px]');
    }
  );

  // The calendar's day cells use the default size and are 36px wide on purpose (seven must fit a
  // 320px phone). A minimum width on the default size would make them 44px and overflow.
  it('leaves the default size without a minimum width', () => {
    expect(buttonVariants({ size: 'default' })).not.toContain('min-w-');
  });
});

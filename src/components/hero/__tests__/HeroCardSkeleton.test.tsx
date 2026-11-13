import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HeroCardSkeleton from '../HeroCardSkeleton';

describe('HeroCardSkeleton', () => {
  it('draws one card holding six shimmer placeholders', () => {
    const { container } = render(<HeroCardSkeleton />);

    expect(container.firstElementChild).toHaveClass('rounded-card', 'bg-card');
    // title, subtitle, three body lines, button
    expect(container.querySelectorAll('.bg-muted.rounded-input')).toHaveLength(6);
  });

  it('shapes the placeholders like a hero card: title, subtitle, three body lines, button', () => {
    const { container } = render(<HeroCardSkeleton />);

    const widths = [...container.querySelectorAll('.bg-muted')].map((block) =>
      [...block.classList].filter((name) => /^[hw]-/.test(name)).join(' ')
    );

    expect(widths).toEqual([
      'h-8 w-2/3',
      'h-4 w-1/2',
      'h-4 w-full',
      'h-4 w-5/6',
      'h-4 w-4/6',
      'h-10 w-32',
    ]);
  });

  it('holds no text, so a screen reader has nothing to read while the card loads', () => {
    const { container } = render(<HeroCardSkeleton />);

    expect(container.textContent).toBe('');
  });
});

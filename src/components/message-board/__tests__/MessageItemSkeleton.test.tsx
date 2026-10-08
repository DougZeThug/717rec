import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MessageItemSkeleton from '../MessageItemSkeleton';

describe('MessageItemSkeleton', () => {
  it('draws the header, text and reaction placeholders in one card', () => {
    const { container } = render(<MessageItemSkeleton className="extra-class" />);

    // avatar, username, team badge, timestamp, 2 text lines, 2 reactions
    expect(container.querySelectorAll('.size-8, .h-3, .h-4, .h-5, .h-6')).toHaveLength(8);
    expect(container.firstElementChild).toHaveClass('extra-class');
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import QuickActionsCard from '../QuickActionsCard';

describe('QuickActionsCard', () => {
  // jsdom does no layout, so this pins the class. The Developer row was about 36px tall on a
  // phone; min-h-11 makes it a 44px tap target.
  it('makes the Developer toggle at least 44px tall', () => {
    render(
      <MemoryRouter>
        <QuickActionsCard />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Developer' })).toHaveClass('min-h-11');
  });
});

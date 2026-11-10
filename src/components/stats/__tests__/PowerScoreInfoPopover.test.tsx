import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// Stub the explainer so its live-weights hook is never pulled into this render.
vi.mock('@/components/stats/PowerScoreExplainer', () => ({
  PowerScoreExplainer: () => <ul data-testid="explainer-stub" />,
}));

import { PowerScoreInfoPopover } from '../PowerScoreInfoPopover';

describe('PowerScoreInfoPopover', () => {
  // jsdom does no layout, so this pins the classes. On a 320x640 phone the pop-up
  // ran off the bottom of the screen and its last lines could not be reached.
  it('keeps the pop-up inside the screen height and scrolls it when it is taller', async () => {
    const user = userEvent.setup();
    render(<PowerScoreInfoPopover />);

    await user.click(screen.getByRole('button', { name: 'What is Power Score?' }));

    const panel = (await screen.findByRole('heading', { name: 'How teams are rated' })).closest(
      '[role="dialog"]'
    );
    expect(panel).toHaveClass(
      'max-h-(--radix-popover-content-available-height)',
      'overflow-y-auto'
    );
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DestructiveIconButton } from '../destructive-icon-button';

describe('DestructiveIconButton', () => {
  it('is named by its title and calls onClick', async () => {
    const onClick = vi.fn();
    render(<DestructiveIconButton onClick={onClick} title="Remove match pair" />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove match pair' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // jsdom does no layout, so this pins the class. Remove match pair was 40px wide and Remove
  // signup 32px wide (a caller passed size-8); min-width beats width, so both are now 44px.
  it('is at least 44px wide, even when a caller sets a smaller size', () => {
    // `default` size has no minimum width of its own, so this pins the component's own class.
    render(
      <DestructiveIconButton
        onClick={vi.fn()}
        title="Remove signup"
        size="default"
        className="size-8 p-0"
      />
    );

    expect(screen.getByRole('button', { name: 'Remove signup' })).toHaveClass('min-w-[44px]');
  });
});

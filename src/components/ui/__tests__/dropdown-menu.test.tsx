import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../dropdown-menu';

describe('DropdownMenuItem', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  const renderOpen = () =>
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit Profile</DropdownMenuItem>
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

  it('lists its items when open', () => {
    renderOpen();

    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  // jsdom does no layout, so this pins the class. The rows were 36px tall; they are 44px on
  // touch screens only, and desktop keeps its size.
  it('makes each row at least 44px tall on touch screens', () => {
    renderOpen();

    for (const item of screen.getAllByRole('menuitem')) {
      expect(item).toHaveClass('pointer-coarse:min-h-11');
    }
  });
});

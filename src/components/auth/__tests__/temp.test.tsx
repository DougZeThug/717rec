import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React from 'react';
import { describe, expect, it } from 'vitest';

const RadixMenu = () => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button>Toggle</button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content>
        <DropdownMenu.Item role="menuitem">Item</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

describe('radix user-event', () => {
  it('opens with default userEvent', async () => {
    render(<RadixMenu />);
    await userEvent.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByRole('menuitem')).toBeInTheDocument();
  });

  it('opens with setup userEvent', async () => {
    const user = userEvent.setup();
    render(<RadixMenu />);
    await user.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByRole('menuitem')).toBeInTheDocument();
  });
});

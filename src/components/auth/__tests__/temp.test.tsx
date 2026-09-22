import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';

const ControlledRadixMenu = () => {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
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
};

describe('controlled radix user-event', () => {
  it('opens with default userEvent', async () => {
    render(<ControlledRadixMenu />);
    await userEvent.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByRole('menuitem')).toBeInTheDocument();
  });
});

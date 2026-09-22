import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { User } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React, { useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';

const ControlledRadixMenu = React.memo(() => {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <Button aria-label="User menu" variant="ghost" size="sm" className="relative text-base font-normal p-1">
          <User className="size-4 mr-1" />
          doug
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item role="menuitem">Item</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
});
ControlledRadixMenu.displayName = 'ControlledRadixMenu';

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

describe('real button controlled radix user-event', () => {
  it('opens with default userEvent', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ControlledRadixMenu />
        <LocationProbe />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menuitem')).toBeInTheDocument();
  });
});

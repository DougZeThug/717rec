import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { User } from 'lucide-react';
import React, { useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ControlledRadixMenu = React.memo(() => {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button aria-label="User menu" variant="ghost" size="sm" className="relative text-base font-normal p-1">
          <User className="size-4 mr-1" />
          doug
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem role="menuitem">Item</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
ControlledRadixMenu.displayName = 'ControlledRadixMenu';

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

describe('project dropdown-menu user-event', () => {
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

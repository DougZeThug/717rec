import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { User } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }, ref) => (
    <button ref={ref} {...props}>
      {children}
    </button>
  )
);
Button.displayName = 'Button';

const ControlledRadixMenu = () => {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <Button aria-label="User menu">
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
};

describe('controlled radix user-event', () => {
  it('opens with default userEvent', async () => {
    render(<ControlledRadixMenu />);
    await userEvent.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menuitem')).toBeInTheDocument();
  });
});

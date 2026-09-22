import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';

const Menu = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)}>Toggle</button>
      {open && <div role="menuitem">Item</div>}
    </div>
  );
};

describe('simple user-event', () => {
  it('opens with default userEvent', async () => {
    render(<Menu />);
    await userEvent.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByRole('menuitem')).toBeInTheDocument();
  });

  it('opens with setup userEvent', async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByRole('menuitem')).toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import MobileMenu from '@/components/layout/navbar/MobileMenu';
import { expectNoAxeViolations } from '@/test/a11y';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { layout?: boolean }) => {
      const { layout: _layout, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

vi.mock('@/components/layout/navbar/NavActions', () => ({
  default: () => <div data-testid="nav-actions" />,
}));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: false }),
}));

const renderMenu = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <MobileMenu />
    </MemoryRouter>
  );

const getTrigger = () => screen.getByRole('button', { name: /menu/i });

describe('MobileMenu', () => {
  it('reports whether it is open through aria-expanded', async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = getTrigger();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'mobile-navigation-panel');

    await user.click(trigger);
    expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');

    await user.click(getTrigger());
    expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('names the panel it controls', async () => {
    const user = userEvent.setup();
    const { container } = renderMenu();

    await user.click(getTrigger());

    const panel = container.querySelector('#mobile-navigation-panel');
    expect(panel).toBeInTheDocument();
  });

  it('moves focus into the panel when it opens', async () => {
    const user = userEvent.setup();
    const { container } = renderMenu();

    await user.click(getTrigger());

    const panel = container.querySelector('#mobile-navigation-panel');
    await waitFor(() => {
      expect(panel).toContainElement(document.activeElement as HTMLElement);
    });
  });

  it('closes on Escape and gives focus back to the button', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(getTrigger());
    expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });
    await waitFor(() => {
      expect(getTrigger()).toHaveFocus();
    });
  });

  it('has no accessibility violations when open', async () => {
    const user = userEvent.setup();
    const { container } = renderMenu();

    await user.click(getTrigger());

    await expectNoAxeViolations(container);
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import Navbar from '@/components/layout/Navbar';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      (() => { const { layout: _layout, ...rest } = props as any; return <div {...rest}>{children}</div>; })()
    ),
  },
}));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted: false }),
}));

vi.mock('@/hooks/useSeasonalThemeBase', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

vi.mock('@/components/navigation/CommandPalette', () => ({
  default: () => <div data-testid="command-palette" />,
}));

vi.mock('@/components/layout/navbar/NavActions', () => ({
  default: ({ size }: { size?: string }) => <div data-testid="nav-actions">actions-{size ?? 'default'}</div>,
}));

describe('Navbar', () => {
  it('renders route links and toggles mobile menu open/close', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Teams' })).toHaveAttribute('href', '/teams');

    const toggle = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Help' }).at(-1)).toHaveAttribute('href', '/help');

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });

  it('matches snapshot in closed state', () => {
    const { asFragment } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(asFragment()).toMatchSnapshot();
  });
});

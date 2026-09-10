import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Navbar from '@/components/layout/Navbar';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { layout?: boolean }) => {
      const { layout: _layout, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { layout?: boolean }) => {
      const { layout: _layout, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

const adminAccessMock = vi.fn(() => ({ isAdminAccessGranted: false, isLoading: false }));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => adminAccessMock(),
}));

const isMobileMock = vi.fn(() => false);

vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => isMobileMock(),
}));

vi.mock('@/hooks/useSeasonalThemeBase', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

vi.mock('@/components/navigation/CommandPalette', () => ({
  default: () => <div data-testid="command-palette" />,
}));

vi.mock('@/components/layout/navbar/NavActions', () => ({
  default: ({ size }: { size?: string }) => (
    <div data-testid="nav-actions">actions-{size ?? 'default'}</div>
  ),
}));

beforeEach(() => {
  adminAccessMock.mockReturnValue({ isAdminAccessGranted: false, isLoading: false });
  isMobileMock.mockReturnValue(false);
});

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

  it('hides Admin from everyone who is not an admin', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
  });

  it('puts Admin in the header for an admin, on desktop and in the phone menu', () => {
    // X-03: the only link to /admin used to be inside the user menu.
    adminAccessMock.mockReturnValue({ isAdminAccessGranted: true, isLoading: false });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getAllByRole('link', { name: 'Admin' }).at(-1)).toHaveAttribute('href', '/admin');
  });

  it('holds Admin back until the profile has loaded, so it does not appear late', () => {
    adminAccessMock.mockReturnValue({ isAdminAccessGranted: true, isLoading: true });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
  });

  it('carries the command palette that the deleted pill bar used to host', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('leaves the palette unmounted on a phone, where Cmd+K cannot be pressed', () => {
    isMobileMock.mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('command-palette')).toBeNull();
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

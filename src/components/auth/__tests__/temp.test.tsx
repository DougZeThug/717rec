import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseTeamMembership = vi.hoisted(() => vi.fn());
const mockUseAdminAccess = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => mockUseTeamMembership(),
}));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => mockUseAdminAccess() }));

import UserMenu from '../UserMenu';

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

describe('UserMenu with fireEvent', () => {
  it('test 1', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      profile: { username: 'doug' },
      signOut: vi.fn(),
    });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
    mockUseTeamMembership.mockReturnValue({ activeMembership: null });

    render(
      <MemoryRouter initialEntries={['/']}>
        <UserMenu />
        <LocationProbe />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
    expect(await screen.findByRole('menuitem', { name: /join a team/i })).toBeInTheDocument();
  });

  it('test 2', async () => {
    const u = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      profile: { username: 'doug' },
      signOut: vi.fn(),
    });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
    mockUseTeamMembership.mockReturnValue({ activeMembership: null });

    render(
      <MemoryRouter initialEntries={['/']}>
        <UserMenu />
        <LocationProbe />
      </MemoryRouter>
    );

    await u.click(screen.getByRole('button', { name: /user menu/i }));
    expect(await screen.findByRole('menuitem', { name: /join a team/i })).toBeInTheDocument();
  });
});

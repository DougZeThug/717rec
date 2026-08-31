import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseTeamMembership = vi.hoisted(() => vi.fn());
const mockUseAdminAccess = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => mockUseTeamMembership(),
}));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => mockUseAdminAccess() }));

import UserMenu from '../UserMenu';

const renderMenu = () =>
  render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>
  );

const openMenu = async () => {
  await userEvent.click(screen.getByRole('button'));
};

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      profile: { username: 'doug' },
      signOut: vi.fn(),
    });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
    mockUseTeamMembership.mockReturnValue({ activeMembership: null });
  });

  it('sends an approved member to /my-team, where Leave Team lives', async () => {
    mockUseTeamMembership.mockReturnValue({
      activeMembership: { team_id: 'team-1', team: { name: 'Rail Riders' } },
    });
    renderMenu();
    await openMenu();

    // The team's public page has no Leave Team and no edit control, so a member
    // who is sent there cannot reach either.
    const link = await screen.findByRole('menuitem', { name: /my team/i });
    expect(link).toHaveAttribute('href', '/my-team');
  });

  it('offers Join a Team when there is no membership', async () => {
    renderMenu();
    await openMenu();

    expect(await screen.findByRole('menuitem', { name: /join a team/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /my team/i })).not.toBeInTheDocument();
  });

  // B-18: a refused join request keeps its row, so the raw membership is
  // truthy and carries the team that turned the person down. Linking them to
  // it as "My Team" would be worse than showing no team at all. The hook drops
  // a refusal from activeMembership, which is what this menu reads.
  it('does not offer a refused team as My Team', async () => {
    // Both fields are supplied, as the real hook supplies them: the raw row
    // still carries the team, activeMembership does not. Reading the wrong one
    // is the whole regression, so the raw row is deliberately truthy here.
    mockUseTeamMembership.mockReturnValue({
      membership: {
        team_id: 'team-1',
        team: { name: 'Rail Riders' },
        rejected_at: '2026-08-05T12:00:00.000Z',
      },
      activeMembership: null,
    });
    renderMenu();
    await openMenu();

    expect(screen.queryByRole('menuitem', { name: /my team/i })).not.toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /join a team/i })).toBeInTheDocument();
  });
});

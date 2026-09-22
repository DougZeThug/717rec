import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseTeamMembership = vi.hoisted(() => vi.fn());
const mockUseAdminAccess = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => mockUseTeamMembership(),
}));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => mockUseAdminAccess() }));

import { clearUnsavedWork, registerUnsavedWork } from '@/utils/unsavedChanges';

import UserMenu from '../UserMenu';

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

const renderMenu = (initialPath = '/') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <UserMenu />
      <LocationProbe />
    </MemoryRouter>
  );

const openMenu = async () => {
  await userEvent.click(screen.getByRole('button', { name: /user menu/i }));
};

/** Stable across renders, so a test can assert it was never reached. */
const mockSignOut = vi.fn();

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      profile: { username: 'doug' },
      signOut: mockSignOut,
    });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
    mockUseTeamMembership.mockReturnValue({ activeMembership: null });
  });

  it('sends an approved member to /my-team, where Leave Team lives', async () => {
    mockUseTeamMembership.mockReturnValue({
      activeMembership: { team_id: 'team-1', team: { name: 'Rail Riders' } },
    });
    renderMenu();
    await openMenu(user);

    // The team's public page has no Leave Team and no edit control, so a member
    // who is sent there cannot reach either.
    const link = await screen.findByRole('menuitem', { name: /my team/i });
    expect(link).toHaveAttribute('href', '/my-team');
  });

  it('offers Join a Team when there is no membership', async () => {
    renderMenu();
    await openMenu(user);

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
    await openMenu(user);

    expect(screen.queryByRole('menuitem', { name: /my team/i })).not.toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /join a team/i })).toBeInTheDocument();
  });
  /**
   * A bare `/admin` reopens the remembered section. From inside the console
   * that is the section already on screen, and the redirect swaps the
   * dashboard's subtree for a `<Navigate>` on the way, unmounting the section
   * and losing whatever it held. Nothing asks first, because nothing navigates
   * through the shell's guard. See `isAdminConsolePath`.
   */
  describe('the Admin Panel link', () => {
    beforeEach(() => {
      mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true });
    });

    it('opens the console from outside it', async () => {
      renderMenu('/teams');
      await openMenu(user);

      await user.click(await screen.findByRole('menuitem', { name: /admin panel/i }));

      expect(screen.getByTestId('location')).toHaveTextContent('/admin');
    });

    it('goes nowhere when the console is already open', async () => {
      renderMenu('/admin/scores');
      await openMenu(user);

      await user.click(await screen.findByRole('menuitem', { name: /admin panel/i }));

      expect(screen.getByTestId('location')).toHaveTextContent('/admin/scores');
    });

    it('goes nowhere from a bare /admin either', async () => {
      renderMenu('/admin');
      await openMenu(user);

      await user.click(await screen.findByRole('menuitem', { name: /admin panel/i }));

      expect(screen.getByTestId('location')).toHaveTextContent('/admin');
    });
  });

  /**
   * This menu sits in the header of every page, the admin console included, so
   * all four of its links and its Logout used to be one tap from losing an
   * unsaved section. Only Admin Panel was handled, and only as a no-op.
   */
  describe('with unsaved work on screen', () => {
    let confirmSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      clearUnsavedWork();
      confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      registerUnsavedWork({ isDirty: () => true, message: 'Unsaved scores' });
    });

    afterEach(() => {
      confirmSpy.mockRestore();
      clearUnsavedWork();
    });

    it('asks before My Team throws it away', async () => {
      renderMenu('/admin/scores');
      await openMenu(user);

      await user.click(await screen.findByRole('menuitem', { name: /join a team/i }));

      expect(confirmSpy).toHaveBeenCalledWith('Unsaved scores');
      expect(screen.getByTestId('location')).toHaveTextContent('/my-team');
    });

    it('stays put when the admin says no', async () => {
      confirmSpy.mockReturnValue(false);
      renderMenu('/admin/scores');
      await openMenu(user);

      await user.click(await screen.findByRole('menuitem', { name: /join a team/i }));

      expect(screen.getByTestId('location')).toHaveTextContent('/admin/scores');
    });

    // Cancelling leaves the menu up rather than closing as though something had
    // happened — Radix skips its own select handling once the click is
    // cancelled, so the second item below is still there to click.
    it('guards Edit Profile and Message Board too, and stays open', async () => {
      confirmSpy.mockReturnValue(false);
      renderMenu('/admin/scores');
      await openMenu(user);

      await user.click(await screen.findByRole('menuitem', { name: /edit profile/i }));
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/scores');

      await user.click(await screen.findByRole('menuitem', { name: /message board/i }));
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/scores');
    });

    // signOut jumps to the home page in-app, so beforeunload never fires.
    it('asks before Logout throws it away, and obeys no', async () => {
      confirmSpy.mockReturnValue(false);
      renderMenu('/admin/scores');
      await openMenu(user);

      await user.click(await screen.findByRole('menuitem', { name: /logout/i }));

      expect(confirmSpy).toHaveBeenCalledWith('Unsaved scores');
      expect(mockSignOut).not.toHaveBeenCalled();
    });

    it('signs out once the admin says to discard it', async () => {
      renderMenu('/admin/scores');
      await openMenu(user);

      await user.click(await screen.findByRole('menuitem', { name: /logout/i }));

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('does not ask for Admin Panel, which goes nowhere anyway', async () => {
      mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true });
      renderMenu('/admin/scores');
      await openMenu(user);

      await user.click(await screen.findByRole('menuitem', { name: /admin panel/i }));

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/scores');
    });
  });
});

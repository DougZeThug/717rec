import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAdminAccess = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => mockUseAdminAccess() }));
vi.mock('@/utils/routePrefetch', () => ({ prefetchRoute: vi.fn() }));

import { clearUnsavedWork, registerUnsavedWork } from '@/utils/unsavedChanges';

import NavLinks from '../NavLinks';

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

const renderLinks = (initialPath: string, onLinkClick?: () => void) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NavLinks onLinkClick={onLinkClick} />
      <LocationProbe />
    </MemoryRouter>
  );

describe('NavLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true, isLoading: false });
  });

  it('hides Admin from someone without access', () => {
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false, isLoading: false });
    renderLinks('/');

    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('holds Admin back until the admin check has finished', () => {
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true, isLoading: true });
    renderLinks('/');

    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  /**
   * A bare `/admin` reopens the remembered section. From inside the console
   * that is the section already on screen, and the redirect swaps the
   * dashboard's subtree for a `<Navigate>` on the way, unmounting the section
   * and losing whatever it held. Nothing asks first, because nothing navigates
   * through the shell's guard. See `isAdminConsolePath`.
   */
  describe('the Admin link', () => {
    it('opens the console from outside it', async () => {
      renderLinks('/teams');

      await userEvent.click(screen.getByRole('link', { name: /admin/i }));

      expect(screen.getByTestId('location')).toHaveTextContent('/admin');
    });

    it('goes nowhere when the console is already open', async () => {
      renderLinks('/admin/scores');

      await userEvent.click(screen.getByRole('link', { name: /admin/i }));

      expect(screen.getByTestId('location')).toHaveTextContent('/admin/scores');
    });

    it('leaves the phone menu open, rather than closing as though it had moved', async () => {
      const onLinkClick = vi.fn();
      renderLinks('/admin/scores', onLinkClick);

      await userEvent.click(screen.getByRole('link', { name: /admin/i }));

      expect(onLinkClick).not.toHaveBeenCalled();
    });

    it('still closes the phone menu for every other link', async () => {
      const onLinkClick = vi.fn();
      renderLinks('/admin/scores', onLinkClick);

      await userEvent.click(screen.getByRole('link', { name: /teams/i }));

      expect(onLinkClick).toHaveBeenCalled();
      expect(screen.getByTestId('location')).toHaveTextContent('/teams');
    });
  });

  /**
   * The admin console shares this header with every public page, so these links
   * are on screen while a section holds unsaved work — and were the quickest
   * way to lose it. Only the console's own section switches asked first.
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

    it('asks before a link throws it away', async () => {
      renderLinks('/admin/scores');

      await userEvent.click(screen.getByRole('link', { name: /teams/i }));

      expect(confirmSpy).toHaveBeenCalledWith('Unsaved scores');
      expect(screen.getByTestId('location')).toHaveTextContent('/teams');
    });

    it('stays put when the admin says no', async () => {
      confirmSpy.mockReturnValue(false);
      renderLinks('/admin/scores');

      await userEvent.click(screen.getByRole('link', { name: /teams/i }));

      expect(screen.getByTestId('location')).toHaveTextContent('/admin/scores');
    });

    it('leaves the phone menu open when the admin says no', async () => {
      confirmSpy.mockReturnValue(false);
      const onLinkClick = vi.fn();
      renderLinks('/admin/scores', onLinkClick);

      await userEvent.click(screen.getByRole('link', { name: /teams/i }));

      expect(onLinkClick).not.toHaveBeenCalled();
    });

    it('does not ask twice for Admin, which goes nowhere anyway', async () => {
      renderLinks('/admin/scores');

      await userEvent.click(screen.getByRole('link', { name: /admin/i }));

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/scores');
    });
  });

  it('never asks while there is nothing to lose', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    clearUnsavedWork();
    renderLinks('/admin/scores');

    await userEvent.click(screen.getByRole('link', { name: /teams/i }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/teams');
    confirmSpy.mockRestore();
  });

  /**
   * The desktop row gives the brand its full width, so the pills make the room:
   * tighter between 1280 and 1320, icon only below 1280. The label stays in the
   * page for screen readers, and the phone menu is untouched. An admin has one
   * more pill, so every step comes later for them.
   */
  describe('the desktop row making room for the brand', () => {
    const renderRow = (isMobile = false) =>
      render(
        <MemoryRouter initialEntries={['/']}>
          <NavLinks isMobile={isMobile} />
        </MemoryRouter>
      );
    const signedOutWithoutAdmin = () =>
      mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false, isLoading: false });

    it('keeps every link, each with its name in the page', () => {
      signedOutWithoutAdmin();
      renderRow();

      expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
        'Home',
        'Teams',
        'Schedule',
        'Standings',
        'Playoffs',
        'History',
        'Messages',
        'Help',
        'Contact',
      ]);
    });

    it('hides the label below xl but leaves it for screen readers', () => {
      signedOutWithoutAdmin();
      renderRow();

      const label = screen.getByText('Standings');
      expect(label).toHaveClass('max-xl:sr-only');
      expect(label).toBeInTheDocument();
      // The icon sheds its gap with the label.
      expect(label.previousElementSibling).toHaveClass('xl:mr-2');
    });

    it('tightens the padding until the row has room for the full pills', () => {
      signedOutWithoutAdmin();
      renderRow();

      const link = screen.getByRole('link', { name: 'Standings' });
      expect(link).toHaveClass('px-2', 'min-[1320px]:px-3');
    });

    it('waits for wider windows before an admin gets labels and full padding', () => {
      renderRow();

      const link = screen.getByRole('link', { name: 'Standings' });
      expect(link).toHaveClass('px-2', 'min-[1420px]:px-3');
      expect(link).not.toHaveClass('min-[1320px]:px-3');
      const label = screen.getByText('Standings');
      expect(label).toHaveClass('max-[1340px]:sr-only');
      expect(label.previousElementSibling).toHaveClass('min-[1340px]:mr-2');
      expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    });

    it('names each icon-only pill for a mouse user', () => {
      signedOutWithoutAdmin();
      renderRow();

      expect(screen.getByRole('link', { name: 'Standings' })).toHaveAttribute('title', 'Standings');
    });

    it('leaves the phone menu as it was: full label, wide padding, no tooltip', () => {
      renderRow(true);

      const link = screen.getByRole('link', { name: 'Standings' });
      expect(link).toHaveClass('px-4', 'py-3');
      expect(link).not.toHaveAttribute('title');
      const label = screen.getByText('Standings');
      expect(label).not.toHaveClass('max-xl:sr-only');
      expect(label.className).toBe('text-base');
      expect(label.previousElementSibling).toHaveClass('mr-3');
    });
  });
});

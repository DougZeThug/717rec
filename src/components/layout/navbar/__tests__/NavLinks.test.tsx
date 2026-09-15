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
});

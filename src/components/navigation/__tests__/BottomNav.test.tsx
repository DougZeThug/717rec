import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AppNavigation from '@/components/navigation/AppNavigation';
import BottomNav from '@/components/navigation/BottomNav';
import { clearUnsavedWork, registerUnsavedWork } from '@/utils/unsavedChanges';

const isMobileMock = vi.fn(() => true);

vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => isMobileMock(),
}));

// The real module is `@/hooks/useSeasonalTheme`; the suite this file replaces
// mocked a path that does not exist, so the hook ran for real and the mock was
// doing nothing.
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

const renderAt = (path: string, node: React.ReactNode) =>
  render(<MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>);

describe('BottomNav', () => {
  it('offers its four tabs on a phone', () => {
    isMobileMock.mockReturnValue(true);
    renderAt('/playoffs', <BottomNav />);

    expect(screen.getByRole('link', { name: /Standings/i })).toHaveAttribute('href', '/stats');
    expect(screen.getByRole('link', { name: /Schedule/i })).toHaveAttribute('href', '/schedule');
    expect(screen.getByRole('link', { name: /Teams/i })).toHaveAttribute('href', '/teams');
    expect(screen.getByRole('link', { name: /Playoffs/i })).toHaveAttribute('href', '/playoffs');
  });

  it('names itself so it is a landmark, not an anonymous strip', () => {
    isMobileMock.mockReturnValue(true);
    renderAt('/', <BottomNav />);

    expect(screen.getByRole('navigation', { name: 'Main sections' })).toBeInTheDocument();
  });

  it('renders nothing above the phone breakpoint', () => {
    isMobileMock.mockReturnValue(false);
    const { container } = renderAt('/teams', <BottomNav />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('AppNavigation', () => {
  it('is the tab bar and nothing else — the desktop pill bar is gone', () => {
    // X-02: a second nav row used to render here, below <main>, duplicating
    // three of the header's links.
    isMobileMock.mockReturnValue(false);
    const { container } = renderAt('/teams', <AppNavigation />);

    expect(container).toBeEmptyDOMElement();
  });

  it('still carries the tab bar on a phone', () => {
    isMobileMock.mockReturnValue(true);
    renderAt('/stats', <AppNavigation />);

    expect(screen.getByRole('navigation', { name: 'Main sections' })).toBeInTheDocument();
  });
});

/**
 * This bar is pinned to the bottom of every screen on a phone, the admin
 * console included — which is exactly where scores get typed. One stray tap
 * used to take the lot with no warning.
 */
describe('BottomNav with unsaved work on screen', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    isMobileMock.mockReturnValue(true);
    clearUnsavedWork();
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    registerUnsavedWork({ isDirty: () => true, message: 'Unsaved scores' });
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    clearUnsavedWork();
  });

  const renderWithProbe = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <BottomNav />
        <LocationProbe />
      </MemoryRouter>
    );

  it('asks before a tab throws it away', async () => {
    renderWithProbe('/admin/scores');

    await userEvent.click(screen.getByRole('link', { name: /Schedule/i }));

    expect(confirmSpy).toHaveBeenCalledWith('Unsaved scores');
    expect(screen.getByTestId('location')).toHaveTextContent('/schedule');
  });

  it('stays put when the admin says no', async () => {
    confirmSpy.mockReturnValue(false);
    renderWithProbe('/admin/scores');

    await userEvent.click(screen.getByRole('link', { name: /Schedule/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/admin/scores');
  });

  it('never asks while there is nothing to lose', async () => {
    clearUnsavedWork();
    renderWithProbe('/admin/scores');

    await userEvent.click(screen.getByRole('link', { name: /Teams/i }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/teams');
  });
});

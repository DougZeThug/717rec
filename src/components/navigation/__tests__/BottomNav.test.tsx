import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import AppNavigation from '@/components/navigation/AppNavigation';
import BottomNav from '@/components/navigation/BottomNav';

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

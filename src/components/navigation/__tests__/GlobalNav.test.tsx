import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import GlobalNav from '@/components/navigation/GlobalNav';

const isMobileMock = vi.fn(() => false);

vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => isMobileMock(),
}));

vi.mock('@/components/navigation/CommandPalette', () => ({
  default: () => <div data-testid="command-palette" />,
}));

vi.mock('@/hooks/useSeasonalThemeBase', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

describe('GlobalNav', () => {
  it('renders desktop navigation links when not mobile', () => {
    isMobileMock.mockReturnValue(false);
    render(
      <MemoryRouter initialEntries={['/teams']}>
        <GlobalNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Standings/i })).toHaveAttribute('href', '/stats');
    expect(screen.getByRole('link', { name: /Schedule/i })).toHaveAttribute('href', '/schedule');
    expect(screen.getByRole('link', { name: /Teams/i })).toHaveAttribute('href', '/teams');
  });

  it('renders bottom navigation links when mobile', () => {
    isMobileMock.mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={['/playoffs']}>
        <GlobalNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Playoffs/i })).toHaveAttribute('href', '/playoffs');
    expect(screen.getByRole('link', { name: /Standings/i })).toHaveAttribute('href', '/stats');
  });
});

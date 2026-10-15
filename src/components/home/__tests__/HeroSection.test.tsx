import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ shouldApplyWinter: false }),
}));

import HeroSection from '../HeroSection';

describe('Home join buttons', () => {
  it('links to Join on phone and desktop without removing current links', () => {
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>
    );
    const links = screen.getAllByRole('link', { name: 'Join the League' });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href', '/join');
    expect(screen.getByRole('link', { name: 'View Standings' })).toHaveAttribute('href', '/stats');
    expect(screen.getByRole('link', { name: 'See Schedule' })).toHaveAttribute('href', '/schedule');
  });
});

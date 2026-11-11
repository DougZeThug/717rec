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

describe('Phone hero card', () => {
  // jsdom does no layout, so this pins the class. The card added the notch height
  // again on top of the navbar, which already pads it: a gap on a notched iPhone.
  it('pads its top by 16px and does not add the safe-area inset again', () => {
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>
    );
    // The phone card comes first; md:hidden proves it is not the desktop hero.
    const card = screen
      .getAllByRole('img', { name: '717REC cornhole league logo' })[0]
      .closest('section');
    expect(card).toHaveClass('md:hidden', 'pt-4');
    expect(card).not.toHaveAttribute('style');
  });
});

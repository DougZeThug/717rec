import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { HelpAdminCTA } from '@/components/help/HelpAdminCTA';
import { HelpQuickLinks } from '@/components/help/HelpQuickLinks';

describe('Help sections', () => {
  it('renders quick link CTAs with expected routes', () => {
    render(
      <MemoryRouter>
        <HelpQuickLinks />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Teams/i })).toHaveAttribute('href', '/teams');
    expect(screen.getByRole('link', { name: /Schedule/i })).toHaveAttribute('href', '/schedule');
    expect(screen.getByRole('link', { name: /Standings/i })).toHaveAttribute('href', '/stats');
    expect(screen.getByRole('link', { name: /Playoffs/i })).toHaveAttribute('href', '/playoffs');
  });

  it('renders admin CTA action and supports user interaction', () => {
    render(
      <MemoryRouter>
        <HelpAdminCTA />
      </MemoryRouter>
    );

    const ctaLink = screen.getByRole('link', { name: /Admin Dashboard/i });
    expect(ctaLink).toHaveAttribute('href', '/admin');

    fireEvent.click(screen.getByRole('button', { name: /Admin Dashboard/i }));
    expect(screen.getByText('Ready to manage your league?')).toBeInTheDocument();
  });

  it('matches snapshot for quick links section', () => {
    const { asFragment } = render(
      <MemoryRouter>
        <HelpQuickLinks />
      </MemoryRouter>
    );

    expect(asFragment()).toMatchSnapshot();
  });
});

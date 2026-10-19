import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import Join from '../Join';

describe('Join Page', () => {
  it('renders league facts correctly', () => {
    render(
      <MemoryRouter>
        <Join />
      </MemoryRouter>
    );

    expect(screen.getByText(/Jan 7, 2027/iu)).toBeInTheDocument();
    expect(screen.getByText(/Thursdays/iu)).toBeInTheDocument();
    expect(screen.getByText(/6:00 PM – 10:00 PM/iu)).toBeInTheDocument();
    expect(screen.getByText(/Marion Court Room/iu)).toBeInTheDocument();
    expect(screen.getByText(/7 E Marion St, Lancaster PA 17602/iu)).toBeInTheDocument();
    expect(screen.getByText(/\$50 per team/iu)).toBeInTheDocument();
    expect(screen.getByText(/2 players \(Solo allowed\)/iu)).toBeInTheDocument();
  });

  it('contains links to contact form with correct types', () => {
    render(
      <MemoryRouter>
        <Join />
      </MemoryRouter>
    );

    const teamLink = screen.getByRole('link', { name: /Join as a Team/i });
    expect(teamLink).toHaveAttribute('href', '/contact?type=join_league');

    const soloLink = screen.getByRole('link', { name: /Join as a Solo Player/i });
    expect(soloLink).toHaveAttribute('href', '/contact?type=join_league&solo=true');
  });
});

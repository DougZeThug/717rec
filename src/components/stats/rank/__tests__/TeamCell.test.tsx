import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { TeamCell } from '../TeamCell';

const renderCell = (props: Partial<React.ComponentProps<typeof TeamCell>> = {}) =>
  render(
    <MemoryRouter>
      <TeamCell
        teamName="The Baggers"
        teamId="team-1"
        imageUrl={null}
        isExpanded={false}
        gameWins={9}
        gameLosses={4}
        {...props}
      />
    </MemoryRouter>
  );

describe('TeamCell', () => {
  it('shows the team name', () => {
    renderCell();
    expect(screen.getByText('The Baggers')).toBeInTheDocument();
  });

  it('shows the game record', () => {
    renderCell();
    expect(screen.getByText('Games: 9–4')).toBeInTheDocument();
  });

  it('defaults game record to 0–0 when not provided', () => {
    renderCell({ gameWins: undefined, gameLosses: undefined });
    expect(screen.getByText('Games: 0–0')).toBeInTheDocument();
  });

  it('links the logo to the team page', () => {
    renderCell();
    expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining('/teams/'));
  });

  it('renders a collapse chevron only when expanded', () => {
    const { container, rerender } = renderCell();
    expect(container.querySelector('.lucide-chevron-down')).toBeInTheDocument();
    expect(container.querySelector('.lucide-chevron-up')).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <TeamCell teamName="The Baggers" teamId="team-1" imageUrl={null} isExpanded />
      </MemoryRouter>
    );
    expect(container.querySelector('.lucide-chevron-up')).toBeInTheDocument();
  });
});
